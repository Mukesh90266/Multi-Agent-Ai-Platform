import PipelineRun from '../models/PipelineRun.js';
import { runPipeline } from '../orchestrator/pipeline.js';
import { stateManager } from '../state/stateManager.js';
import { validatePipelineInput } from '../utils/validator.js';

export async function runPipelineController(req, res) {
  try {
    const input = validatePipelineInput(req.body);
    const runId = crypto.randomUUID();

    // Initialize state immediately so status endpoint never returns 404
    stateManager.set(runId, {
      status: "starting",
      iteration: 1,
      maxIterations: 5,
      agentStatus: {
        researcher: "waiting",
        writer: "waiting",
        editor: "waiting"
      },
      iterations: [],
      research: null,
      draft: null
    });

    // Start pipeline in background and return runId immediately
    runPipeline(input, runId).then(async (result) => {
      if (req.app.locals.mongoReady) {
        await PipelineRun.create({
          ...input,
          status: result.status,
          agentStatus: result.agentStatus,
          research: result.research,
          draft: result.draft,
          editorReview: result.editorReview,
          iterations: result.iterations
        });
      }
    });

    res.status(202).json({ success: true, runId, message: "Pipeline started" });
  } catch (error) {
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
