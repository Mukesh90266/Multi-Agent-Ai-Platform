import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateManager } from '../state/stateManager.js';
import { logger } from '../utils/logger.js';
import {
  research,
  writeContent,
  reviewContent,
  optimizeContent
} from "../agents/index.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(directory, '..');
const logsDir = path.join(serverDirectory, 'logs');
const outputDir = path.join(serverDirectory, 'output');
const iterationLogPath = path.join(logsDir, 'iterationLogs.json');
const outputPath = path.join(outputDir, 'finalOutput.json');

// Ensure output directories exist before writing
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory already exists or cannot be created; writeFile will throw if truly broken
  }
}

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
        editor: "waiting",
        optimizer: "waiting"
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
          editor: "waiting",
          optimizer: "waiting"
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
          editor: "running",
          optimizer: "waiting"
        },
        iterations,
        research: researchResult,
        draft: currentDraft
      });

      // Build previous feedback for Editor to recognize improvements
      const previousFeedback = loopIteration > 1 && editorFeedback ? 
        `Previous issues to check if resolved:\n${editorFeedback.revisionInstructions?.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}\n\nPrevious weaknesses:\n${editorFeedback.weaknesses?.map(w => `- ${w.section}: ${w.issue}`).join('\n')}\n\nPrevious missing points:\n${editorFeedback.missingPoints?.map(p => `- ${p}`).join('\n')}` : 
        null;

      const editorReview = await reviewContent({
        ...input,
        research: { ...researchResult, previousFeedback },
        draft: currentDraft.content,
        iteration: loopIteration
      });

      finalEditorReview = editorReview;
      
      // IMPORTANT: Use QUALITY SCORE as the deciding factor, not the decision field
      // Score >= 80 means approved, regardless of what the editor said
      const qualityScore = editorReview.qualityScore || 0;
      const scoreBasedDecision = qualityScore >= 80 ? "approved" : "needs_revision";
      
      editorDecision = scoreBasedDecision;  // Use score-based decision
      editorFeedback = editorReview;

      iterations.push({
        phase: "review",
        iteration: loopIteration,
        agent: "editor",
        status: editorDecision,  // Log the score-based decision
        timestamp: new Date().toISOString(),
        output: editorReview,
        qualityScore: qualityScore,  // Store quality score separately
        summary: `Decision: ${editorDecision} | Quality: ${qualityScore}/100 | Strengths: ${editorReview.strengths?.length || 0} | Issues: ${editorReview.weaknesses?.length || 0}`
      });

      logger.agent('editor', 'completed', `Decision: ${editorDecision} (${qualityScore}/100) - ${qualityScore >= 80 ? '✅ Meets threshold' : '🔄 Below threshold'}`);
      
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

      // Check if we should continue or stop
      if (qualityScore >= 80) {
        // Score reached threshold - STOP THE LOOP!
        logger.info(`✅ Quality score ${qualityScore} reached approval threshold (80+). Stopping loop.`);
        break;  // Exit loop immediately!
      } else if (editorDecision === "needs_revision" && loopIteration < MAX_ITERATIONS) {
        logger.warning(`Editor requested revisions. Starting iteration ${loopIteration + 1}...`);
      } else if (editorDecision === "needs_revision" && loopIteration === MAX_ITERATIONS) {
        logger.warning(`Max iterations (${MAX_ITERATIONS}) reached. Proceeding with current draft.`);
      }

      loopIteration++;
    }

    // ============================================
    // PHASE 3: SEO OPTIMIZER (ONLY IF APPROVED)
    // ============================================
    let optimizerResult = null;

    if (editorDecision === "approved") {
      logger.phase('SEO OPTIMIZER - STARTING');
      logger.agent('optimizer', 'started', 'Formatting & SEO optimization');

      stateManager.set(runId, {
        status: "optimizing",
        iteration: loopIteration - 1,
        maxIterations: MAX_ITERATIONS,
        agentStatus: {
          researcher: "completed",
          writer: "completed",
          editor: "completed",
          optimizer: "running"
        },
        iterations,
        research: researchResult,
        draft: currentDraft
      });

      optimizerResult = await optimizeContent({
        ...input,
        research: researchResult,
        draft: currentDraft.content,
        editorReview: finalEditorReview
      });

      iterations.push({
        phase: "optimize",
        iteration: 0,
        agent: "optimizer",
        status: "completed",
        timestamp: new Date().toISOString(),
        output: optimizerResult,
        summary: `Readability: ${optimizerResult.readabilityScore}/100 | Primary Keyword: "${optimizerResult.seo?.primaryKeyword}" | Slug: ${optimizerResult.slug}`
      });

      logger.agent('optimizer', 'completed', `Readability: ${optimizerResult.readabilityScore}/100 | Primary Keyword: "${optimizerResult.seo?.primaryKeyword}"`);
      if (optimizerResult.suggestedTitle) {
        logger.info(`   Suggested Title: ${optimizerResult.suggestedTitle}`);
      }
      if (optimizerResult.seo?.secondaryKeywords?.length) {
        logger.info(`   Secondary Keywords: ${optimizerResult.seo.secondaryKeywords.join(', ')}`);
      }
      if (optimizerResult.metaDescription) {
        logger.info(`   Meta Desc: ${optimizerResult.metaDescription}`);
      }
    } else {
      logger.info('⏭️ Skipping SEO Optimizer — content not approved.');
    }

    // ============================================
    // FINAL RESULT
    // ============================================
    const totalIterations = loopIteration - 1;
    
    // Build revision summary based on quality score
    const revisionHistory = [];
    for (let i = 1; i <= totalIterations; i++) {
      const reviewIter = iterations.find(it => it.phase === 'review' && it.iteration === i);
      
      if (reviewIter) {
        const score = reviewIter.qualityScore || reviewIter.output.qualityScore || 0;
        const scoreBasedDecision = score >= 80 ? "approved" : "needs_revision";
        
        revisionHistory.push({
          iteration: i,
          decision: scoreBasedDecision,
          qualityScore: score,
          hadRevisions: scoreBasedDecision === 'needs_revision',
          revisionCount: reviewIter.output.revisionInstructions?.length || 0
        });
      }
    }

    logger.phase('PIPELINE COMPLETED');
    logger.info(`📊 Revision Summary:`);
    revisionHistory.forEach(r => {
      const icon = r.decision === 'approved' ? '✅' : '🔄';
      const isStoppedEarly = r.decision === 'approved' && r.iteration < MAX_ITERATIONS;
      logger.info(`   ${icon} Iteration ${r.iteration}: ${r.decision.toUpperCase()} (${r.qualityScore}/100)${r.hadRevisions ? ` - ${r.revisionCount} revisions` : ''}${isStoppedEarly ? ' - STOPPED EARLY ⭐' : ''}`);
    });
    logger.info(`Total Writer-Editor Cycles: ${totalIterations}`);
    logger.info(`Final Decision: ${editorDecision}`);
    logger.info(`Quality Score: ${finalEditorReview?.qualityScore || 'N/A'}/100`);
    logger.info(`Content Approved: ${editorDecision === 'approved' ? '✅ YES' : '⚠️ NO (max iterations reached)'}`);
    if (optimizerResult) {
      logger.info(`SEO Optimized: ✅ YES | Readability: ${optimizerResult.readabilityScore}/100`);
    }

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
        editor: "completed",
        optimizer: optimizerResult ? "completed" : "skipped"
      },
      research: researchResult,
      draft: currentDraft,
      editorReview: finalEditorReview,
      optimization: optimizerResult,
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

    await ensureDir(logsDir);
    await fs.writeFile(
      iterationLogPath,
      JSON.stringify(logs.slice(0, 100), null, 2)
    );

    // Save newest complete pipeline result
    await ensureDir(outputDir);
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
        editor: "error",
        optimizer: "error"
      },
      iterations,
      research: researchResult,
      draft: currentDraft
    });

    throw error;
  }
}
