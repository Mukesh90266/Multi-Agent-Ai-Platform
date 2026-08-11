/**
 * Position-independent tool-calling loop for ANY agent.
 *
 * Flow:
 *   Agent → LLM (user input + context + allowed tools)
 *        → tool needed? → Tool Registry → result → LLM continues
 *        → final agent output
 *
 * Does NOT depend on pipeline index or built-in agent identity.
 */

import { askLLMForToolDecision } from "../services/llmService.js";
import {
  executeTool,
  formatToolsForPrompt,
  getToolDefinitionsForLlm,
  normalizeToolIds
} from "../tools/toolRegistry.js";

const DEFAULT_MAX_TOOL_ROUNDS = 3;

function stringifyForPrompt(value) {
  if (value == null) return "None.";
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
  if (!context?.outputs?.length) {
    return "No previous agent outputs yet.";
  }

  return context.outputs
    .map((entry, index) => {
      const text = outputToText(entry.output);
      const truncated = text.length > 4000 ? `${text.slice(0, 4000)}\n...[truncated]` : text;
      return `#${index + 1} ${entry.agentName} (${entry.agentId})\n${truncated}`;
    })
    .join("\n\n---\n\n");
}

function buildPipelineOrder(context) {
  if (!context?.pipeline?.steps?.length) return "Not available.";

  return context.pipeline.steps
    .map((step, index) => {
      const marker = step.stepId === context.currentStep?.stepId ? " ← current" : "";
      return `${index + 1}. ${step.name} (${step.agentId})${marker}`;
    })
    .join("\n");
}

export function resolveAgentTools(agent) {
  return normalizeToolIds(agent?.tools || []);
}

function buildSystemMessage(agent, toolIds) {
  const toolsBlock = formatToolsForPrompt(toolIds);

  return `You are ${agent.name}.

Role:
${agent.role || "Helpful pipeline agent."}

Personality:
${agent.personality || "Clear and practical."}

Saved system prompt (highest priority behavior):
${agent.systemPrompt || "Follow your role and produce useful output."}

You are one step inside a dynamic multi-agent pipeline.
Tool calling is a capability of THIS agent only — it does not depend on whether you are first, middle, or last in the pipeline.

AVAILABLE TOOLS:
${toolsBlock}

DECISION RULES (based primarily on the user input, plus your role and prior outputs):
1. Read the ORIGINAL USER INPUT carefully.
2. If fulfilling your role for that input needs external/current/verified data and a listed tool can help → action "tool_call".
3. If the user input + previous agent outputs + your knowledge are enough → action "final_answer".
4. You may call tools multiple times (different queries/claims) before the final answer.
5. Only use tools from AVAILABLE TOOLS. Never invent tool names.
6. After tool results arrive, incorporate them and continue until you can produce the final answer.
7. Do not mention these decision rules in the final answer unless useful to the user.

RESPONSE FORMAT — return ONLY valid JSON with one of these shapes:

Tool call:
{"action":"tool_call","tool":"TOOL_ID","args":{...},"reason":"short why this helps the user input"}

Final answer:
{"action":"final_answer","content":"your complete output as markdown or plain text"}

No markdown fences. No extra keys outside this schema.`;
}

function buildUserPrompt(agent, context, toolTrace = []) {
  const input = context?.input || {};
  const toolTraceBlock = toolTrace.length
    ? toolTrace
        .map((entry, index) => {
          return `Tool round ${index + 1}:
  tool: ${entry.tool}
  args: ${stringifyForPrompt(entry.args)}
  reason: ${entry.reason || "n/a"}
  result: ${stringifyForPrompt(entry.result)}`;
        })
        .join("\n\n")
    : "No tools have been called yet.";

  return `Execute your agent task for the current pipeline step.

CURRENT AGENT: ${agent.name} (${agent.id || "unknown"})
AGENT TYPE: ${agent.type || "custom"}

ORIGINAL USER INPUT (primary basis for whether a tool is needed):
${stringifyForPrompt(input)}

PIPELINE ORDER:
${buildPipelineOrder(context)}

OUTPUTS FROM PREVIOUS AGENTS:
${summarizePreviousOutputs(context)}

TOOL RESULTS SO FAR:
${toolTraceBlock}

Produce either a tool_call JSON decision or a final_answer JSON decision now.`;
}

function buildDemoFinalContent(agent, context, toolTrace) {
  const topic = context?.input?.topic || "the given topic";
  const toolSummary = toolTrace.length
    ? toolTrace
        .map((entry) => `- Called \`${entry.tool}\` → ${entry.result?.summary || "result received"}`)
        .join("\n")
    : "- No tools were required for this run.";

  return `## ${agent.name} (Demo Mode)

Role: ${agent.role || "Custom agent"}

This agent ran with dynamic tool-calling enabled. Because no LLM provider is reachable, a deterministic demo response was produced from the user input and any tool results.

### User input
${topic}

### Tools assigned
${(agent.tools || []).length ? agent.tools.join(", ") : "None"}

### Tool activity
${toolSummary}

### Output
Based on the user input${toolTrace.length ? " and tool results above" : ""}, ${agent.name} completed its step and passed control to the next pipeline agent.`;
}

function heuristicShouldUseTool(toolIds, context) {
  const topic = String(context?.input?.topic || "").toLowerCase();
  if (!topic || !toolIds.length) return null;

  const searchSignals = [
    "latest", "current", "today", "news", "price", "update", "2024", "2025", "2026",
    "recent", "search", "find sources", "who is", "what is the current"
  ];
  const verifySignals = [
    "verify", "fact check", "fact-check", "is it true", "validate", "check claim", "accurate"
  ];

  if (toolIds.includes("web_search") && searchSignals.some((s) => topic.includes(s))) {
    return {
      action: "tool_call",
      tool: "web_search",
      args: { query: context.input.topic },
      reason: "User input appears to need current or external information."
    };
  }

  if (toolIds.includes("verification_api") && verifySignals.some((s) => topic.includes(s))) {
    return {
      action: "tool_call",
      tool: "verification_api",
      args: { claim: context.input.topic },
      reason: "User input appears to request claim verification."
    };
  }

  return null;
}

function parseFinalContent(decision, agent, context, toolTrace) {
  if (decision?.content && String(decision.content).trim()) {
    return String(decision.content).trim();
  }
  return buildDemoFinalContent(agent, context, toolTrace);
}

function buildGatherOnlySystemMessage(agent, toolIds) {
  const toolsBlock = formatToolsForPrompt(toolIds);

  return `You are ${agent.name} deciding whether external tools are required before producing your main agent output.

Role:
${agent.role || "Helpful pipeline agent."}

AVAILABLE TOOLS:
${toolsBlock}

Based primarily on the ORIGINAL USER INPUT (and prior agent outputs), decide:
- tool_call — if external/current/verified data is needed and a listed tool helps
- final_answer — if no tool is needed right now (content may be empty; tools will stop)

You do NOT write the full agent deliverable here when tools are not needed.
Return ONLY valid JSON:
{"action":"tool_call","tool":"TOOL_ID","args":{...},"reason":"..."}
or
{"action":"final_answer","content":""}`;
}

/**
 * Gather tool results for an agent without producing the final specialized output.
 * Used so built-in agents can keep structured formats while still calling tools.
 */
export async function gatherAgentToolResults(agent, context, options = {}) {
  const toolIds = resolveAgentTools(agent);
  if (!toolIds.length) {
    return { toolCalls: [], toolTrace: [] };
  }

  const maxRounds = options.maxToolRounds || DEFAULT_MAX_TOOL_ROUNDS;
  const toolDefinitions = getToolDefinitionsForLlm(toolIds);
  const toolTrace = [];
  const toolCalls = [];
  const systemMessage = buildGatherOnlySystemMessage(agent, toolIds);

  for (let round = 0; round < maxRounds; round += 1) {
    const userPrompt = buildUserPrompt(agent, context, toolTrace);

    let decision = await askLLMForToolDecision(userPrompt, {
      systemMessage,
      tools: toolDefinitions,
      temperature: 0.2
    });

    if (!decision) {
      if (toolTrace.length === 0) {
        const heuristic = heuristicShouldUseTool(toolIds, context);
        if (heuristic) {
          decision = heuristic;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (decision.action === "final_answer") {
      break;
    }

    const requestedTool = String(decision.tool || "").trim();
    if (!toolIds.includes(requestedTool)) {
      toolTrace.push({
        tool: requestedTool || "(missing)",
        args: decision.args || {},
        reason: decision.reason || "",
        result: {
          error: `Tool "${requestedTool}" is not assigned to this agent. Allowed: ${toolIds.join(", ")}`
        }
      });
      continue;
    }

    const execution = await executeTool(requestedTool, decision.args || {}, context);
    const resultPayload = execution.ok
      ? execution.result
      : { error: execution.error || "Tool failed" };

    const callRecord = {
      tool: requestedTool,
      toolName: execution.toolName || requestedTool,
      args: decision.args || {},
      reason: decision.reason || "",
      ok: Boolean(execution.ok),
      result: resultPayload,
      timestamp: new Date().toISOString()
    };

    toolCalls.push(callRecord);
    toolTrace.push(callRecord);
  }

  return { toolCalls, toolTrace };
}

/**
 * Run the tool-calling loop for an agent that has one or more tools assigned.
 *
 * @returns {{ output: object, phase: string, summary: string, toolCalls: array }}
 */
export async function runAgentWithTools(agent, context, options = {}) {
  const toolIds = resolveAgentTools(agent);
  const maxRounds = options.maxToolRounds || DEFAULT_MAX_TOOL_ROUNDS;
  const toolDefinitions = getToolDefinitionsForLlm(toolIds);
  const toolTrace = [];
  const toolCalls = [];

  const systemMessage = buildSystemMessage(agent, toolIds);
  let forcedDemo = false;

  for (let round = 0; round < maxRounds; round += 1) {
    const userPrompt = buildUserPrompt(agent, context, toolTrace);

    let decision = await askLLMForToolDecision(userPrompt, {
      systemMessage,
      tools: toolDefinitions,
      temperature: 0.3
    });

    // Demo / offline path: one optional heuristic tool call, then final.
    if (!decision) {
      forcedDemo = true;
      if (toolTrace.length === 0) {
        const heuristic = heuristicShouldUseTool(toolIds, context);
        if (heuristic) {
          decision = heuristic;
        } else {
          decision = {
            action: "final_answer",
            content: buildDemoFinalContent(agent, context, toolTrace)
          };
        }
      } else {
        decision = {
          action: "final_answer",
          content: buildDemoFinalContent(agent, context, toolTrace)
        };
      }
    }

    if (decision.action === "final_answer") {
      const content = parseFinalContent(decision, agent, context, toolTrace);
      return {
        output: {
          content,
          mode: forcedDemo ? "demo" : "llm",
          toolsUsed: toolCalls.map((call) => call.tool),
          toolCalls
        },
        phase: agent.phase || "custom",
        summary: toolCalls.length
          ? `${agent.name} finished with ${toolCalls.length} tool call(s)`
          : `${agent.name} finished without tools`,
        toolCalls
      };
    }

    // tool_call
    const requestedTool = String(decision.tool || "").trim();
    if (!toolIds.includes(requestedTool)) {
      toolTrace.push({
        tool: requestedTool || "(missing)",
        args: decision.args || {},
        reason: decision.reason || "",
        result: {
          error: `Tool "${requestedTool}" is not assigned to this agent. Allowed: ${toolIds.join(", ")}`
        }
      });
      continue;
    }

    const execution = await executeTool(requestedTool, decision.args || {}, context);
    const resultPayload = execution.ok
      ? execution.result
      : { error: execution.error || "Tool failed" };

    const callRecord = {
      tool: requestedTool,
      toolName: execution.toolName || requestedTool,
      args: decision.args || {},
      reason: decision.reason || "",
      ok: Boolean(execution.ok),
      result: resultPayload,
      timestamp: new Date().toISOString()
    };

    toolCalls.push(callRecord);
    toolTrace.push(callRecord);
  }

  // Max rounds hit — force a final answer using whatever tool data we have.
  const finalDecision = await askLLMForToolDecision(
    `${buildUserPrompt(agent, context, toolTrace)}\n\nYou have reached the maximum tool rounds. You MUST return action "final_answer" now using the tool results above.`,
    {
      systemMessage,
      tools: toolDefinitions,
      temperature: 0.3
    }
  );

  const content = finalDecision?.action === "final_answer"
    ? parseFinalContent(finalDecision, agent, context, toolTrace)
    : buildDemoFinalContent(agent, context, toolTrace);

  return {
    output: {
      content,
      mode: finalDecision ? "llm" : "demo",
      toolsUsed: toolCalls.map((call) => call.tool),
      toolCalls
    },
    phase: agent.phase || "custom",
    summary: `${agent.name} finished after max tool rounds (${toolCalls.length} call(s))`,
    toolCalls
  };
}
