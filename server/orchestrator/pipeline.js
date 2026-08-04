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
  const agentStatus = {
    researcher: "running",
    writer: "waiting",
    editor: "waiting"
  };

  stateManager.set(runId, {
    status: "researching",
    agentStatus
  });

  logger.info(`Researcher started: ${runId}`);

  // ----------------------------------
  // STEP 1: RESEARCHER AGENT
  // ----------------------------------
  const researchResult = await research(input);

  agentStatus.researcher = "completed";
  agentStatus.writer = "running";

  stateManager.set(runId, {
    status: "writing",
    agentStatus,
    research: researchResult
  });

  logger.info(`Writer started: ${runId}`);

  // ----------------------------------
  // STEP 2: WRITER AGENT
  // ----------------------------------
  const writerResult = await writeContent({
    ...input,
    research: researchResult
  });

  agentStatus.writer = "completed";
  agentStatus.editor = "running";

  stateManager.set(runId, {
    status: "editing",
    agentStatus,
    research: researchResult,
    draft: writerResult
  });

  logger.info(`Editor started: ${runId}`);

  // ----------------------------------
  // STEP 3: EDITOR AGENT
  // ----------------------------------
  const editorReview = await reviewContent({
    ...input,
    research: researchResult,
    draft: writerResult.content
  });

  agentStatus.editor = "completed";

  const result = {
    runId,
    input,

    // Editor determines whether the current draft is approved.
    status: editorReview.decision,

    agentStatus,

    research: researchResult,

    draft: writerResult,

    editorReview,

    iterations: [
      {
        iteration: 1,
        agent: "researcher",
        status: "completed",
        output: researchResult
      },
      {
        iteration: 2,
        agent: "writer",
        status: "completed",
        output: writerResult
      },
      {
        iteration: 3,
        agent: "editor",
        status: editorReview.decision,
        output: editorReview
      }
    ]
  };

  stateManager.set(runId, result);

  // Save old and new run iteration data.
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
    iterations: result.iterations
  });

  await fs.writeFile(
    iterationLogPath,
    JSON.stringify(logs.slice(0, 100), null, 2)
  );

  // Save newest complete pipeline result.
  await fs.writeFile(
    outputPath,
    JSON.stringify(result, null, 2)
  );

  return result;
}
