import { Router } from 'express';
import { runPipelineController, getPipelineStatusController } from '../controllers/pipelineController.js';
const router = Router();
router.post('/run', runPipelineController);
router.get('/status/:runId', getPipelineStatusController);
export default router;
