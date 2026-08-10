import PipelineRun from "../models/PipelineRun.js";
import { runPipeline } from "../orchestrator/pipeline.js";
import {
  buildRunnablePipeline,
  createCustomAgent,
  getPipelineTemplates,
  serializePipelineForClient
} from "../services/agentStore.js";
import { stateManager } from "../state/stateManager.js";
import { validatePipelineInput } from "../utils/validator.js";

function createWaitingStatus(pipeline) {
  return pipeline.steps.reduce((status, step) => {
    status[step.stepId] = "waiting";
    return status;
  }, {});
}

export async function runPipelineController(req, res) {
  try {
    const validated = validatePipelineInput(req.body);
    const { pipeline: pipelineRequest, ...input } = validated;

    // Custom agents can be cached in the browser. Re-sync any selected custom
    // agent configs before resolving the runnable pipeline so custom pipelines
    // do not fail if the backend file storage was restarted/cleared.
    if (Array.isArray(pipelineRequest?.agentConfigs)) {
      for (const agentConfig of pipelineRequest.agentConfigs) {
        await createCustomAgent(agentConfig);
      }
    }

    const pipeline = await buildRunnablePipeline(pipelineRequest || {});
    const runId = crypto.randomUUID();

    stateManager.set(runId, {
      runId,
      input,
      status: "starting",
      iteration: 0,
      maxIterations: pipeline.loop?.maxIterations || 1,
      agentStatus: createWaitingStatus(pipeline),
      pipeline: serializePipelineForClient(pipeline),
      currentStep: null,
      iterations: [],
      agentOutputs: [],
      research: null,
      draft: null,
      editorReview: null,
      finalOutput: null,
      revisionHistory: []
    });

    runPipeline(input, runId, { pipeline })
      .then(async (result) => {
        if (req.app.locals.mongoReady) {
          try {
            await PipelineRun.create({
              runId: result.runId,
              topic: input.topic,
              contentType: input.contentType,
              audience: input.audience,
              tone: input.tone,
              wordCount: input.wordCount,
              status: result.status,
              totalIterations: result.totalIterations,
              maxIterations: result.maxIterations,
              executionSteps: result.executionSteps,
              reachedMaxIterations: result.reachedMaxIterations,
              approved: result.approved,
              pipeline: result.pipeline,
              agentStatus: result.agentStatus,
              agentOutputs: result.agentOutputs,
              finalOutput: result.finalOutput,
              research: result.research,
              draft: result.draft,
              editorReview: result.editorReview,
              optimization: result.optimization,
              iterations: result.iterations,
              revisionHistory: result.revisionHistory
            });
          } catch (dbError) {
            console.error("Failed to save pipeline run to MongoDB:", dbError.message);
          }
        }
      })
      .catch((pipelineError) => {
        console.error("Pipeline background error:", pipelineError.message);
      });

    res.status(202).json({
      success: true,
      runId,
      pipeline: serializePipelineForClient(pipeline),
      message: "Pipeline started"
    });
  } catch (error) {
    console.error("Pipeline request rejected:", error.stack || error.message);
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getPipelineStatusController(req, res) {
  try {
    const { runId } = req.params;
    const state = stateManager.get(runId);

    if (!state) {
      return res.status(404).json({ success: false, message: "Run not found" });
    }

    res.status(200).json({ success: true, ...state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function listPipelineTemplatesController(req, res) {
  try {
    res.status(200).json({ success: true, templates: getPipelineTemplates() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
