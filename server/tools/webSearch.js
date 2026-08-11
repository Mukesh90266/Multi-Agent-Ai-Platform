/**
 * Web Search tool implementation.
 * Uses a lightweight public search endpoint when network is available,
 * otherwise returns a deterministic demo result so pipelines still work.
 */

function buildDemoSearchResult(query, context = {}) {
  const topic = context?.input?.topic || query;
  return {
    query,
    mode: "demo",
    provider: "demo",
    resultCount: 3,
    results: [
      {
        title: `${topic} — overview and key concepts`,
        url: "https://example.com/demo/overview",
        snippet: `Demo search result summarizing core ideas related to "${query}". Configure a live search provider for real web results.`
      },
      {
        title: `${topic} — practical guide`,
        url: "https://example.com/demo/guide",
        snippet: `A practical walkthrough covering common use cases, limitations, and best practices for "${query}".`
      },
      {
        title: `${topic} — recent context (demo)`,
        url: "https://example.com/demo/recent",
        snippet: `Placeholder for time-sensitive information about "${query}". Verify dates and statistics with primary sources before publishing.`
      }
    ],
    summary: `Demo web search completed for "${query}". ${3} sample results returned because no live search provider responded.`
  };
}

async function tryDuckDuckGoInstantAnswer(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Search HTTP ${response.status}`);
  }

  const data = await response.json();
  const results = [];

  if (data.AbstractText) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL || "",
      snippet: data.AbstractText
    });
  }

  for (const topic of data.RelatedTopics || []) {
    if (topic.Text && topic.FirstURL) {
      results.push({
        title: topic.Text.split(" - ")[0] || topic.Text.slice(0, 80),
        url: topic.FirstURL,
        snippet: topic.Text
      });
    } else if (Array.isArray(topic.Topics)) {
      for (const nested of topic.Topics) {
        if (nested.Text && nested.FirstURL) {
          results.push({
            title: nested.Text.split(" - ")[0] || nested.Text.slice(0, 80),
            url: nested.FirstURL,
            snippet: nested.Text
          });
        }
      }
    }
    if (results.length >= 6) break;
  }

  if (!results.length) {
    return null;
  }

  return {
    query,
    mode: "live",
    provider: "duckduckgo",
    resultCount: results.length,
    results: results.slice(0, 6),
    summary: `Found ${Math.min(results.length, 6)} result(s) for "${query}".`
  };
}

/**
 * @param {{ query?: string, maxResults?: number }} args
 * @param {object} context - pipeline agent context (optional)
 */
export async function executeWebSearch(args = {}, context = {}) {
  const query = String(args.query || args.q || context?.input?.topic || "").trim();

  if (!query) {
    return {
      query: "",
      mode: "error",
      provider: "none",
      resultCount: 0,
      results: [],
      summary: "Web search failed: a non-empty query is required.",
      error: "Missing query"
    };
  }

  try {
    const live = await tryDuckDuckGoInstantAnswer(query);
    if (live) {
      if (args.maxResults && Number.isInteger(Number(args.maxResults))) {
        const max = Math.min(Math.max(Number(args.maxResults), 1), 10);
        live.results = live.results.slice(0, max);
        live.resultCount = live.results.length;
        live.summary = `Found ${live.resultCount} result(s) for "${query}".`;
      }
      return live;
    }
  } catch {
    // fall through to demo
  }

  return buildDemoSearchResult(query, context);
}

export const webSearchToolDefinition = {
  id: "web_search",
  name: "Web Search",
  description:
    "Search the web for current information, facts, news, definitions, or sources related to a query. Use when the user input needs up-to-date or external information that is not already in the conversation.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query derived from the user input and agent task."
      },
      maxResults: {
        type: "integer",
        description: "Optional maximum number of results (1-10)."
      }
    },
    required: ["query"]
  },
  execute: executeWebSearch
};
