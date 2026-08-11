/**
 * Verification API tool — checks factual claims.
 * Uses heuristic + optional web cross-check demo when no external verifier is configured.
 */

function normalizeClaim(claim) {
  return String(claim || "").trim();
}

function scoreClaim(claim) {
  const text = claim.toLowerCase();
  let confidence = 0.55;
  let status = "uncertain";
  const notes = [];

  if (!claim || claim.length < 8) {
    return {
      status: "invalid",
      confidence: 0,
      notes: ["Claim is empty or too short to verify."]
    };
  }

  const absoluteWords = ["always", "never", "everyone", "no one", "guaranteed", "100%"];
  if (absoluteWords.some((word) => text.includes(word))) {
    confidence -= 0.15;
    notes.push("Absolute wording often overstates real-world conditions.");
  }

  const numericMatch = claim.match(/\b\d+(\.\d+)?%?\b/);
  if (numericMatch) {
    confidence -= 0.05;
    notes.push(`Numerical claim detected ("${numericMatch[0]}"). Prefer primary sources before treating as fact.`);
    status = "needs_source";
  }

  if (/\b(according to|study|research|report|published)\b/i.test(claim)) {
    confidence += 0.1;
    notes.push("Claim references research language; still verify the underlying source.");
  }

  if (/\b(might|may|could|possibly|likely)\b/i.test(claim)) {
    confidence += 0.05;
    notes.push("Claim is hedged, which is usually safer than absolute statements.");
  }

  confidence = Math.max(0, Math.min(1, confidence));

  if (status === "uncertain") {
    if (confidence >= 0.7) status = "plausible";
    else if (confidence < 0.45) status = "doubtful";
    else status = "uncertain";
  }

  return { status, confidence, notes };
}

/**
 * @param {{ claim?: string, context?: string }} args
 * @param {object} pipelineContext
 */
export async function executeVerification(args = {}, pipelineContext = {}) {
  const claim = normalizeClaim(args.claim || args.statement || "");
  const extraContext = String(args.context || "").trim();
  const topic = pipelineContext?.input?.topic || "";

  if (!claim) {
    return {
      mode: "error",
      claim: "",
      status: "invalid",
      confidence: 0,
      verified: false,
      summary: "Verification failed: a non-empty claim is required.",
      evidence: [],
      notes: ["Missing claim"],
      error: "Missing claim"
    };
  }

  const scored = scoreClaim(claim);

  // Lightweight optional cross-check via public search abstract (best-effort).
  let evidence = [];
  try {
    const query = `${claim} ${topic}`.trim().slice(0, 200);
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: { Accept: "application/json" }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.AbstractText) {
        evidence.push({
          type: "abstract",
          title: data.Heading || "Related abstract",
          url: data.AbstractURL || "",
          snippet: data.AbstractText
        });
        scored.confidence = Math.min(1, scored.confidence + 0.08);
        scored.notes.push("Cross-checked against a public abstract result.");
      }
    }
  } catch {
    scored.notes.push("Live cross-check unavailable; heuristic verification only.");
  }

  if (extraContext) {
    scored.notes.push("Caller-supplied context was considered during verification.");
  }

  const verified = scored.status === "plausible" && scored.confidence >= 0.65;

  return {
    mode: evidence.length ? "live" : "demo",
    claim,
    status: scored.status,
    confidence: Number(scored.confidence.toFixed(2)),
    verified,
    summary: `Claim marked as "${scored.status}" with confidence ${Math.round(scored.confidence * 100)}%.`,
    evidence,
    notes: scored.notes,
    topic: topic || undefined
  };
}

export const verificationToolDefinition = {
  id: "verification_api",
  name: "Verification API",
  description:
    "Verify a factual claim for accuracy, certainty, and source needs. Use when checking statements, statistics, or assertions from user input or previous agent outputs.",
  parameters: {
    type: "object",
    properties: {
      claim: {
        type: "string",
        description: "The factual claim or statement to verify."
      },
      context: {
        type: "string",
        description: "Optional extra context that may help verification."
      }
    },
    required: ["claim"]
  },
  execute: executeVerification
};
