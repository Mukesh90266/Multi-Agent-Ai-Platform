import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { normalizeToolIds } from "../tools/toolRegistry.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(directory, "..");
const dataDirectory = path.join(serverDirectory, "data");
const customAgentsPath = path.join(dataDirectory, "customAgents.json");

export const DEFAULT_PIPELINE_AGENT_IDS = ["researcher", "writer", "editor"];

export const BUILT_IN_AGENTS = [
  {
    id: "researcher",
    type: "built-in",
    name: "Researcher",
    role: "Collects trustworthy planning notes, key points, definitions, outlines, examples, and source-verification reminders for the user's topic.",
    personality: "Careful, skeptical, concise, and source-aware.",
    systemPrompt:
      "You are a reliable Researcher Agent. Produce trustworthy structured research notes in clear Markdown. Do not search by default. Use web_search ONLY when the user input clearly needs current/live facts, news, prices, or external sources (e.g. latest, today, current). For simple topics and explanations such as machine learning or basic concepts, answer from knowledge without tools. Never fabricate sources, URLs, citations, statistics, quotations, or dates. If you searched, incorporate the results into your notes.",
    description: "Generates structured research notes for the content pipeline. Can call Web Search when needed.",
    immutable: true,
    builtIn: true,
    phase: "research",
    tools: ["web_search"]
  },
  {
    id: "writer",
    type: "built-in",
    name: "Writer",
    role: "Turns the original input and any prior agent outputs into clear, useful Markdown content.",
    personality: "Practical, engaging, and audience-focused.",
    systemPrompt:
      "You are a skilled Writer Agent. Write original, clear, useful content in Markdown and use previous pipeline outputs when they are relevant.",
    description: "Creates or revises draft content using available pipeline context.",
    immutable: true,
    builtIn: true,
    phase: "write",
    tools: []
  },
  {
    id: "editor",
    type: "built-in",
    name: "Editor",
    role: "Reviews drafts for quality, accuracy, completeness, structure, tone, and actionability.",
    personality: "Strict, helpful, professional, and specific.",
    systemPrompt:
      "You are a strict, helpful, and professional Editor Agent. Return structured feedback as Markdown covering decision, quality score (0-100), strengths, weaknesses, missing points, and revision instructions. Use verification_api when claims in the draft need checking based on the user input or draft content.",
    description: "Reviews content and decides whether it is approved or needs revision. Can call Verification API when needed.",
    immutable: true,
    builtIn: true,
    phase: "review",
    tools: ["verification_api"]
  }
];

export const PIPELINE_TEMPLATES = [
  {
    id: "default-rwe",
    name: "Researcher → Writer → Editor",
    description:
      "Default content workflow. Researcher runs once, then Writer and Editor collaborate through the dynamic agent executor until approved or max revisions are reached.",
    agentIds: DEFAULT_PIPELINE_AGENT_IDS,
    builtIn: true,
    loop: {
      type: "writer-editor-review",
      enabled: true,
      writerAgentId: "writer",
      editorAgentId: "editor",
      maxIterations: 3,
      approvalThreshold: 80
    }
  }
];

function publicAgent(agent, { includePrompt = true } = {}) {
  const publicShape = {
    id: agent.id,
    type: agent.type,
    name: agent.name,
    role: agent.role,
    personality: agent.personality,
    description: agent.description || "",
    immutable: Boolean(agent.immutable),
    builtIn: agent.type === "built-in",
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    phase: agent.phase || "agent",
    tools: normalizeToolIds(agent.tools)
  };

  if (includePrompt) {
    publicShape.systemPrompt = agent.systemPrompt;
  }

  return publicShape;
}

export function toPublicAgent(agent, options) {
  return publicAgent(agent, options);
}

export function getPipelineTemplates() {
  return PIPELINE_TEMPLATES.map((template) => ({ ...template, loop: { ...template.loop } }));
}

async function ensureDataDirectory() {
  await fs.mkdir(dataDirectory, { recursive: true });
}

async function readCustomAgents() {
  try {
    const raw = await fs.readFile(customAgentsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((agent) => agent && typeof agent === "object");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeCustomAgents(agents) {
  await ensureDataDirectory();
  await fs.writeFile(customAgentsPath, JSON.stringify(agents, null, 2));
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function assertLength(label, value, min, max) {
  if (value.length < min) {
    throw new Error(`${label} must be at least ${min} characters long.`);
  }
  if (value.length > max) {
    throw new Error(`${label} must be less than ${max} characters long.`);
  }
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "agent";
}

function normalizeCustomAgent(payload = {}, existingAgent = null) {
  const name = cleanText(payload.name);
  const role = cleanText(payload.role);
  const personality = cleanText(payload.personality);
  const systemPrompt = cleanText(payload.systemPrompt);
  const requestedId = cleanText(payload.id);
  const tools = normalizeToolIds(payload.tools);

  assertLength("Agent name", name, 2, 80);
  assertLength("Role", role, 2, 300);
  assertLength("Personality", personality, 2, 500);
  assertLength("System prompt", systemPrompt, 10, 6000);

  let id = existingAgent?.id || `custom-${slugify(name)}-${randomUUID().slice(0, 8)}`;

  if (requestedId) {
    if (!/^custom-[a-zA-Z0-9_-]+$/.test(requestedId) || requestedId.length > 120) {
      throw new Error("Custom agent id is invalid.");
    }
    id = requestedId;
  }

  const now = new Date().toISOString();

  return {
    id,
    type: "custom",
    name,
    role,
    personality,
    systemPrompt,
    description: cleanText(payload.description, role),
    immutable: false,
    builtIn: false,
    phase: "custom",
    tools,
    createdAt: existingAgent?.createdAt || cleanText(payload.createdAt) || now,
    updatedAt: now
  };
}

export async function getCustomAgents() {
  const agents = await readCustomAgents();
  return agents.map((agent) => ({
    ...agent,
    type: "custom",
    immutable: false,
    builtIn: false,
    phase: agent.phase || "custom",
    tools: normalizeToolIds(agent.tools)
  }));
}

export async function getAllAgents() {
  const customAgents = await getCustomAgents();
  return [...BUILT_IN_AGENTS, ...customAgents];
}

export async function getAgentById(agentId) {
  const agents = await getAllAgents();
  return agents.find((agent) => agent.id === agentId) || null;
}

export async function createCustomAgent(payload) {
  const agents = await getCustomAgents();
  const existingAgent = payload?.id
    ? agents.find((agent) => agent.id === String(payload.id).trim())
    : null;
  const agent = normalizeCustomAgent(payload, existingAgent);

  const builtInNameConflict = BUILT_IN_AGENTS.some(
    (builtInAgent) => builtInAgent.name.toLowerCase() === agent.name.toLowerCase()
  );
  if (builtInNameConflict) {
    throw new Error("A built-in agent already uses that name. Choose a unique custom agent name.");
  }

  const existingIndex = agents.findIndex((existing) => existing.id === agent.id);
  if (existingIndex >= 0) {
    agents[existingIndex] = agent;
  } else {
    agents.push(agent);
  }

  await writeCustomAgents(agents);
  return agent;
}

export async function deleteCustomAgent(agentId) {
  const id = cleanText(agentId);

  if (!id) {
    throw new Error("Agent id is required.");
  }

  if (BUILT_IN_AGENTS.some((agent) => agent.id === id)) {
    throw new Error("Built-in agents cannot be deleted.");
  }

  if (!/^custom-[a-zA-Z0-9_-]+$/.test(id) || id.length > 120) {
    throw new Error("Custom agent id is invalid.");
  }

  const agents = await getCustomAgents();
  const nextAgents = agents.filter((agent) => agent.id !== id);
  const deleted = nextAgents.length !== agents.length;

  if (deleted) {
    await writeCustomAgents(nextAgents);
  }

  return { deleted, agentId: id };
}

function summarizePipelineStep(agent, index, duplicateCount) {
  const stepNumber = index + 1;
  const stepId = duplicateCount > 1 ? `${agent.id}__${stepNumber}` : agent.id;

  return {
    stepId,
    index,
    agentId: agent.id,
    type: agent.type,
    name: agent.name,
    role: agent.role,
    personality: agent.personality,
    description: agent.description || "",
    phase: agent.phase || "agent",
    builtIn: agent.type === "built-in",
    tools: normalizeToolIds(agent.tools)
  };
}

function findTemplate(templateId) {
  if (!templateId) return null;
  return PIPELINE_TEMPLATES.find((template) => template.id === templateId) || null;
}

export async function buildRunnablePipeline(pipelineRequest = {}) {
  const requestedTemplate = findTemplate(pipelineRequest.templateId);
  const shouldUseDefaultTemplate = !pipelineRequest.templateId && !pipelineRequest.agentIds;
  const template = requestedTemplate || (shouldUseDefaultTemplate ? PIPELINE_TEMPLATES[0] : null);
  const requestedAgentIds = Array.isArray(pipelineRequest.agentIds) && pipelineRequest.agentIds.length
    ? pipelineRequest.agentIds
    : template?.agentIds || DEFAULT_PIPELINE_AGENT_IDS;

  if (requestedAgentIds.length < 1) {
    throw new Error("Pipeline must include at least one agent.");
  }

  if (requestedAgentIds.length > 12) {
    throw new Error("Pipeline can include at most 12 agents for this version.");
  }

  const allAgents = await getAllAgents();
  const agentMap = new Map(allAgents.map((agent) => [agent.id, agent]));

  const missing = requestedAgentIds.filter((agentId) => !agentMap.has(agentId));
  if (missing.length) {
    throw new Error(`Unknown agent in pipeline: ${missing.join(", ")}`);
  }

  const duplicateCounts = requestedAgentIds.reduce((counts, agentId) => {
    counts.set(agentId, (counts.get(agentId) || 0) + 1);
    return counts;
  }, new Map());

  const steps = requestedAgentIds.map((agentId, index) => {
    const agent = agentMap.get(agentId);
    return {
      ...summarizePipelineStep(agent, index, duplicateCounts.get(agentId)),
      agent
    };
  });

  const defaultSequenceSelected = requestedAgentIds.length === DEFAULT_PIPELINE_AGENT_IDS.length &&
    requestedAgentIds.every((agentId, index) => agentId === DEFAULT_PIPELINE_AGENT_IDS[index]);

  const loop = template?.loop || (
    pipelineRequest.templateId === "default-rwe" || (!pipelineRequest.agentIds && defaultSequenceSelected)
      ? PIPELINE_TEMPLATES[0].loop
      : null
  );

  return {
    id: template?.id || "custom-pipeline",
    name: template?.name || "Custom Pipeline",
    description: template?.description || "User-selected dynamic agent pipeline.",
    templateId: template?.id || null,
    isDefault: Boolean(template?.id === "default-rwe"),
    agentIds: requestedAgentIds,
    steps,
    loop: loop ? { ...loop } : null
  };
}

export function serializePipelineForClient(pipeline) {
  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    templateId: pipeline.templateId,
    isDefault: pipeline.isDefault,
    agentIds: [...pipeline.agentIds],
    loop: pipeline.loop ? { ...pipeline.loop } : null,
    steps: pipeline.steps.map(({ agent, ...step }) => ({ ...step }))
  };
}
