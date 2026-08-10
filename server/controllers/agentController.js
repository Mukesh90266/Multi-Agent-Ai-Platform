import {
  createCustomAgent,
  getAllAgents,
  getCustomAgents,
  getPipelineTemplates,
  toPublicAgent
} from "../services/agentStore.js";

export async function listAgentsController(req, res) {
  try {
    const agents = await getAllAgents();
    const builtInAgents = agents.filter((agent) => agent.type === "built-in");
    const customAgents = agents.filter((agent) => agent.type === "custom");

    res.status(200).json({
      success: true,
      agents: agents.map((agent) => toPublicAgent(agent)),
      builtInAgents: builtInAgents.map((agent) => toPublicAgent(agent)),
      customAgents: customAgents.map((agent) => toPublicAgent(agent)),
      templates: getPipelineTemplates()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createAgentController(req, res) {
  try {
    const agent = await createCustomAgent(req.body);
    const customAgents = await getCustomAgents();

    res.status(201).json({
      success: true,
      agent: toPublicAgent(agent),
      customAgents: customAgents.map((customAgent) => toPublicAgent(customAgent))
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function listPipelineTemplatesController(req, res) {
  try {
    res.status(200).json({
      success: true,
      templates: getPipelineTemplates()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
