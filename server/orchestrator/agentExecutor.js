import { research, reviewContent, writeContent } from "../agents/index.js";
import { askLLM } from "../services/llmService.js";

function stringifyForPrompt(value) {
  if (value == null) return "None yet.";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function outputToText(output) {
  if (output == null) return "";
  if (typeof output === "string") return output;
  if (typeof output.content === "string") return output.content;
  if (typeof output.optimizedContent === "string") return output.optimizedContent;
  if (typeof output.summary === "string") return output.summary;
  return stringifyForPrompt(output);
}

function summarizePreviousOutputs(context) {
  if (!context.outputs.length) {
    return "No previous agent outputs yet.";
  }

  return context.outputs
    .map((entry, index) => {
      const outputText = outputToText(entry.output);
      const truncated = outputText.length > 5000 ? `${outputText.slice(0, 5000)}\n...[truncated]` : outputText;
      return `#${index + 1} ${entry.agentName} (${entry.agentId})\n${truncated}`;
    })
    .join("\n\n---\n\n");
}

function latestOutputByAgent(context, agentId) {
  for (let index = context.outputs.length - 1; index >= 0; index -= 1) {
    if (context.outputs[index].agentId === agentId) {
      return context.outputs[index].output;
    }
  }
  return null;
}

function latestTextOutput(context) {
  for (let index = context.outputs.length - 1; index >= 0; index -= 1) {
    const text = outputToText(context.outputs[index].output);
    if (text.trim()) return text;
  }
  return "";
}

function getResearchContext(context) {
  return latestOutputByAgent(context, "researcher") || context.research || {
    note: "No Researcher output is required for this pipeline. Use the original input and any previous agent outputs instead.",
    previousAgentOutputs: context.outputs.map((entry) => ({
      agent: entry.agentName,
      output: entry.output
    }))
  };
}

function getDraftForReview(context) {
  const writerOutput = latestOutputByAgent(context, "writer") || context.draft;
  if (writerOutput?.content) return writerOutput.content;
  return latestTextOutput(context);
}

function buildCustomSystemMessage(agent) {
  return `You are ${agent.name}.\n\nRole:\n${agent.role}\n\nPersonality:\n${agent.personality}\n\nSaved system prompt:\n${agent.systemPrompt}\n\nFollow the saved system prompt as the highest-priority behavior for this agent. Do not change behavior based on the agent name alone; use the role, personality, and system prompt above.`;
}

function buildCustomUserPrompt(agent, context) {
  const pipelineSteps = context.pipeline.steps
    .map((step, index) => `${index + 1}. ${step.name} (${step.agentId})${step.stepId === context.currentStep?.stepId ? " ← current" : ""}`)
    .join("\n");

  return `You are executing one step in a dynamic multi-agent pipeline.\n\nCURRENT AGENT:\n${agent.name}\n\nORIGINAL USER INPUT:\n${stringifyForPrompt(context.input)}\n\nPIPELINE ORDER:\n${pipelineSteps}\n\nOUTPUTS FROM PREVIOUS AGENTS:\n${summarizePreviousOutputs(context)}\n\nUse the original input and prior outputs only when they are useful for your configured task. Do not assume Researcher, Writer, or Editor exist in this pipeline. Return the response requested by your saved system prompt. If no format is specified, return clear plain text or Markdown.`;
}

function demoCustomOutput(agent, context) {
  return {
    content: `## ${agent.name} (Demo Mode)\n\nThis custom agent is configured as: ${agent.role}\n\nPersonality: ${agent.personality}\n\nBecause no LLM provider is reachable, this is a deterministic demo response. With GROQ_API_KEY configured, this agent will execute using its saved system prompt:\n\n> ${agent.systemPrompt}\n\nOriginal input: ${context.input.topic || "No topic provided"}\n\nPrevious outputs available: ${context.outputs.length}`,
    mode: "demo"
  };
}

async function executeResearcher(context) {
  const output = await research(context.input);
  return {
    output,
    phase: "research",
    summary: `Topic: ${output.topic || context.input.topic} | Key Points: ${output.keyPoints?.length || 0} | Sources: ${output.sources?.length || 0}`
  };
}

async function executeWriter(context) {
  const editorFeedback = latestOutputByAgent(context, "editor") || context.editorReview || undefined;
  const output = await writeContent({
    ...context.input,
    research: getResearchContext(context),
    editorFeedback
  });

  return {
    output,
    phase: "write",
    summary: `Words: ${output.wordCount || outputToText(output).split(/\s+/).filter(Boolean).length} | Mode: ${output.mode || "llm"}`
  };
}

async function executeEditor(context) {
  const output = await reviewContent({
    ...context.input,
    research: getResearchContext(context),
    draft: getDraftForReview(context),
    iteration: context.loopIteration || 1
  });

  const qualityScore = output.qualityScore || 0;
  const scoreBasedDecision = qualityScore >= (context.approvalThreshold || 80) ? "approved" : "needs_revision";

  return {
    output,
    phase: "review",
    status: scoreBasedDecision,
    qualityScore,
    summary: `Decision: ${scoreBasedDecision} | Quality: ${qualityScore}/100 | Strengths: ${output.strengths?.length || 0} | Issues: ${output.weaknesses?.length || 0}`
  };
}

async function executeCustomAgent(agent, context) {
  const raw = await askLLM(buildCustomUserPrompt(agent, context), {
    temperature: 0.55,
    jsonMode: false,
    systemMessage: buildCustomSystemMessage(agent)
  });

  const output = raw && raw.trim().length
    ? { content: raw.trim(), mode: "llm" }
    : demoCustomOutput(agent, context);

  return {
    output,
    phase: "custom",
    summary: `${agent.name} produced ${outputToText(output).split(/\s+/).filter(Boolean).length} words`
  };
}

const builtInExecutors = {
  researcher: executeResearcher,
  writer: executeWriter,
  editor: executeEditor
};

export function getOutputText(output) {
  return outputToText(output);
}

export async function executeAgent(agent, context) {
  if (agent.type === "built-in" && builtInExecutors[agent.id]) {
    return builtInExecutors[agent.id](context);
  }

  return executeCustomAgent(agent, context);
}
