import { askLLM } from '../../services/llmService.js';
import { optimizerPrompt } from './optimizerPrompt.js';

function demoOptimize({ topic, audience, draft }) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => !['a','an','the','and','or','but','in','on','at','to','for','of','with','by','is','it','that','this','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','can','could'].includes(w))
    .slice(0, 6)
    .join('-');

  const primaryKeyword = topic.toLowerCase().replace(/[^\w\s]/g, '').trim();

  const secondaryKeywords = [
    `${primaryKeyword} tutorial`,
    `${primaryKeyword} examples`,
    `learn ${primaryKeyword}`,
    `${primaryKeyword} best practices`,
    `how to use ${primaryKeyword}`,
    `${primaryKeyword} for beginners`,
    `${primaryKeyword} guide`
  ];

  // Add basic formatting to the draft
  let optimizedContent = draft || '';

  // Ensure there's an H1 if missing
  if (!optimizedContent.startsWith('#')) {
    optimizedContent = `# ${topic}\n\n${optimizedContent}`;
  }

  // Extract headings
  const h2Matches = optimizedContent.match(/^## (.+)$/gm) || [];
  const h2Headings = h2Matches.map(h => h.replace(/^## /, ''));
  const h3Matches = optimizedContent.match(/^### (.+)$/gm) || [];
  const h3Headings = h3Matches.map(h => h.replace(/^### /, ''));
  const h1Match = optimizedContent.match(/^# (.+)$/m);
  const h1Heading = h1Match ? h1Match[1] : topic;

  const tableOfContents = h2Headings.map((h, i) => `${i + 1}. ${h}`);

  // Meta title: 50-60 chars
  let metaTitle = `${topic} | Complete Guide`;
  if (metaTitle.length < 50) {
    metaTitle = `${topic} | Complete Guide for ${audience}`;
  }
  if (metaTitle.length > 60) {
    metaTitle = metaTitle.slice(0, 57) + '...';
  }

  // Meta description: 140-160 chars
  let metaDescription = `Learn about ${topic} with practical examples and clear explanations. A comprehensive guide for ${audience} covering key concepts, best practices, and real-world applications.`;
  if (metaDescription.length > 160) {
    metaDescription = metaDescription.slice(0, 157) + '...';
  }
  if (metaDescription.length < 140) {
    metaDescription += ` Start mastering ${topic} today with this in-depth resource.`;
    if (metaDescription.length > 160) {
      metaDescription = metaDescription.slice(0, 157) + '...';
    }
  }

  // Keyword density calculation
  const totalWords = optimizedContent.split(/\s+/).filter(Boolean).length;
  const primaryCount = (optimizedContent.toLowerCase().match(new RegExp(primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
  const primaryDensity = totalWords > 0 ? ((primaryCount / totalWords) * 100).toFixed(1) : '0.0';
  const densityPercent = `${primaryDensity}%`;
  const densityValue = parseFloat(primaryDensity);

  let densityWarning = null;
  if (densityValue < 0.8) {
    densityWarning = `Primary keyword density is ${densityPercent}, which is below the recommended minimum of 0.8%. Consider adding the keyword naturally a few more times.`;
  } else if (densityValue > 2.0) {
    densityWarning = `Primary keyword density is ${densityPercent}, which exceeds the recommended maximum of 2%. Reduce keyword repetition to avoid over-optimization.`;
  }

  return {
    optimizedContent,
    suggestedTitle: `${topic}: The Complete Guide for ${audience}`,
    metaTitle,
    metaDescription,
    slug,
    headings: {
      h1: h1Heading,
      h2: h2Headings,
      h3: h3Headings
    },
    tableOfContents,
    seo: {
      primaryKeyword,
      secondaryKeywords,
      keywordDensity: { [primaryKeyword]: densityPercent },
      densityWarning
    },
    readabilityScore: 72,
    mode: 'demo'
  };
}

function validateOptimizerOutput(result) {
  const errors = [];

  if (!result.optimizedContent || typeof result.optimizedContent !== 'string') {
    errors.push('optimizedContent must be a non-empty string.');
  }

  if (!result.suggestedTitle || typeof result.suggestedTitle !== 'string') {
    errors.push('suggestedTitle must be a non-empty string.');
  }

  // metaTitle: 50-60 chars
  if (typeof result.metaTitle !== 'string') {
    errors.push('metaTitle must be a string.');
  } else if (result.metaTitle.length < 50 || result.metaTitle.length > 60) {
    errors.push(`metaTitle must be 50-60 characters (got ${result.metaTitle.length}).`);
  }

  // metaDescription: 140-160 chars
  if (typeof result.metaDescription !== 'string') {
    errors.push('metaDescription must be a string.');
  } else if (result.metaDescription.length < 140 || result.metaDescription.length > 160) {
    errors.push(`metaDescription must be 140-160 characters (got ${result.metaDescription.length}).`);
  }

  // slug
  if (!result.slug || typeof result.slug !== 'string') {
    errors.push('slug must be a non-empty string.');
  }

  // headings
  if (!result.headings || typeof result.headings !== 'object') {
    errors.push('headings must be an object with h1, h2, h3.');
  } else {
    if (typeof result.headings.h1 !== 'string') errors.push('headings.h1 must be a string.');
    if (!Array.isArray(result.headings.h2)) errors.push('headings.h2 must be an array.');
    if (!Array.isArray(result.headings.h3)) errors.push('headings.h3 must be an array.');
  }

  // tableOfContents
  if (!Array.isArray(result.tableOfContents)) {
    errors.push('tableOfContents must be an array.');
  }

  // seo
  if (!result.seo || typeof result.seo !== 'object') {
    errors.push('seo must be an object.');
  } else {
    if (!result.seo.primaryKeyword || typeof result.seo.primaryKeyword !== 'string') {
      errors.push('seo.primaryKeyword must be a non-empty string.');
    }
    if (!Array.isArray(result.seo.secondaryKeywords)) {
      errors.push('seo.secondaryKeywords must be an array.');
    } else if (result.seo.secondaryKeywords.length < 5 || result.seo.secondaryKeywords.length > 8) {
      errors.push(`seo.secondaryKeywords must have 5-8 items (got ${result.seo.secondaryKeywords.length}).`);
    }
    if (typeof result.seo.keywordDensity !== 'object') {
      errors.push('seo.keywordDensity must be an object.');
    }
  }

  // readabilityScore: 0-100
  if (typeof result.readabilityScore !== 'number' || result.readabilityScore < 0 || result.readabilityScore > 100) {
    errors.push('readabilityScore must be a number between 0 and 100.');
  }

  return errors;
}

export async function optimizeContent(input) {
  const prompt = optimizerPrompt(input);

  const raw = await askLLM(prompt, {
    temperature: 0.3,
    jsonMode: true,
    systemMessage: `
You are an expert SEO & Formatting Optimizer Agent.
Return ONLY valid JSON. No markdown. No explanations.
Never fabricate statistics, search volumes, or ranking data.
Produce practical, accurate SEO recommendations.
metaTitle: 50-60 characters.
metaDescription: 140-160 characters.
secondaryKeywords: 5-8 items.
keywordDensity: 0.8%-2% range, warn if outside.
`
  });

  if (!raw) return demoOptimize(input);

  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error('Optimizer response was not valid JSON. Please retry.');
  }

  // Validate the output against the spec
  const validationErrors = validateOptimizerOutput(result);
  if (validationErrors.length > 0) {
    // Try to auto-fix common issues before throwing
    result = autoFix(result, input);
    const recheck = validateOptimizerOutput(result);
    if (recheck.length > 0) {
      throw new Error(`Optimizer output validation failed: ${recheck.join(' ')}`);
    }
  }

  return {
    ...result,
    mode: 'llm'
  };
}

function autoFix(result, input) {
  // Fix metaTitle if wrong length
  if (typeof result.metaTitle === 'string') {
    if (result.metaTitle.length < 50) {
      result.metaTitle = result.metaTitle + ` | ${input.contentType || 'Guide'}`;
    }
    if (result.metaTitle.length > 60) {
      result.metaTitle = result.metaTitle.slice(0, 57) + '...';
    }
  } else {
    result.metaTitle = `${input.topic} | Complete Guide`;
  }

  // Fix metaDescription if wrong length
  if (typeof result.metaDescription === 'string') {
    if (result.metaDescription.length > 160) {
      result.metaDescription = result.metaDescription.slice(0, 157) + '...';
    }
    if (result.metaDescription.length < 140) {
      result.metaDescription += ` Discover more about ${input.topic.toLowerCase()} in this comprehensive resource.`;
      if (result.metaDescription.length > 160) {
        result.metaDescription = result.metaDescription.slice(0, 157) + '...';
      }
    }
  } else {
    result.metaDescription = `Learn about ${input.topic} with practical examples and clear explanations. A comprehensive guide for ${input.audience || 'readers'}.`;
  }

  // Fix secondaryKeywords count
  if (Array.isArray(result.seo?.secondaryKeywords)) {
    const kws = result.seo.secondaryKeywords;
    const pk = result.seo?.primaryKeyword || input.topic.toLowerCase();
    while (kws.length < 5) {
      kws.push(`${pk} tip ${kws.length + 1}`);
    }
    if (kws.length > 8) {
      kws.splice(8);
    }
  }

  // Fix readabilityScore
  if (typeof result.readabilityScore !== 'number' || result.readabilityScore < 0 || result.readabilityScore > 100) {
    result.readabilityScore = 72;
  }

  // Fix headings structure
  if (!result.headings) {
    result.headings = { h1: '', h2: [], h3: [] };
  }
  if (typeof result.headings.h1 !== 'string') result.headings.h1 = result.suggestedTitle || input.topic;
  if (!Array.isArray(result.headings.h2)) result.headings.h2 = [];
  if (!Array.isArray(result.headings.h3)) result.headings.h3 = [];

  // Fix tableOfContents
  if (!Array.isArray(result.tableOfContents)) {
    result.tableOfContents = result.headings.h2.map((h, i) => `${i + 1}. ${h}`);
  }

  return result;
}
