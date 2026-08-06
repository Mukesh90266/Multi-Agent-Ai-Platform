import { askLLM } from "../../services/llmService.js";
import { editorPrompt } from "./editorPrompt.js";

function demoReview() {
  return {
    decision: "approved",
    qualityScore: 80,  // 80 threshold for approval
    summary: "The demo draft meets the minimum quality threshold. Approved for publication.",
    strengths: [
      "Basic structure is present",
      "Covers main topics",
      "Appropriate tone for the target audience"
    ],
    missingPoints: [],  // No missing points when approved
    weaknesses: [],
    revisionInstructions: [],  // No revision instructions when approved
    factCheckWarnings: [],
    mode: "demo"
  };
}

// Demo review that returns needs_revision for testing the loop
function demoReviewNeedsRevision() {
  return {
    decision: "needs_revision",
    qualityScore: 58,  // Below 80 threshold
    summary: "The draft needs improvements to reach the 80 quality threshold.",
    strengths: [
      "Good topic coverage",
      "Clear structure"
    ],
    missingPoints: [
      "Missing practical code examples",
      "No explanation of common pitfalls"
    ],
    weaknesses: [
      {
        section: "Introduction",
        severity: "medium",
        issue: "Too generic, doesn't grab attention",
        suggestion: "Start with a compelling hook or real-world problem"
      },
      {
        section: "Content",
        severity: "high",
        issue: "Lacks specific code examples",
        suggestion: "Add working code snippets with explanations"
      }
    ],
    revisionInstructions: [
      "Add at least 2 practical code examples with explanations",
      "Include a section on common mistakes and how to avoid them",
      "Improve the introduction to be more engaging"
    ],
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
You are a strict, helpful, and professional Editor Agent.
Return only valid JSON.
Give practical, specific, and actionable feedback.
Never invent sources, citations, facts, or errors.
`
  });

  if (!rawReview) {
    // Return demo review - use needs_revision occasionally for testing
    // For demo purposes, we alternate to show the revision loop working
    const shouldRevise = input.iteration && input.iteration < 2;
    return shouldRevise ? demoReviewNeedsRevision() : demoReview();
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
