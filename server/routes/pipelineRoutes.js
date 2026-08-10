import { Router } from "express";
import {
  getPipelineStatusController,
  listPipelineTemplatesController,
  runPipelineController
} from "../controllers/pipelineController.js";

const router = Router();

router.get("/templates", listPipelineTemplatesController);
router.post("/run", runPipelineController);
router.get("/status/:runId", getPipelineStatusController);

export default router;
