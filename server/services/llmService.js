import OpenAI from "openai";
import { config } from "../config/config.js";

let connectionWarningShown = false;

export async function askLLM(
  prompt,
  {
    temperature = 0.25,
    jsonMode = false,
    systemMessage = "You are a reliable AI assistant."
  } = {}
) {
  if (!config.groqKey) {
    return null;
  }

  try {
    const client = new OpenAI({
      apiKey: config.groqKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

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

    // Only Researcher and Editor will require strict JSON.
    if (jsonMode) {
      requestData.response_format = {
        type: "json_object"
      };
    }

    const response = await client.chat.completions.create(requestData);

    return response.choices[0].message.content;

  } catch (error) {
    const errMsg = error.message || "";
    const isNetworkError =
      errMsg.includes("ENOTFOUND") ||
      errMsg.includes("ECONNREFUSED") ||
      errMsg.includes("ECONNRESET") ||
      errMsg.includes("ETIMEDOUT") ||
      errMsg.includes("fetch failed") ||
      errMsg.includes("Connection error") ||
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND";

    if (isNetworkError) {
      if (!connectionWarningShown) {
        console.log("");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("⚠️  Groq API unreachable — running in DEMO MODE");
        console.log("   Error: " + errMsg.split("\n")[0]);
        console.log("   Demo mode uses built-in sample data for all 4 agents.");
        console.log("   To fix: Check internet connection / VPN / DNS settings");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("");
        connectionWarningShown = true;
      }
      return null; // Triggers demo mode in all agents
    }

    // Non-network errors (rate limit, bad request, etc.) — throw
    throw error;
  }
}
