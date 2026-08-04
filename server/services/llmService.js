import OpenAI from "openai";
import { config } from "../config/config.js";

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
}