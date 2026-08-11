import { Router } from "express";
import { listToolsController } from "../controllers/toolController.js";

const router = Router();

router.get("/", listToolsController);

export default router;
