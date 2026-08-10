const MAX_PIPELINE_INPUT_LENGTH = 20000;

function validatePipelineRequest(body = {}) {
  const pipelineBody = body.pipeline && typeof body.pipeline === "object" ? body.pipeline : {};
  const rawAgentIds = Array.isArray(pipelineBody.agentIds)
    ? pipelineBody.agentIds
    : Array.isArray(body.agentIds)
      ? body.agentIds
      : null;

  const templateId = pipelineBody.templateId || body.pipelineTemplateId || null;
  const rawAgentConfigs = Array.isArray(pipelineBody.agentConfigs) ? pipelineBody.agentConfigs : [];

  if (!rawAgentIds && !templateId && rawAgentConfigs.length === 0) {
    return undefined;
  }

  const pipeline = {};

  if (templateId) {
    pipeline.templateId = String(templateId).trim();
  }

  if (rawAgentIds) {
    const agentIds = rawAgentIds
      .map((agentId) => String(agentId || "").trim())
      .filter(Boolean);

    if (agentIds.length < 1) {
      throw new Error("Pipeline must include at least one agent.");
    }

    if (agentIds.length > 12) {
      throw new Error("Pipeline can include at most 12 agents for this version.");
    }

    for (const agentId of agentIds) {
      if (agentId.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(agentId)) {
        throw new Error(`Invalid agent id in pipeline: ${agentId}`);
      }
    }

    pipeline.agentIds = agentIds;
  }

  if (rawAgentConfigs.length) {
    pipeline.agentConfigs = rawAgentConfigs
      .filter((agent) => agent && typeof agent === "object")
      .map((agent) => ({
        id: String(agent.id || "").trim(),
        type: String(agent.type || "custom").trim(),
        name: String(agent.name || "").trim(),
        role: String(agent.role || "").trim(),
        personality: String(agent.personality || "").trim(),
        systemPrompt: String(agent.systemPrompt || "").trim(),
        description: String(agent.description || agent.role || "").trim(),
        createdAt: agent.createdAt ? String(agent.createdAt).trim() : undefined
      }))
      .filter((agent) => agent.id && agent.type === "custom");
  }

  return pipeline;
}

export function validatePipelineInput(body = {}) {
  const topic = String(body.topic || "").trim();

  if (topic.length < 3) {
    throw new Error("Input must be at least 3 characters long.");
  }

  if (topic.length > MAX_PIPELINE_INPUT_LENGTH) {
    throw new Error(`Input must be less than ${MAX_PIPELINE_INPUT_LENGTH.toLocaleString()} characters long.`);
  }

  const wordCount = Number(body.wordCount || 800);

  if (!Number.isInteger(wordCount) || wordCount < 200 || wordCount > 3000) {
    throw new Error("Word count must be between 200 and 3000.");
  }

  return {
    topic,
    contentType: String(body.contentType || "Blog post").trim(),
    audience: String(body.audience || "General audience").trim(),
    tone: String(body.tone || "Educational").trim(),
    wordCount,
    pipeline: validatePipelineRequest(body)
  };
}

export function validateResearch(data) {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray(data.keyPoints) ||
    !Array.isArray(data.suggestedOutline)
  ) {
    throw new Error("Researcher returned an invalid structured response.");
  }

  return data;
}
