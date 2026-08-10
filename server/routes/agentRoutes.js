import { Router } from "express";
import {
  createAgentController,
  deleteAgentController,
  listAgentsController
} from "../controllers/agentController.js";

const router = Router();

router.get("/", listAgentsController);
router.post("/", createAgentController);
router.delete("/:agentId", deleteAgentController);

export default router;
