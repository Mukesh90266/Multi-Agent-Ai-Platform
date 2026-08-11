import { getAllTools } from "../tools/toolRegistry.js";

export async function listToolsController(req, res) {
  try {
    res.status(200).json({
      success: true,
      tools: getAllTools()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
