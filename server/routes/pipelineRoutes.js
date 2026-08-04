import { Router } from 'express'; 
import { runPipelineController } from '../controllers/pipelineController.js';
const router = Router();
router.post('/run', runPipelineController); 
export default router;
