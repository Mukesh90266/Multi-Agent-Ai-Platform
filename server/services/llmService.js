import OpenAI from "openai";
import { config } from "../config/config.js";

let connectionWarningShown = false;

function getClient() {
  if (!config.groqKey) return null;

  return new OpenAI({
    apiKey: config.groqKey,
    baseURL: "https://api.groq.com/openai/v1"
  });
}

function isNetworkError(error) {
  const errMsg = error?.message || "";
  return (
    errMsg.includes("ENOTFOUND") ||
    errMsg.includes("ECONNREFUSED") ||
    errMsg.includes("ECONNRESET") ||
    errMsg.includes("ETIMEDOUT") ||
    errMsg.includes("fetch failed") ||
    errMsg.includes("Connection error") ||
    error?.code === "ECONNREFUSED" ||
    error?.code === "ENOTFOUND"
  );
}

function logNetworkFallback(error) {
  if (connectionWarningShown) return;

  const errMsg = error?.message || "unknown error";
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚠️  Groq API unreachable — running in DEMO MODE");
  console.log("   Error: " + errMsg.split("\n")[0]);
  console.log("   Demo mode uses built-in sample data for agents/tools.");
  console.log("   To fix: Check internet connection / VPN / DNS settings");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  connectionWarningShown = true;
}

function extractJsonObject(text) {
  if (!text || typeof text !== "string") return null;

  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Normalize model output into a tool decision object.
 * @returns {{ action: 'tool_call', tool: string, args: object, reason?: string }
 *          |{ action: 'final_answer', content: string }
 *          |null}
 */
export function normalizeToolDecision(raw) {
  if (!raw) return null;

  let data = raw;
  if (typeof raw === "string") {
    data = extractJsonObject(raw);
    if (!data) {
      // Plain text fallback → treat as final answer content
      const text = raw.trim();
      if (!text) return null;
      return { action: "final_answer", content: text };
    }
  }

  if (typeof data !== "object" || data == null) return null;

  const action = String(data.action || data.type || data.decision || "").trim().toLowerCase();

  if (action === "tool_call" || action === "tool" || action === "call_tool") {
    const tool = String(data.tool || data.toolId || data.name || "").trim();
    if (!tool) return null;

    let args = data.args || data.arguments || data.parameters || {};
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        args = { input: args };
      }
    }
    if (typeof args !== "object" || args == null || Array.isArray(args)) {
      args = {};
    }

    return {
      action: "tool_call",
      tool,
      args,
      reason: data.reason ? String(data.reason) : undefined
    };
  }

  if (
    action === "final_answer" ||
    action === "final" ||
    action === "answer" ||
    action === "complete"
  ) {
    const content =
      data.content ??
      data.answer ??
      data.output ??
      data.text ??
      "";
    return {
      action: "final_answer",
      content: typeof content === "string" ? content : JSON.stringify(content, null, 2)
    };
  }

  // Some models return content without action
  if (typeof data.content === "string" && data.content.trim()) {
    return { action: "final_answer", content: data.content.trim() };
  }

  return null;
}

export async function askLLM(
  prompt,
  {
    temperature = 0.25,
    jsonMode = false,
    systemMessage = "You are a reliable AI assistant."
  } = {}
) {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const requestData = {
      model: config.model,
      temperature,
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: prompt
        }
      ]
    };

    if (jsonMode) {
      requestData.response_format = {
        type: "json_object"
      };
    }

    const response = await client.chat.completions.create(requestData);
    return response.choices[0].message.content;
  } catch (error) {
    if (isNetworkError(error)) {
      logNetworkFallback(error);
      return null;
    }

    throw error;
  }
}

/**
 * Ask the LLM for a structured tool-calling decision.
 * Returns a normalized decision object, or null for demo/offline fallback.
 */
export async function askLLMForToolDecision(
  prompt,
  {
    systemMessage = "You are a reliable AI assistant that returns JSON tool decisions.",
    tools = [],
    temperature = 0.3
  } = {}
) {
  const toolsHint = tools.length
    ? `\nAllowed tool ids: ${tools.map((tool) => tool.id).join(", ")}.`
    : "\nNo tools are allowed; you must return final_answer.";

  const raw = await askLLM(`${prompt}${toolsHint}`, {
    temperature,
    jsonMode: true,
    systemMessage
  });

  if (!raw) return null;

  const decision = normalizeToolDecision(raw);
  return decision;
}
