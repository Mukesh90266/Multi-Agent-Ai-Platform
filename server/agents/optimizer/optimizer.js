import { askLLM } from '../../services/llmService.js';
import { optimizerPrompt } from './optimizerPrompt.js';

function demoOptimize({ topic, audience, draft }) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => !['a','an','the','and','or','but','in','on','at','to','for','of','with','by'].includes(w))
    .slice(0, 6)
    .join('-');

  const primaryKeyword = topic.toLowerCase();

  const topicWords = topic.split(/\s+/).filter(Boolean);
  const secondaryKeywords = [
    `${primaryKeyword} tutorial`,
    `${primaryKeyword} examples`,
    `learn ${primaryKeyword}`,
    `${primaryKeyword} best practices`,
    `how to use ${primaryKeyword}`,
    `${primaryKeyword} guide`
  ];

  // Add basic formatting to the draft if it lacks structure
  let optimizedContent = draft || '';

  // Ensure there's an H1 if missing
  if (!optimizedContent.startsWith('#')) {
    optimizedContent = `# ${topic}\n\n${optimizedContent}`;
  }

  const h2Matches = optimizedContent.match(/^## (.+)$/gm) || [];
  const h2Headings = h2Matches.map(h => h.replace(/^## /, ''));
  const h3Matches = optimizedContent.match(/^### (.+)$/gm) || [];
  const h3Headings = h3Matches.map(h => h.replace(/^### /, ''));

  const tableOfContents = h2Headings.map((h, i) => `${i + 1}. ${h}`);

  const metaTitle = topic.length <= 50
    ? `${topic} | Complete Guide`
    : `${topicWords.slice(0, 3).join(' ')} Guide`;

  const metaDescription = `Learn about ${topic} with practical examples and clear explanations. A comprehensive guide for ${audience}.`;

  return {
    optimizedContent,
    suggestedTitle: `Comprehensive Guide: ${topic}`,
    metaTitle: metaTitle.length > 60 ? metaTitle.slice(0, 57) + '...' : metaTitle,
    metaDescription: metaDescription.length > 160 ? metaDescription.slice(0, 157) + '...' : metaDescription,
    slug,
    headings: {
      h1: topic,
      h2: h2Headings,
      h3: h3Headings
    },
    tableOfContents,
    seo: {
      primaryKeyword,
      secondaryKeywords,
      keywordDensity: { [primaryKeyword]: '0.8%' },
      densityWarning: null
    },
    readabilityScore: 72,
    mode: 'demo'
  };
}

export async function optimizeContent(input) {
  const prompt = optimizerPrompt(input);

  const raw = await askLLM(prompt, {
    temperature: 0.3,
    jsonMode: true,
    systemMessage: `
You are an SEO & Formatting Optimizer Agent.
Return valid JSON only.
Never fabricate statistics, search volumes, or ranking data.
Produce practical, accurate SEO recommendations.
`
  });

  if (!raw) return demoOptimize(input);

  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error('Optimizer response was not valid JSON. Please retry.');
  }

  // Basic validation
  if (!result.optimizedContent || typeof result.optimizedContent !== 'string') {
    throw new Error('Optimizer must return optimizedContent as a string.');
  }

  if (!result.seo || !result.seo.primaryKeyword) {
    throw new Error('Optimizer must return seo.primaryKeyword.');
  }

  if (
    typeof result.readabilityScore !== 'number' ||
    result.readabilityScore < 0 ||
    result.readabilityScore > 100
  ) {
    result.readabilityScore = 70; // sensible default
  }

  return {
    ...result,
    mode: 'llm'
  };
}
