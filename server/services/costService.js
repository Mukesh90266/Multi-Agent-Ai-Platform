import { config } from "../config/config.js";

/**
 * Centralized LLM cost tracking.
 *  - model pricing config (single place to update — spec §2/§14)
 *  - cost calculation
 *  - per-agent / per-run aggregation
 *  - in-memory ledger of recent runs (analytics fallback when MongoDB is off)
 *
 * This module is purely observational: it never changes LLM behavior and
 * never throws into the pipeline path.
 */

// ── Pricing config (USD per 1M tokens) ────────────────────────────────
// Update ONLY here (or via LLM_PRICING_OVERRIDES env) when prices change.
export const MODEL_PRICING = {
  "llama-3.3-70b-versatile": { inputPer1M: 0.59, outputPer1M: 0.79 },
  "llama-3.1-8b-instant": { inputPer1M: 0.05, outputPer1M: 0.08 },
  "llama3-70b-8192": { inputPer1M: 0.59, outputPer1M: 0.79 },
  "llama3-8b-8192": { inputPer1M: 0.05, outputPer1M: 0.08 },
  "mixtral-8x7b-32768": { inputPer1M: 0.24, outputPer1M: 0.24 },
  "gemma2-9b-it": { inputPer1M: 0.2, outputPer1M: 0.2 },
  "deepseek-r1-distill-llama-70b": { inputPer1M: 0.75, outputPer1M: 0.99 }
};

// Optional env override:
//   LLM_PRICING_OVERRIDES='{"my-model":{"inputPer1M":1.0,"outputPer1M":2.0}}'
function resolvePricingTable() {
  if (!process.env.LLM_PRICING_OVERRIDES) return MODEL_PRICING;
  try {
    return { ...MODEL_PRICING, ...JSON.parse(process.env.LLM_PRICING_OVERRIDES) };
  } catch {
    console.warn("[cost] LLM_PRICING_OVERRIDES is not valid JSON — ignored.");
    return MODEL_PRICING;
  }
}

export function getModelPricing(model) {
  if (!model) return null;
  return resolvePricingTable()[model] || null;
}

const round8 = (n) => (n == null || Number.isNaN(n) ? null : Number(n.toFixed(8)));

/**
 * inputCost  = (inputTokens  / 1,000,000) × inputPricePer1M
 * outputCost = (outputTokens / 1,000,000) × outputPricePer1M
 *
 * Unknown model → pricingKnown:false and costs are null.
 * Token usage is never lost; only the cost becomes "unknown" (spec §2/§11).
 */
export function calculateCost(model, inputTokens, outputTokens) {
  const pricing = getModelPricing(model);
  if (!pricing) {
    return { pricingKnown: false, inputCost: null, outputCost: null, totalCost: null };
  }
  const inputCost = ((inputTokens || 0) / 1_000_000) * pricing.inputPer1M;
  const outputCost = ((outputTokens || 0) / 1_000_000) * pricing.outputPer1M;
  return { pricingKnown: true, inputCost, outputCost, totalCost: inputCost + outputCost };
}

/**
 * Aggregate raw usage records → per-agent rows + pipeline totals.
 *
 * totals are built by summing the agent rows, so by construction:
 *   totalCost === Σ agent.totalCost          (spec §4)
 *   totalTokens === Σ agent.totalTokens
 *
 * One agent ↔ many LLM calls (tool loops / review iterations) simply add up
 * (spec §3/§6). Records carry runId/agentId/agentName from the usage scope,
 * so parallel agents stay correctly attributed (spec §5).
 */
export function buildCostSnapshot(records = []) {
  const empty = {
    available: false,
    pricingKnown: false,
    calls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalInputCost: 0,
    totalOutputCost: 0,
    totalCost: 0,
    totalDurationMs: 0,
    agents: [],
    mostExpensiveAgent: null
  };
  if (!Array.isArray(records) || records.length === 0) return empty;

  const byAgent = new Map();

  for (const record of records) {
    const key = record?.agentId || "unknown";
    if (!byAgent.has(key)) {
      byAgent.set(key, {
        agentId: key,
        agentName: record?.agentName || key,
        models: new Set(),
        calls: 0,
        unknownUsageCalls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        durationMs: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        pricingKnown: true
      });
    }

    const entry = byAgent.get(key);
    entry.calls += 1;
    if (record?.agentName) entry.agentName = record.agentName;
    if (record?.model) entry.models.add(record.model);
    if (record?.usageKnown === false) entry.unknownUsageCalls += 1;

    const inputTokens = Math.max(0, record?.inputTokens || 0);
    const outputTokens = Math.max(0, record?.outputTokens || 0);
    entry.inputTokens += inputTokens;
    entry.outputTokens += outputTokens;
    entry.totalTokens += inputTokens + outputTokens;
    entry.durationMs += record?.durationMs || 0;

    const cost = calculateCost(record?.model, inputTokens, outputTokens);
    if (!cost.pricingKnown) {
      entry.pricingKnown = false; // tokens still kept above — spec §2
    } else {
      entry.inputCost += cost.inputCost;
      entry.outputCost += cost.outputCost;
      entry.totalCost += cost.totalCost;
    }
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalInputCost = 0;
  let totalOutputCost = 0;
  let totalCost = 0;
  let totalDurationMs = 0;
  let pricingKnown = true;

  const agents = [...byAgent.values()].map((entry) => {
    totalInputTokens += entry.inputTokens;
    totalOutputTokens += entry.outputTokens;
    totalInputCost += entry.inputCost;
    totalOutputCost += entry.outputCost;
    totalCost += entry.totalCost;
    totalDurationMs += entry.durationMs;
    if (!entry.pricingKnown) pricingKnown = false;

    return {
      agentId: entry.agentId,
      agentName: entry.agentName,
      model: [...entry.models].join(", ") || config.model || null,
      calls: entry.calls,
      unknownUsageCalls: entry.unknownUsageCalls,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      totalTokens: entry.totalTokens,
      durationMs: entry.durationMs,
      pricingKnown: entry.pricingKnown,
      inputCost: entry.pricingKnown ? round8(entry.inputCost) : null,
      outputCost: entry.pricingKnown ? round8(entry.outputCost) : null,
      totalCost: entry.pricingKnown ? round8(entry.totalCost) : null
    };
  });

  for (const agent of agents) {
    agent.sharePct =
      totalCost > 0 && agent.pricingKnown
        ? Number(((agent.totalCost / totalCost) * 100).toFixed(1))
        : null;
  }

  const mostExpensive =
    agents
      .filter((a) => a.pricingKnown && a.totalCost != null)
      .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))[0] || null;

  return {
    available: true,
    pricingKnown,
    calls: records.length,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalInputCost: round8(totalInputCost),
    totalOutputCost: round8(totalOutputCost),
    totalCost: round8(totalCost),
    totalDurationMs,
    agents,
    mostExpensiveAgent: mostExpensive
      ? {
          agentId: mostExpensive.agentId,
          agentName: mostExpensive.agentName,
          totalCost: mostExpensive.totalCost,
          sharePct: mostExpensive.sharePct
        }
      : null
  };
}

// ── Recent-runs ledger (fallback analytics when MongoDB isn't connected) ──
const recentRunCosts = [];
const MAX_RECENT = 50;

export function registerRunCost(entry) {
  try {
    recentRunCosts.unshift(entry);
    if (recentRunCosts.length > MAX_RECENT) recentRunCosts.pop();
  } catch {
    // Analytics must never break the pipeline.
  }
}

export function listRecentRunCosts() {
  return [...recentRunCosts];
}

/**
 * Cross-run analytics (spec §8/§10).
 * runs: [{ runId, topic, status, createdAt, cost }]
 *
 * Average definition (spec §10): only completed/approved runs whose cost is
 * known are counted — error runs and unknown-pricing runs are excluded from
 * the average but still reported. Divide-by-zero guarded.
 * Runs with no cost data at all (old history — spec §11) are simply skipped.
 */
export function buildAnalyticsSummary(runs = []) {
  const withUsage = runs.filter((r) => r?.cost?.available);
  const withoutCost = runs.length - withUsage.length;

  let totalCost = 0;
  let costRuns = 0;
  let unknownCostRuns = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const agentTotals = new Map();

  for (const run of withUsage) {
    const c = run.cost;
    totalInputTokens += c.totalInputTokens || 0;
    totalOutputTokens += c.totalOutputTokens || 0;

    const completed = run.status === "approved" || run.status === "completed";
    if (completed && c.totalCost != null) {
      totalCost += c.totalCost;
      costRuns += 1;
    } else if (c.totalCost == null) {
      unknownCostRuns += 1;
    }

    for (const agent of c.agents || []) {
      const key = agent.agentId || "unknown";
      if (!agentTotals.has(key)) {
        agentTotals.set(key, {
          agentId: key,
          agentName: agent.agentName || key,
          calls: 0,
          totalTokens: 0,
          totalCost: 0,
          pricingKnown: true
        });
      }
      const a = agentTotals.get(key);
      if (agent.agentName) a.agentName = agent.agentName;
      a.calls += agent.calls || 0;
      a.totalTokens += agent.totalTokens || 0;
      if (agent.totalCost != null) a.totalCost += agent.totalCost;
      else a.pricingKnown = false;
    }
  }

  const agentBreakdown = [...agentTotals.values()]
    .map((a) => ({
      ...a,
      totalCost: a.pricingKnown ? round8(a.totalCost) : null,
      sharePct:
        totalCost > 0 && a.pricingKnown
          ? Number(((a.totalCost / totalCost) * 100).toFixed(1))
          : null
    }))
    .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0));

  const mostExpensiveAgent = agentBreakdown.find((a) => a.totalCost != null) || null;

  return {
    summary: {
      totalRuns: runs.length,
      runsWithUsage: withUsage.length,
      runsWithoutCost: withoutCost,
      runsCountedForAverage: costRuns,
      runsWithUnknownPricing: unknownCostRuns,
      totalCost: round8(totalCost),
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      avgCostPerRun: costRuns > 0 ? round8(totalCost / costRuns) : 0,
      mostExpensiveAgent: mostExpensiveAgent
        ? {
            agentId: mostExpensiveAgent.agentId,
            agentName: mostExpensiveAgent.agentName,
            totalCost: mostExpensiveAgent.totalCost
          }
        : null
    },
    agentBreakdown,
    // Per-run detail — every pipeline run keeps its OWN cost + agent rows,
    // never mixed with other runs. Newest first, capped at 20.
    runs: withUsage.slice(0, 20).map((run) => ({
      runId: run.runId,
      topic: run.topic,
      status: run.status,
      createdAt: run.createdAt || null,
      cost: run.cost
    })),
    recentRuns: withUsage.slice(0, 10).map((run) => ({
      runId: run.runId,
      topic: run.topic,
      status: run.status,
      createdAt: run.createdAt || null,
      totalCost: run.cost.totalCost ?? null,
      totalTokens: run.cost.totalTokens || 0,
      topAgent: run.cost.mostExpensiveAgent?.agentName || null
    }))
  };
}
