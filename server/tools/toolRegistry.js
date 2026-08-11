/**
 * Central tool registry.
 * Tools are capabilities looked up by id — never by pipeline position or agent name.
 */

import { webSearchToolDefinition } from "./webSearch.js";
import { verificationToolDefinition } from "./verificationApi.js";

const TOOL_MAP = new Map([
  [webSearchToolDefinition.id, webSearchToolDefinition],
  [verificationToolDefinition.id, verificationToolDefinition]
]);

export const AVAILABLE_TOOL_IDS = Object.freeze([...TOOL_MAP.keys()]);

/**
 * Normalize an arbitrary tools array into known registry ids (deduped, stable order).
 */
export function normalizeToolIds(tools) {
  if (!Array.isArray(tools)) return [];

  const seen = new Set();
  const normalized = [];

  for (const entry of tools) {
    const id = String(entry || "").trim();
    if (!id || !TOOL_MAP.has(id) || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
}

export function getAllTools() {
  return [...TOOL_MAP.values()].map((tool) => publicTool(tool));
}

export function getToolById(toolId) {
  return TOOL_MAP.get(String(toolId || "").trim()) || null;
}

export function getToolsByIds(toolIds = []) {
  return normalizeToolIds(toolIds)
    .map((id) => TOOL_MAP.get(id))
    .filter(Boolean);
}

export function getToolDefinitionsForLlm(toolIds = []) {
  return getToolsByIds(toolIds).map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
}

export function publicTool(tool) {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  };
}

/**
 * Execute a registered tool by id.
 * Independent of which pipeline step/agent called it.
 */
export async function executeTool(toolId, args = {}, context = {}) {
  const tool = getToolById(toolId);

  if (!tool) {
    return {
      ok: false,
      toolId,
      error: `Unknown tool: ${toolId}`,
      result: null
    };
  }

  try {
    const result = await tool.execute(args || {}, context);
    return {
      ok: true,
      toolId: tool.id,
      toolName: tool.name,
      result
    };
  } catch (error) {
    return {
      ok: false,
      toolId: tool.id,
      toolName: tool.name,
      error: error.message || "Tool execution failed",
      result: null
    };
  }
}

export function formatToolsForPrompt(toolIds = []) {
  const tools = getToolDefinitionsForLlm(toolIds);
  if (!tools.length) {
    return "No external tools are available for this agent.";
  }

  return tools
    .map((tool, index) => {
      const params = tool.parameters?.properties
        ? Object.entries(tool.parameters.properties)
            .map(([key, schema]) => `    - ${key} (${schema.type || "any"}): ${schema.description || ""}`)
            .join("\n")
        : "    (no parameters)";

      const required = Array.isArray(tool.parameters?.required) && tool.parameters.required.length
        ? `  Required: ${tool.parameters.required.join(", ")}`
        : "  Required: none";

      return `${index + 1}. ${tool.id} — ${tool.name}
  Description: ${tool.description}
${required}
  Parameters:
${params}`;
    })
    .join("\n\n");
}
