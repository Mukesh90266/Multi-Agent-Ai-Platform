const MAX_PIPELINE_INPUT_LENGTH = 20000;

function validatePipelineRequest(body = {}) {
  const pipelineBody = body.pipeline && typeof body.pipeline === "object" ? body.pipeline : {};
  const rawAgentIds = Array.isArray(pipelineBody.agentIds)
    ? pipelineBody.agentIds
    : Array.isArray(body.agentIds)
      ? body.agentIds
      : null;

  const templateId = pipelineBody.templateId || body.pipelineTemplateId || null;

  if (!rawAgentIds && !templateId) {
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
