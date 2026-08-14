import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  getTemplates,
  updateTemplate
} from "../services/templateStore.js";

export async function listTemplatesController(req, res) {
  try {
    const templates = await getTemplates();
    res.status(200).json({ success: true, templates, count: templates.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createTemplateController(req, res) {
  try {
    const template = await createTemplate(req.body);
    res.status(201).json({ success: true, template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getTemplateController(req, res) {
  try {
    const template = await getTemplateById(req.params.templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }
    res.status(200).json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateTemplateController(req, res) {
  try {
    const template = await updateTemplate(req.params.templateId, req.body);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }
    res.status(200).json({ success: true, template });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function deleteTemplateController(req, res) {
  try {
    const result = await deleteTemplate(req.params.templateId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}
