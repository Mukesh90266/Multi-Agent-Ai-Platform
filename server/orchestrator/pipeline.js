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

export async function runPipeline(input, runId = crypto.randomUUID()) {
  const iterations = [];
  let researchResult = null;
  let writerResult = null;

  try {
    // ----------------------------------
    // STEP 1: RESEARCHER AGENT
    // ----------------------------------
    logger.info(`Researcher started: ${runId}`);

    stateManager.set(runId, {
      status: "researching",
      iteration: 1,
      maxIterations: 1,
      agentStatus: {
        researcher: "running",
        writer: "waiting",
        editor: "waiting"
      },
      iterations,
      research: null,
      draft: null
    });

    researchResult = await research(input);

    iterations.push({
      iteration: 1,
      agent: "researcher",
      status: "completed",
      output: researchResult
    });

    logger.info(`Researcher completed: ${runId}`);

    // ----------------------------------
    // STEP 2: WRITER AGENT
    // ----------------------------------
    logger.info(`Writer started: ${runId}`);

    stateManager.set(runId, {
      status: "writing",
      iteration: 1,
      maxIterations: 1,
      agentStatus: {
        researcher: "completed",
        writer: "running",
        editor: "waiting"
      },
      iterations,
      research: researchResult,
      draft: null
    });

    writerResult = await writeContent({ ...input, research: researchResult });

    iterations.push({
      iteration: 1,
      agent: "writer",
      status: "completed",
      output: writerResult,
      isRevision: false
    });

    logger.info(`Writer completed: ${runId}`);

    // ----------------------------------
    // STEP 3: EDITOR AGENT
    // ----------------------------------
    logger.info(`Editor started: ${runId}`);

    stateManager.set(runId, {
      status: "editing",
      iteration: 1,
      maxIterations: 1,
      agentStatus: {
        researcher: "completed",
        writer: "completed",
        editor: "running"
      },
      iterations,
      research: researchResult,
      draft: writerResult
    });

    const editorReview = await reviewContent({
      ...input,
      research: researchResult,
      draft: writerResult.content,
      iteration: 1
    });

    iterations.push({
      iteration: 1,
      agent: "editor",
      status: editorReview.decision,
      output: editorReview
    });

    logger.info(`Editor completed: ${runId} - Decision: ${editorReview.decision}`);

    // Final state
    const result = {
      runId,
      input,
      status: editorReview.decision,
      currentIteration: 1,
      maxIterations: 1,
      agentStatus: {
        researcher: "completed",
        writer: "completed",
        editor: "completed"
      },
      research: researchResult,
      draft: writerResult,
      editorReview,
      iterations,
      approved: editorReview.decision === "approved"
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
