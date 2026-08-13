import OpenAI from "openai";
import { config } from "../config/config.js";
import { recordUsage } from "./usageScope.js";

let connectionWarningShown = false;
let lastLlmError = null;

function getClient() {
  if (!config.groqKey) return null;

  return new OpenAI({
    apiKey: config.groqKey,
    baseURL: "https://api.groq.com/openai/v1"
  });
}

export function getLastLlmError() {
  return lastLlmError;
}

export function isLlmConfigured() {
  return Boolean(config.groqKey);
}

function isNetworkError(error) {
  const errMsg = error?.message || "";
  const name = error?.name || "";
  return (
    errMsg.includes("ENOTFOUND") ||
    errMsg.includes("ECONNREFUSED") ||
    errMsg.includes("ECONNRESET") ||
    errMsg.includes("ETIMEDOUT") ||
    errMsg.includes("fetch failed") ||
    errMsg.includes("Connection error") ||
    errMsg.includes("network") ||
    name === "APIConnectionError" ||
    error?.code === "ECONNREFUSED" ||
    error?.code === "ENOTFOUND" ||
    error?.code === "ETIMEDOUT"
  );
}

function isRecoverableApiError(error) {
  const status = error?.status || error?.response?.status;
  const errMsg = (error?.message || "").toLowerCase();

  // Treat rate limits / overloaded / temporary 5xx as recoverable → fallback
  if (status === 429 || status === 503 || status === 502 || status === 500) {
    return true;
  }
  if (
    errMsg.includes("rate limit") ||
    errMsg.includes("overloaded") ||
    errMsg.includes("try again") ||
    errMsg.includes("timeout")
  ) {
    return true;
  }

  return false;
}

function logLlmFallback(error, reason) {
  lastLlmError = {
    reason,
    message: error?.message || String(error || reason),
    status: error?.status || error?.response?.status || null,
    at: new Date().toISOString()
  };

  const errMsg = lastLlmError.message;
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚠️  Groq LLM call failed — temporary fallback");
  console.log("   Reason: " + reason);
  console.log("   Error: " + String(errMsg).split("\n")[0]);
  if (lastLlmError.status) {
    console.log("   Status: " + lastLlmError.status);
  }
  console.log("   Check: GROQ_API_KEY, model name, rate limits, network");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
}

function logNetworkFallback(error) {
  if (!connectionWarningShown) {
    connectionWarningShown = true;
  }
  logLlmFallback(error, "network");
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
 */
export function normalizeToolDecision(raw) {
  if (!raw) return null;

  let data = raw;
  if (typeof raw === "string") {
    data = extractJsonObject(raw);
    if (!data) {
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

  if (typeof data.content === "string" && data.content.trim()) {
    return { action: "final_answer", content: data.content.trim() };
  }

  // Model sometimes returns tool fields without action
  if (data.tool || data.toolId) {
    return normalizeToolDecision({
      action: "tool_call",
      tool: data.tool || data.toolId,
      args: data.args || data.arguments || {},
      reason: data.reason
    });
  }

  return null;
}

/**
 * Extract usage metadata from a provider response and push it into the
 * active per-step usage scope (see usageScope.js). Never throws — usage
 * capture must not break the LLM path, and outside a scope it is a no-op.
 * Failed requests never reach this, so no invalid usage is recorded.
 */
function captureUsage(response, startedMs) {
  try {
    const usage = response?.usage || null;
    const model = response?.model || config.model;
    if (!usage) {
      // Provider omitted usage metadata — record the call, flag tokens unknown.
      recordUsage({ kind: "llm", model, usageKnown: false, durationMs: Date.now() - startedMs });
      return;
    }
    recordUsage({
      kind: "llm",
      model,
      inputTokens: usage.prompt_tokens ?? null,
      outputTokens: usage.completion_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
      durationMs: Date.now() - startedMs
    });
  } catch {
    // intentionally swallowed — observability only
  }
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
    lastLlmError = {
      reason: "missing_key",
      message: "GROQ_API_KEY is not configured",
      status: null,
      at: new Date().toISOString()
    };
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

    const startedMs = Date.now();
    const response = await client.chat.completions.create(requestData);
    captureUsage(response, startedMs);
    const content = response.choices?.[0]?.message?.content ?? null;

    if (content != null) {
      lastLlmError = null;
    }

    return content;
  } catch (error) {
    // Some Groq models reject json_object — retry once without it
    const errMsg = (error?.message || "").toLowerCase();
    if (
      jsonMode &&
      (errMsg.includes("json") || errMsg.includes("response_format") || error?.status === 400)
    ) {
      try {
        console.warn("[llm] json_mode rejected — retrying without response_format");
        const retryStartedMs = Date.now();
        const retry = await client.chat.completions.create({
          model: config.model,
          temperature,
          messages: [
            {
              role: "system",
              content: `${systemMessage}\n\nReturn valid JSON only. No markdown fences.`
            },
            {
              role: "user",
              content: prompt
            }
          ]
        });
        captureUsage(retry, retryStartedMs);
        lastLlmError = null;
        return retry.choices?.[0]?.message?.content ?? null;
      } catch (retryError) {
        error = retryError;
      }
    }

    if (isNetworkError(error)) {
      logNetworkFallback(error);
      return null;
    }

    if (isRecoverableApiError(error)) {
      logLlmFallback(error, "recoverable_api_error");
      return null;
    }

    // Auth / bad request — log clearly, still fallback so UI doesn't hard-crash
    logLlmFallback(error, "api_error");
    return null;
  }
}

/**
 * Ask the LLM for a structured tool-calling decision.
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
    ? `\nAllowed tool ids: ${tools.map((tool) => tool.id).join(", ")}.\nReturn ONLY a JSON object.`
    : "\nNo tools are allowed; you must return final_answer as JSON.";

  const raw = await askLLM(`${prompt}${toolsHint}`, {
    temperature,
    jsonMode: true,
    systemMessage
  });

  if (!raw) return null;

  const decision = normalizeToolDecision(raw);
  if (!decision) {
    console.warn("[llm] tool decision parse failed. Raw snippet:", String(raw).slice(0, 200));
  }
  return decision;
}
