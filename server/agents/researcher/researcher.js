import { askLLM } from '../../services/llmService.js';
import { validateResearch } from '../../utils/validator.js';
import { researcherPrompt } from './researcherPrompt.js';

function demoResearch({ topic, audience }) {
  return { topic, summary: `A research brief on ${topic}, prepared for ${audience}. Verify time-sensitive claims before publication.`, keyPoints: [`Define the scope and audience relevance of ${topic}.`, 'Explain core concepts before advanced details.', 'Use practical examples to make the subject understandable.', 'Present benefits, limitations, and responsible use.', 'Use reliable primary or official sources for factual claims.'], definitions: [{ term: 'Scope', meaning: 'The boundaries of what the content will cover.' }, { term: 'Primary source', meaning: 'An original, authoritative source of information.' }], suggestedOutline: ['Introduction and context', 'Core concepts', 'Practical examples or applications', 'Benefits and limitations', 'Conclusion and next steps'], examples: [`A beginner-friendly real-world use case involving ${topic}.`, 'A comparison that explains the concept in familiar terms.'], sources: [{ title: 'Source verification required', url: '', note: 'Demo mode does not claim a live web source. Add verified official sources before publishing.' }], factsToVerify: ['Current standards, versions, regulations, or statistics related to the topic.', 'Any numerical claim, quotation, or date used in the final content.'], mode: 'demo' };
}
export async function research(input) {
 const raw = await askLLM(researcherPrompt(input), {
  temperature: 0.25,
  jsonMode: true,
  systemMessage: `
You are a reliable Researcher Agent.
Return valid JSON only.
Never fabricate sources, URLs, citations, statistics, quotations, or dates.
`
});
  if (!raw) return demoResearch(input);
  let result;
  try { result = JSON.parse(raw); } catch { throw new Error('Researcher response was not valid JSON. Please retry.'); }
  return { ...validateResearch(result), mode: 'llm' };
}
