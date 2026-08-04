import PipelineRun from '../models/PipelineRun.js';
import { runPipeline } from '../orchestrator/pipeline.js';
import { validatePipelineInput } from '../utils/validator.js';
export async function runPipelineController(req, res) {
 try { const input = validatePipelineInput(req.body);
     const result = await runPipeline(input); 
     let saved = null;
      if (req.app.locals.mongoReady) saved = await PipelineRun.create({ ...input, status: result.status, agentStatus: result.agentStatus, research: result.research,draft: result.draft,editorReview: result.editorReview, iterations: result.iterations });
       res.status(201).json({ success: true, ...result, databaseId: saved?._id || null }); }
   catch (error) { res.status(400).json({ success: false, message: error.message }); }
}
