import { askLLM } from "../../services/llmService.js";
import { editorPrompt } from "./editorPrompt.js";

function demoReview() {
  return {
    decision: "approved",
    qualityScore: 85,
    summary: "The demo draft covers the topic adequately. In production with a real LLM, the Editor Agent would provide detailed feedback on the content quality, structure, and completeness.",
    strengths: [
      "Basic structure is present",
      "Covers main topics",
      "Appropriate tone for the target audience"
    ],
    missingPoints: [
      "Could benefit from more specific examples",
      "More detailed explanations would improve clarity"
    ],
    weaknesses: [],
    revisionInstructions: [],
    factCheckWarnings: [],
    mode: "demo"
  };
}

export async function reviewContent(input) {
  const prompt = editorPrompt(input);

  const rawReview = await askLLM(prompt, {
    temperature: 0.2,
    jsonMode: true,
    systemMessage: `
You are a strict and fair Editor Agent.
Return only valid JSON.
Give practical, specific, and actionable feedback.
Never invent sources, citations, facts, or errors.
`
  });

  if (!rawReview) {
    // Return demo review when no LLM is configured
    return demoReview();
  }

  let review;

  try {
    review = JSON.parse(rawReview);
  } catch {
    throw new Error(
      "Editor Agent returned invalid JSON. Please run the pipeline again."
    );
  }

  validateEditorReview(review);

  return {
    ...review,
    mode: "llm"
  };
}

function validateEditorReview(review) {
  const validDecisions = ["approved", "needs_revision"];

  if (!validDecisions.includes(review.decision)) {
    throw new Error(
      "Editor Agent response has an invalid decision."
    );
  }

  if (
    typeof review.qualityScore !== "number" ||
    review.qualityScore < 0 ||
    review.qualityScore > 100
  ) {
    throw new Error(
      "Editor Agent response has an invalid quality score."
    );
  }

  if (!Array.isArray(review.strengths)) {
    throw new Error(
      "Editor Agent response must include strengths."
    );
  }

  if (!Array.isArray(review.weaknesses)) {
    throw new Error(
      "Editor Agent response must include weaknesses."
    );
  }

  if (!Array.isArray(review.revisionInstructions)) {
    throw new Error(
      "Editor Agent response must include revision instructions."
    );
  }
}
