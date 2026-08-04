import { askLLM } from "../../services/llmService.js";
import { writerPrompt } from "./writerPrompt.js";

export async function writeContent(input) {
  const prompt = writerPrompt(input);

  const draft = await askLLM(prompt, {
    temperature: 0.7,
    jsonMode: false,
    systemMessage: `
You are a skilled Writer Agent.
Write original, clear, useful content.
Return only the completed draft in Markdown format.
`
  });

  if (!draft || draft.trim().length < 100) {
    throw new Error(
      "Writer Agent generated an incomplete draft. Please run the pipeline again."
    );
  }

  return {
    content: draft.trim(),
    wordCount: draft.trim().split(/\s+/).filter(Boolean).length,
    mode: "llm"
  };
}