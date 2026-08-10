import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { executeAgent, getOutputText } from "./agentExecutor.js";
import {
  buildRunnablePipeline,
  serializePipelineForClient
} from "../services/agentStore.js";
import { stateManager } from "../state/stateManager.js";
import { logger } from "../utils/logger.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(directory, "..");
const logsDir = path.join(serverDirectory, "logs");
const outputDir = path.join(serverDirectory, "output");
const iterationLogPath = path.join(logsDir, "iterationLogs.json");
const outputPath = path.join(outputDir, "finalOutput.json");

const DEFAULT_MAX_ITERATIONS = 3;
const DEFAULT_APPROVAL_THRESHOLD = 80;

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function createAgentStatus(steps) {
  return steps.reduce((status, step) => {
    status[step.stepId] = "waiting";
    return status;
  }, {});
}

function publicStep(step) {
  const { agent, ...safeStep } = step;
  return safeStep;
}

function buildState(context, overrides = {}) {
  return {
    runId: context.runId,
    input: context.input,
    status: context.status,
    iteration: context.loopIteration || context.executionCount || 0,
    maxIterations: context.maxIterations || 1,
    agentStatus: { ...context.agentStatus },
    pipeline: serializePipelineForClient(context.pipeline),
    currentStep: context.currentStep ? publicStep(context.currentStep) : null,
    iterations: context.iterations,
    agentOutputs: context.outputs,
    research: context.research,
    draft: context.draft,
    editorReview: context.editorReview,
    optimization: context.optimization,
    finalOutput: context.finalOutput,
    revisionHistory: context.revisionHistory,
    ...overrides
  };
}

function updateState(context, overrides = {}) {
  stateManager.set(context.runId, buildState(context, overrides));
}

function outputSummaryForFinal(output) {
  if (!output) return null;
  if (typeof output === "string") {
    return { content: output };
  }
  return output;
}

function deriveFinalOutput(context) {
  const latest = context.outputs.at(-1);

  // If the latest step produced content, that is the final result for dynamic/custom pipelines.
  // Exception: an Editor review is feedback, so content pipelines should keep the latest draft as final.
  if (latest && (latest.phase !== "review" || !context.draft?.content)) {
    return {
      type: latest.phase || "agent",
      agentId: latest.agentId,
      agentName: latest.agentName,
      content: getOutputText(latest.output),
      output: outputSummaryForFinal(latest.output)
    };
  }

  if (context.draft?.content) {
    return {
      type: "draft",
      agentId: "writer",
      agentName: "Writer",
      content: context.draft.content,
      output: context.draft
    };
  }

  if (!latest) return null;

  return {
    type: latest.phase || "agent",
    agentId: latest.agentId,
    agentName: latest.agentName,
    content: getOutputText(latest.output),
    output: outputSummaryForFinal(latest.output)
  };
}

function deriveStatus(context) {
  if (context.error) return "error";

  if (context.editorReview) {
    const qualityScore = context.editorReview.qualityScore || 0;
    return qualityScore >= (context.approvalThreshold || DEFAULT_APPROVAL_THRESHOLD)
      ? "approved"
      : "needs_revision";
  }

  return "completed";
}

function applyExecutionToContext(context, step, execution) {
  const timestamp = new Date().toISOString();
  const output = execution.output;
  const phase = execution.phase || step.phase || "agent";
  const iterationNumber = context.loopIteration || 1;

  if (step.agentId === "researcher") {
    context.research = output;
  }
  if (step.agentId === "writer") {
    context.draft = output;
  }
  if (step.agentId === "editor") {
    context.editorReview = output;
  }

  const agentOutput = {
    stepId: step.stepId,
    stepIndex: step.index,
    agentId: step.agentId,
    agentName: step.name,
    type: step.type,
    phase,
    iteration: iterationNumber,
    timestamp,
    status: execution.status || "completed",
    output,
    text: getOutputText(output),
    summary: execution.summary || `${step.name} completed`
  };

  context.outputs.push(agentOutput);
  context.executionCount = context.outputs.length;

  const iterationEntry = {
    phase,
    iteration: iterationNumber,
    stepId: step.stepId,
    stepIndex: step.index,
    agent: step.agentId,
    agentName: step.name,
    agentType: step.type,
    status: execution.status || "completed",
    timestamp,
    output,
    summary: execution.summary || `${step.name} completed`
  };

  if (execution.qualityScore != null) {
    iterationEntry.qualityScore = execution.qualityScore;
  }

  if (phase === "write") {
    iterationEntry.isRevision = iterationNumber > 1;
    if (iterationNumber > 1 && context.editorReview) {
      iterationEntry.editorFeedback = context.editorReview;
    }
  }

  context.iterations.push(iterationEntry);
  context.finalOutput = deriveFinalOutput(context);

  if (step.agentId === "editor" && output) {
    const qualityScore = output.qualityScore || 0;
    const decision = qualityScore >= (context.approvalThreshold || DEFAULT_APPROVAL_THRESHOLD)
      ? "approved"
      : "needs_revision";

    context.editorDecision = decision;

    const existingRevisionIndex = context.revisionHistory.findIndex(
      (entry) => entry.iteration === iterationNumber
    );
    const revisionEntry = {
      iteration: iterationNumber,
      decision,
      qualityScore,
      hadRevisions: decision === "needs_revision",
      revisionCount: output.revisionInstructions?.length || 0
    };

    if (existingRevisionIndex >= 0) {
      context.revisionHistory[existingRevisionIndex] = revisionEntry;
    } else {
      context.revisionHistory.push(revisionEntry);
    }
  }
}

async function executeStep(context, step, detail = "") {
  context.currentStep = step;
  context.agentStatus[step.stepId] = "running";
  context.status = "running";

  logger.agent(step.agentId, "started", detail || step.name);
  updateState(context, {
    status: step.phase === "research" ? "researching" : step.phase === "write" ? "writing" : step.phase === "review" ? "editing" : "running"
  });

  try {
    const execution = await executeAgent(step.agent, context);
    context.agentStatus[step.stepId] = "completed";
    applyExecutionToContext(context, step, execution);

    logger.agent(step.agentId, "completed", execution.summary || step.name);
    updateState(context);

    return execution;
  } catch (error) {
    context.agentStatus[step.stepId] = "error";
    context.status = "error";
    context.error = error.message;
    updateState(context, { status: "error", error: error.message });
    throw error;
  }
}

function findLoopIndexes(pipeline) {
  const loop = pipeline.loop;
  if (!loop?.enabled || loop.type !== "writer-editor-review") {
    return null;
  }

  const writerIndex = pipeline.steps.findIndex((step) => step.agentId === loop.writerAgentId);
  const editorIndex = pipeline.steps.findIndex((step) => step.agentId === loop.editorAgentId);

  if (writerIndex < 0 || editorIndex < 0 || writerIndex >= editorIndex) {
    return null;
  }

  return { writerIndex, editorIndex };
}

async function runLinearPipeline(context) {
  logger.phase(`DYNAMIC PIPELINE - ${context.pipeline.name}`);

  for (const step of context.pipeline.steps) {
    context.loopIteration = 1;
    await executeStep(context, step, `Step ${step.index + 1}/${context.pipeline.steps.length}`);
  }

  context.completedLoopIterations = context.editorReview ? 1 : 0;
}

async function runReviewLoopPipeline(context, loopIndexes) {
  const { writerIndex, editorIndex } = loopIndexes;
  const maxIterations = context.pipeline.loop?.maxIterations || DEFAULT_MAX_ITERATIONS;
  const approvalThreshold = context.pipeline.loop?.approvalThreshold || DEFAULT_APPROVAL_THRESHOLD;

  context.maxIterations = maxIterations;
  context.approvalThreshold = approvalThreshold;

  const preLoopSteps = context.pipeline.steps.slice(0, writerIndex);
  const loopSteps = context.pipeline.steps.slice(writerIndex, editorIndex + 1);
  const postLoopSteps = context.pipeline.steps.slice(editorIndex + 1);

  logger.phase(`DYNAMIC PIPELINE - ${context.pipeline.name}`);

  for (const step of preLoopSteps) {
    context.loopIteration = 0;
    await executeStep(context, step, `Pre-loop step ${step.index + 1}/${context.pipeline.steps.length}`);
  }

  let loopIteration = 1;
  let decision = "needs_revision";

  while (loopIteration <= maxIterations && decision === "needs_revision") {
    context.loopIteration = loopIteration;
    logger.phase(`DYNAMIC REVIEW LOOP ${loopIteration}/${maxIterations}`);

    for (const step of loopSteps) {
      const mode = step.agentId === "writer"
        ? (loopIteration === 1 ? "Initial Draft" : "Revision")
        : `Loop step ${step.index + 1}/${context.pipeline.steps.length}`;

      const execution = await executeStep(context, step, mode);

      if (step.agentId === context.pipeline.loop.editorAgentId) {
        const qualityScore = execution.qualityScore ?? execution.output?.qualityScore ?? 0;
        decision = qualityScore >= approvalThreshold ? "approved" : "needs_revision";

        if (qualityScore >= approvalThreshold) {
          logger.info(`✅ Quality score ${qualityScore} reached approval threshold (${approvalThreshold}+). Stopping loop.`);
        } else if (loopIteration < maxIterations) {
          logger.warning(`Editor requested revisions. Starting iteration ${loopIteration + 1}...`);
        } else {
          logger.warning(`Max iterations (${maxIterations}) reached. Proceeding with current draft.`);
        }
      }
    }

    loopIteration += 1;
  }

  context.completedLoopIterations = loopIteration - 1;

  if (decision === "approved") {
    for (const step of postLoopSteps) {
      context.loopIteration = context.completedLoopIterations;
      await executeStep(context, step, `Post-approval step ${step.index + 1}/${context.pipeline.steps.length}`);
    }
  } else {
    for (const step of postLoopSteps) {
      context.agentStatus[step.stepId] = "skipped";
    }
  }
}

async function saveRunArtifacts(result) {
  let logs = [];
  try {
    logs = JSON.parse(await fs.readFile(iterationLogPath, "utf8"));
  } catch {
    logs = [];
  }

  logs.unshift({
    runId: result.runId,
    createdAt: new Date().toISOString(),
    status: result.status,
    pipeline: result.pipeline,
    totalIterations: result.totalIterations,
    iterations: result.iterations
  });

  await ensureDir(logsDir);
  await fs.writeFile(iterationLogPath, JSON.stringify(logs.slice(0, 100), null, 2));

  await ensureDir(outputDir);
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
}

export async function runPipeline(input, runId = randomUUID(), options = {}) {
  const pipeline = options.pipeline?.steps
    ? options.pipeline
    : await buildRunnablePipeline(options.pipeline || {});

  const context = {
    runId,
    input,
    pipeline,
    status: "starting",
    agentStatus: createAgentStatus(pipeline.steps),
    currentStep: null,
    loopIteration: 0,
    completedLoopIterations: 0,
    executionCount: 0,
    maxIterations: pipeline.loop?.maxIterations || 1,
    approvalThreshold: pipeline.loop?.approvalThreshold || DEFAULT_APPROVAL_THRESHOLD,
    outputs: [],
    iterations: [],
    revisionHistory: [],
    research: null,
    draft: null,
    editorReview: null,
    optimization: null,
    finalOutput: null,
    editorDecision: null,
    error: null
  };

  updateState(context, { status: "starting" });

  try {
    const loopIndexes = findLoopIndexes(pipeline);

    if (loopIndexes) {
      await runReviewLoopPipeline(context, loopIndexes);
    } else {
      await runLinearPipeline(context);
    }

    context.status = deriveStatus(context);
    context.finalOutput = deriveFinalOutput(context);

    const totalIterations = loopIndexes
      ? context.completedLoopIterations
      : (context.editorReview ? 1 : Math.max(1, context.executionCount));

    const result = {
      runId,
      input,
      status: context.status,
      totalIterations,
      maxIterations: context.maxIterations,
      executionSteps: context.executionCount,
      reachedMaxIterations: Boolean(
        loopIndexes &&
        context.completedLoopIterations === context.maxIterations &&
        context.status === "needs_revision"
      ),
      revisionHistory: context.revisionHistory,
      agentStatus: { ...context.agentStatus },
      pipeline: serializePipelineForClient(pipeline),
      agentOutputs: context.outputs,
      research: context.research,
      draft: context.draft,
      editorReview: context.editorReview,
      optimization: context.optimization,
      finalOutput: context.finalOutput,
      iterations: context.iterations,
      approved: context.editorReview ? context.status === "approved" : true
    };

    logger.phase("PIPELINE COMPLETED");
    logger.info(`Pipeline: ${pipeline.name}`);
    logger.info(`Executed agent steps: ${context.executionCount}`);
    if (context.editorReview) {
      logger.info(`Final Decision: ${context.status}`);
      logger.info(`Quality Score: ${context.editorReview?.qualityScore || "N/A"}/100`);
    } else {
      logger.info("Final Status: completed");
    }

    stateManager.set(runId, result);
    await saveRunArtifacts(result);

    return result;
  } catch (error) {
    logger.error(`Pipeline failed: ${error.message}`);

    const errorResult = buildState(context, {
      status: "error",
      error: error.message,
      approved: false
    });

    stateManager.set(runId, errorResult);
    throw error;
  }
}
