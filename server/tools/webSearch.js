/**
 * Web Search tool — tries multiple live providers before any fallback.
 * Demo results are only used when every live provider fails.
 */

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&");
}

function stripTags(html) {
  return decodeHtmlEntities(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueResults(results, max = 6) {
  const seen = new Set();
  const unique = [];

  for (const item of results) {
    const key = (item.url || item.title || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({
      title: item.title || "Untitled",
      url: item.url || "",
      snippet: item.snippet || ""
    });
    if (unique.length >= max) break;
  }

  return unique;
}

function buildFallbackSearchResult(query, context = {}, reason = "") {
  const topic = context?.input?.topic || query;
  return {
    query,
    mode: "fallback",
    provider: "none",
    resultCount: 0,
    results: [],
    liveUnavailable: true,
    reason: reason || "No live search provider returned results.",
    guidance:
      "Live web results were unavailable. Use your trained knowledge to answer carefully. Clearly separate known facts from uncertainty. Do NOT say you are in Demo Mode. Do NOT invent URLs or pretend a live search succeeded.",
    summary: `No live web results for "${topic}". ${reason || "Providers returned empty."} Answer from model knowledge and mark uncertainty.`
  };
}

async function trySerper(query, maxResults = 6) {
  const apiKey = process.env.SERPER_API_KEY || process.env.SERPER_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ q: query, num: maxResults })
  });

  if (!response.ok) {
    throw new Error(`Serper HTTP ${response.status}`);
  }

  const data = await response.json();
  const organic = Array.isArray(data.organic) ? data.organic : [];
  const results = organic.map((item) => ({
    title: item.title || query,
    url: item.link || "",
    snippet: item.snippet || ""
  }));

  const unique = uniqueResults(results, maxResults);
  if (!unique.length) return null;

  return {
    query,
    mode: "live",
    provider: "serper",
    resultCount: unique.length,
    results: unique,
    summary: `Found ${unique.length} Serper result(s) for "${query}".`
  };
}

async function tryBrave(query, maxResults = 6) {
  const apiKey = process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;

  const url =
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}` +
    `&count=${maxResults}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Brave HTTP ${response.status}`);
  }

  const data = await response.json();
  const web = data.web?.results || [];
  const results = web.map((item) => ({
    title: item.title || query,
    url: item.url || "",
    snippet: item.description || ""
  }));

  const unique = uniqueResults(results, maxResults);
  if (!unique.length) return null;

  return {
    query,
    mode: "live",
    provider: "brave",
    resultCount: unique.length,
    results: unique,
    summary: `Found ${unique.length} Brave result(s) for "${query}".`
  };
}

async function tryDuckDuckGoInstantAnswer(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: "application/json",
      "User-Agent": "MultiAgentAiPlatform/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`DDG instant HTTP ${response.status}`);
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

  if (data.Answer) {
    results.push({
      title: "Direct answer",
      url: data.AbstractURL || "",
      snippet: stripTags(data.Answer)
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

  const unique = uniqueResults(results);
  if (!unique.length) return null;

  return {
    query,
    mode: "live",
    provider: "duckduckgo_instant",
    resultCount: unique.length,
    results: unique,
    summary: `Found ${unique.length} DuckDuckGo instant result(s) for "${query}".`
  };
}

async function tryDuckDuckGoHtml(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 (compatible; MultiAgentAiPlatform/1.0; +https://localhost)"
    }
  });

  if (!response.ok) {
    throw new Error(`DDG HTML HTTP ${response.status}`);
  }

  const html = await response.text();
  const results = [];

  // Classic DDG HTML result links
  const linkRegex =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\//gi;

  const links = [];
  let linkMatch = linkRegex.exec(html);
  while (linkMatch && links.length < 8) {
    links.push({
      url: decodeHtmlEntities(linkMatch[1]),
      title: stripTags(linkMatch[2])
    });
    linkMatch = linkRegex.exec(html);
  }

  const snippets = [];
  let snippetMatch = snippetRegex.exec(html);
  while (snippetMatch && snippets.length < 8) {
    snippets.push(stripTags(snippetMatch[1]));
    snippetMatch = snippetRegex.exec(html);
  }

  for (let i = 0; i < links.length; i += 1) {
    const href = links[i].url;
    results.push({
      title: links[i].title,
      url: href.startsWith("//") ? `https:${href}` : href,
      snippet: snippets[i] || ""
    });
  }

  const unique = uniqueResults(results);
  if (!unique.length) return null;

  return {
    query,
    mode: "live",
    provider: "duckduckgo_html",
    resultCount: unique.length,
    results: unique,
    summary: `Found ${unique.length} DuckDuckGo HTML result(s) for "${query}".`
  };
}

async function tryWikipedia(query) {
  const searchUrl =
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}` +
    `&limit=5&namespace=0&format=json&origin=*`;

  const searchResponse = await fetch(searchUrl, {
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: "application/json",
      "User-Agent": "MultiAgentAiPlatform/1.0"
    }
  });

  if (!searchResponse.ok) {
    throw new Error(`Wikipedia search HTTP ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const titles = searchData[1] || [];
  const descriptions = searchData[2] || [];
  const links = searchData[3] || [];

  if (!titles.length) return null;

  const results = [];

  for (let i = 0; i < Math.min(titles.length, 4); i += 1) {
    const title = titles[i];
    let snippet = descriptions[i] || "";
    const pageUrl = links[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

    // Enrich first hit with summary extract
    if (i === 0) {
      try {
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const summaryResponse = await fetch(summaryUrl, {
          signal: AbortSignal.timeout(6000),
          headers: {
            Accept: "application/json",
            "User-Agent": "MultiAgentAiPlatform/1.0"
          }
        });
        if (summaryResponse.ok) {
          const summary = await summaryResponse.json();
          if (summary.extract) snippet = summary.extract;
        }
      } catch {
        // keep short description
      }
    }

    results.push({
      title,
      url: pageUrl,
      snippet
    });
  }

  const unique = uniqueResults(results);
  if (!unique.length) return null;

  return {
    query,
    mode: "live",
    provider: "wikipedia",
    resultCount: unique.length,
    results: unique,
    summary: `Found ${unique.length} Wikipedia result(s) for "${query}".`
  };
}

/**
 * @param {{ query?: string, maxResults?: number }} args
 * @param {object} context
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

  const maxResults = args.maxResults && Number.isInteger(Number(args.maxResults))
    ? Math.min(Math.max(Number(args.maxResults), 1), 10)
    : 6;

  const providers = [
    { name: "serper", run: () => trySerper(query, maxResults) },
    { name: "brave", run: () => tryBrave(query, maxResults) },
    { name: "duckduckgo_instant", run: () => tryDuckDuckGoInstantAnswer(query) },
    { name: "duckduckgo_html", run: () => tryDuckDuckGoHtml(query) },
    { name: "wikipedia", run: () => tryWikipedia(query) }
  ];

  const errors = [];

  for (const provider of providers) {
    try {
      const live = await provider.run();
      if (live?.results?.length) {
        live.results = live.results.slice(0, maxResults);
        live.resultCount = live.results.length;
        live.summary = `Found ${live.resultCount} result(s) for "${query}" via ${live.provider}.`;
        console.log(`[web_search] live hit via ${live.provider} (${live.resultCount} results)`);
        return live;
      }
      errors.push(`${provider.name}: empty`);
    } catch (error) {
      errors.push(`${provider.name}: ${error.message || "failed"}`);
    }
  }

  console.warn(`[web_search] all providers failed for "${query}": ${errors.join(" | ")}`);
  return buildFallbackSearchResult(query, context, errors.join("; "));
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
