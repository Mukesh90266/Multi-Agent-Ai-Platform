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

// Maximum number of Writer-Editor revision cycles
const MAX_ITERATIONS = 3;

export async function runPipeline(input, runId = crypto.randomUUID()) {
  const iterations = [];
  let researchResult = null;
  let currentDraft = null;
  let finalEditorReview = null;

  try {
    // ============================================
    // PHASE 1: RESEARCHER AGENT (RUNS ONCE)
    // ============================================
    logger.phase('RESEARCHER AGENT - STARTING');
    logger.agent('researcher', 'started', `Topic: ${input.topic}`);

    stateManager.set(runId, {
      status: "researching",
      iteration: 0,
      maxIterations: MAX_ITERATIONS,
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
      phase: "research",
      iteration: 0,
      agent: "researcher",
      status: "completed",
      timestamp: new Date().toISOString(),
      output: researchResult,
      summary: `Topic: ${researchResult.topic} | Key Points: ${researchResult.keyPoints?.length || 0} | Sources: ${researchResult.sources?.length || 0}`
    });

    logger.agent('researcher', 'completed', `${researchResult.keyPoints?.length || 0} key points, ${researchResult.sources?.length || 0} sources`);
    logger.info(`   Summary: ${researchResult.summary}`);

    // ============================================
    // PHASE 2: WRITER-EDITOR LOOP (UP TO 3 CYCLES)
    // ============================================
    let loopIteration = 1;
    let editorDecision = "needs_revision";
    let editorFeedback = null;

    while (loopIteration <= MAX_ITERATIONS && editorDecision === "needs_revision") {
      logger.phase(`WRITER-EDITOR ITERATION ${loopIteration}/${MAX_ITERATIONS}`);

      // ------------------------------------------
      // STEP A: WRITER AGENT
      // ------------------------------------------
      const writerMode = loopIteration === 1 ? 'Initial Draft' : 'Revision';
      logger.agent('writer', 'started', writerMode);

      stateManager.set(runId, {
        status: "writing",
        iteration: loopIteration,
        maxIterations: MAX_ITERATIONS,
        agentStatus: {
          researcher: "completed",
          writer: "running",
          editor: "waiting"
        },
        iterations,
        research: researchResult,
        draft: currentDraft
      });

      const writerInput = {
        ...input,
        research: researchResult,
        editorFeedback: loopIteration > 1 ? editorFeedback : undefined
      };

      const writerResult = await writeContent(writerInput);

      currentDraft = writerResult;

      iterations.push({
        phase: "write",
        iteration: loopIteration,
        agent: "writer",
        status: "completed",
        timestamp: new Date().toISOString(),
        isRevision: loopIteration > 1,
        editorFeedback: loopIteration > 1 ? editorFeedback : null,
        output: writerResult,
        summary: `Words: ${writerResult.wordCount} | Mode: ${writerResult.mode}`
      });

      logger.agent('writer', 'completed', `Generated ${writerResult.wordCount} words`);
      
      // Show revision context if this is a revision
      if (loopIteration > 1 && editorFeedback) {
        logger.info(`   Revising based on editor feedback: ${editorFeedback.summary}`);
      }

      // ------------------------------------------
      // STEP B: EDITOR AGENT
      // ------------------------------------------
      logger.agent('editor', 'started');

      stateManager.set(runId, {
        status: "editing",
        iteration: loopIteration,
        maxIterations: MAX_ITERATIONS,
        agentStatus: {
          researcher: "completed",
          writer: "completed",
          editor: "running"
        },
        iterations,
        research: researchResult,
        draft: currentDraft
      });

      const editorReview = await reviewContent({
        ...input,
        research: researchResult,
        draft: currentDraft.content,
        iteration: loopIteration
      });

      finalEditorReview = editorReview;
      editorDecision = editorReview.decision;
      editorFeedback = editorReview;

      iterations.push({
        phase: "review",
        iteration: loopIteration,
        agent: "editor",
        status: editorReview.decision,
        timestamp: new Date().toISOString(),
        output: editorReview,
        summary: `Decision: ${editorReview.decision} | Quality: ${editorReview.qualityScore}/100 | Strengths: ${editorReview.strengths?.length || 0} | Issues: ${editorReview.weaknesses?.length || 0}`
      });

      logger.agent('editor', 'completed', `Decision: ${editorReview.decision} (${editorReview.qualityScore}/100)`);
      
      // Show detailed feedback
      if (editorReview.strengths?.length) {
        logger.info(`   Strengths: ${editorReview.strengths.join('; ')}`);
      }
      if (editorReview.weaknesses?.length) {
        logger.info(`   Weaknesses: ${editorReview.weaknesses.map(w => `[${w.severity}] ${w.issue}`).join('; ')}`);
      }
      if (editorReview.revisionInstructions?.length) {
        logger.info(`   Revisions needed: ${editorReview.revisionInstructions.length} items`);
      }

      // Check if we need another iteration
      if (editorDecision === "needs_revision" && loopIteration < MAX_ITERATIONS) {
        logger.warning(`Editor requested revisions. Starting iteration ${loopIteration + 1}...`);
      } else if (editorDecision === "needs_revision" && loopIteration === MAX_ITERATIONS) {
        logger.warning(`Max iterations (${MAX_ITERATIONS}) reached. Proceeding with current draft.`);
      }

      loopIteration++;
    }

    // ============================================
    // FINAL RESULT
    // ============================================
    const totalIterations = loopIteration - 1;
    
    // Build revision summary
    const revisionHistory = [];
    for (let i = 1; i <= totalIterations; i++) {
      const reviewIter = iterations.find(it => it.phase === 'review' && it.iteration === i);
      const writeIter = iterations.find(it => it.phase === 'write' && it.iteration === i);
      
      if (reviewIter) {
        revisionHistory.push({
          iteration: i,
          decision: reviewIter.output.decision,
          qualityScore: reviewIter.output.qualityScore,
          hadRevisions: reviewIter.output.decision === 'needs_revision',
          revisionCount: reviewIter.output.revisionInstructions?.length || 0
        });
      }
    }

    logger.phase('PIPELINE COMPLETED');
    logger.info(`📊 Revision Summary:`);
    revisionHistory.forEach(r => {
      const icon = r.decision === 'approved' ? '✅' : '🔄';
      logger.info(`   ${icon} Iteration ${r.iteration}: ${r.decision.toUpperCase()} (${r.qualityScore}/100)${r.hadRevisions ? ` - ${r.revisionCount} revisions needed` : ''}`);
    });
    logger.info(`Total Writer-Editor Cycles: ${totalIterations}`);
    logger.info(`Final Decision: ${editorDecision}`);
    logger.info(`Quality Score: ${finalEditorReview?.qualityScore || 'N/A'}/100`);
    logger.info(`Content Approved: ${editorDecision === 'approved' ? '✅ YES' : '⚠️ NO (max iterations reached)'}`);

    const result = {
      runId,
      input,
      status: editorDecision,
      totalIterations,
      maxIterations: MAX_ITERATIONS,
      reachedMaxIterations: totalIterations === MAX_ITERATIONS && editorDecision === "needs_revision",
      revisionHistory,  // Clear history of each iteration's decision
      agentStatus: {
        researcher: "completed",
        writer: "completed",
        editor: "completed"
      },
      research: researchResult,
      draft: currentDraft,
      editorReview: finalEditorReview,
      iterations,
      approved: editorDecision === "approved"
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
      totalIterations: result.totalIterations,
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
    logger.error(`Pipeline failed: ${error.message}`);

    stateManager.set(runId, {
      status: "error",
      error: error.message,
      agentStatus: {
        researcher: researchResult ? "completed" : "error",
        writer: currentDraft ? "completed" : "error",
        editor: "error"
      },
      iterations,
      research: researchResult,
      draft: currentDraft
    });

    throw error;
  }
}
