import { Router } from "express";
import { createAgentController, listAgentsController } from "../controllers/agentController.js";

const router = Router();

router.get("/", listAgentsController);
router.post("/", createAgentController);

export default router;
