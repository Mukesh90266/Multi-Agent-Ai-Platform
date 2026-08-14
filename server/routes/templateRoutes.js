import { Router } from "express";
import {
  createTemplateController,
  deleteTemplateController,
  getTemplateController,
  listTemplatesController,
  updateTemplateController
} from "../controllers/templateController.js";

const router = Router();

router.get("/", listTemplatesController);
router.post("/", createTemplateController);
router.get("/:templateId", getTemplateController);
router.put("/:templateId", updateTemplateController);
router.delete("/:templateId", deleteTemplateController);

export default router;
