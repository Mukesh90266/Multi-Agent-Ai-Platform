export function validatePipelineInput(body = {}) {
  const topic = String(body.topic || "").trim();

  if (topic.length < 3) {
    throw new Error("Topic must be at least 3 characters long.");
  }

  if (topic.length > 300) {
    throw new Error("Topic must be less than 300 characters long.");
  }

  const wordCount = Number(body.wordCount || 800);

  if (!Number.isInteger(wordCount) || wordCount < 200 || wordCount > 3000) {
    throw new Error("Word count must be between 200 and 3000.");
  }

  return {
    topic,
    contentType: String(body.contentType || "Blog post").trim(),
    audience: String(body.audience || "General audience").trim(),
    tone: String(body.tone || "Educational").trim(),
    wordCount
  };
}
export function validateResearch(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.keyPoints) || !Array.isArray(data.suggestedOutline)) throw new Error('Researcher returned an invalid structured response.');
  return data;
}
