import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateManager } from '../state/stateManager.js';
import { logger } from '../utils/logger.js';
import {
  research,
  writeContent,
  reviewContent
} from "../agents/index.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(directory, '..');
const iterationLogPath = path.join(serverDirectory, 'logs', 'iterationLogs.json');
const outputPath = path.join(serverDirectory, 'output', 'finalOutput.json');

const MAX_ITERATIONS = 5;

export async function runPipeline(input, runId = crypto.randomUUID()) {
  const iterations = [];
  let researchResult = null;
  let writerResult = null;
  let currentDraft = null;
  let currentResearch = null;

  try {
    // Iterate until editor approves or max iterations reached
    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
      logger.info(`=== Starting Iteration ${iteration} for run ${runId} ===`);

      const agentStatus = {
        researcher: iteration === 1 ? "running" : "waiting",
        writer: "waiting",
        editor: "waiting"
      };

      stateManager.set(runId, {
        status: iteration === 1 ? "researching" : "writing_revision",
        iteration,
        maxIterations: MAX_ITERATIONS,
        agentStatus,
        iterations,
        research: researchResult,
        draft: writerResult
      });

      // ----------------------------------
      // STEP 1: RESEARCHER AGENT (only in first iteration)
      // ----------------------------------
      if (iteration === 1) {
        logger.info(`Researcher started (iteration ${iteration}): ${runId}`);

        const researchAgentStatus = {
          researcher: "running",
          writer: "waiting",
          editor: "waiting"
        };

        stateManager.set(runId, {
          status: "researching",
          iteration,
          maxIterations: MAX_ITERATIONS,
          agentStatus: researchAgentStatus,
          iterations,
          research: null,
          draft: null
        });

        researchResult = await research(input);
        currentResearch = researchResult;

        iterations.push({
          iteration,
          agent: "researcher",
          status: "completed",
          output: researchResult
        });

        logger.info(`Researcher completed (iteration ${iteration}): ${runId}`);
      }

      // ----------------------------------
      // STEP 2: WRITER AGENT
      // ----------------------------------
      const writerAgentStatus = {
        researcher: "completed",
        writer: "running",
        editor: "waiting"
      };

      stateManager.set(runId, {
        status: "writing",
        iteration,
        maxIterations: MAX_ITERATIONS,
        agentStatus: writerAgentStatus,
        iterations,
        research: researchResult,
        draft: currentDraft
      });

      logger.info(`Writer started (iteration ${iteration}): ${runId}`);

      // If this is not the first iteration, pass the editor feedback
      const writerInput = iteration === 1
        ? { ...input, research: researchResult }
        : { ...input, research: researchResult, editorFeedback: currentDraft?.editorFeedback };

      writerResult = await writeContent(writerInput);
      currentDraft = writerResult;

      iterations.push({
        iteration,
        agent: "writer",
        status: "completed",
        output: writerResult,
        isRevision: iteration > 1
      });

      logger.info(`Writer completed (iteration ${iteration}): ${runId}`);

      // ----------------------------------
      // STEP 3: EDITOR AGENT
      // ----------------------------------
      const editorAgentStatus = {
        researcher: "completed",
        writer: "completed",
        editor: "running"
      };

      stateManager.set(runId, {
        status: "editing",
        iteration,
        maxIterations: MAX_ITERATIONS,
        agentStatus: editorAgentStatus,
        iterations,
        research: researchResult,
        draft: writerResult
      });

      logger.info(`Editor started (iteration ${iteration}): ${runId}`);

      const editorReview = await reviewContent({
        ...input,
        research: researchResult,
        draft: writerResult.content,
        iteration
      });

      iterations.push({
        iteration,
        agent: "editor",
        status: editorReview.decision,
        output: editorReview
      });

      logger.info(`Editor completed (iteration ${iteration}): ${runId} - Decision: ${editorReview.decision}`);

      // Update state so frontend sees editor completion immediately
      stateManager.set(runId, {
        status: editorReview.decision === "approved" ? "approved" : "needs_revision",
        iteration,
        maxIterations: MAX_ITERATIONS,
        agentStatus: {
          researcher: "completed",
          writer: "completed",
          editor: "completed"
        },
        iterations,
        research: researchResult,
        draft: writerResult,
        editorReview
      });

      // Check if editor approved
      if (editorReview.decision === "approved") {
        logger.info(`Pipeline approved after ${iteration} iteration(s): ${runId}`);
        break;
      }

      // If needs revision, prepare feedback for next iteration
      if (editorReview.decision === "needs_revision") {
        logger.info(`Editor requested revision (iteration ${iteration}): ${runId}`);

        // Prepare feedback for writer in next iteration
        currentDraft = {
          ...writerResult,
          editorFeedback: {
            revisionInstructions: editorReview.revisionInstructions,
            weaknesses: editorReview.weaknesses,
            missingPoints: editorReview.missingPoints,
            summary: editorReview.summary
          }
        };
      }

      // If max iterations reached, stop
      if (iteration >= MAX_ITERATIONS) {
        logger.warn(`Max iterations (${MAX_ITERATIONS}) reached for run ${runId}`);
        break;
      }
    }

    // Get final editor review from iterations
    const finalEditorReview = iterations
      .filter(i => i.agent === "editor")
      .pop()?.output;

    const result = {
      runId,
      input,
      status: finalEditorReview?.decision || "unknown",
      currentIteration: iterations.filter(i => i.agent === "editor").length,
      maxIterations: MAX_ITERATIONS,
      agentStatus: {
        researcher: "completed",
        writer: "completed",
        editor: "completed"
      },
      research: researchResult,
      draft: writerResult,
      editorReview: finalEditorReview,
      iterations,
      approved: finalEditorReview?.decision === "approved"
    };

    stateManager.set(runId, result);

    // Save iteration logs
    let logs = [];
    try {
      logs = JSON.parse(await fs.readFile(iterationLogPath, "utf8"));
    } catch {
      logs = [];
    }

    logs.unshift({
      runId,
      createdAt: new Date().toISOString(),
      status: result.status,
      iteration: result.currentIteration,
      iterations: result.iterations
    });

    await fs.writeFile(
      iterationLogPath,
      JSON.stringify(logs.slice(0, 100), null, 2)
    );

    // Save newest complete pipeline result
    await fs.writeFile(
      outputPath,
      JSON.stringify(result, null, 2)
    );

    return result;
  } catch (error) {
    logger.error(`Pipeline error for run ${runId}:`, error.message);

    stateManager.set(runId, {
      status: "error",
      error: error.message,
      agentStatus: {
        researcher: researchResult ? "completed" : "error",
        writer: writerResult ? "completed" : "error",
        editor: "error"
      },
      iterations,
      research: researchResult,
      draft: writerResult
    });

    throw error;
  }
}
