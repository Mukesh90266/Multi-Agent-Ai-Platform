import { formatUsd, formatTokens } from "../../utils/costFormat";

function AgentCostTable({ agents }) {
  return (
    <table className="cost-table cost-table-wide">
      <thead>
        <tr>
          <th>Agent</th>
          <th>LLM Calls</th>
          <th>Tokens</th>
          <th>LLM $</th>
          <th>API/Tools</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        {agents.map((agent) => (
          <tr key={agent.agentId}>
            <td>
              <div className="cost-agent-name">{agent.agentName}</div>
              {agent.model && <div className="cost-agent-model">{agent.model}</div>}
            </td>
            <td>{agent.calls}</td>
            <td>{formatTokens(agent.totalTokens)}</td>
            <td>
              {formatUsd(agent.totalCost)}
              {!agent.pricingKnown && <span className="cost-star">*</span>}
            </td>
            <td>
              {agent.toolCalls > 0 ? (
                <span className="cost-tool-cell" title={(agent.toolsUsed || []).join(", ")}>
                  {agent.toolCalls}× · {formatUsd(agent.toolCost)}
                </span>
              ) : (
                "—"
              )}
            </td>
            <td>
              {agent.sharePct != null ? (
                <div className="cost-share">
                  <div className="cost-share-track">
                    <div className="cost-share-fill" style={{ width: `${agent.sharePct}%` }} />
                  </div>
                  <span>{agent.sharePct}%</span>
                </div>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Shared LLM cost analytics block.
 *  mode="summary" → overall strip only (History page embed)
 *  mode="full"    → overall strip + one SEPARATE card per pipeline run
 *                   (each run shows only its own agents — never mixed)
 * Data: GET /api/history/cost-analytics
 */
export default function CostAnalyticsSection({ analytics, mode = "summary" }) {
  if (!analytics) return null;

  const summary = analytics.summary || {};
  const runs = analytics.runs || [];

  return (
    <section className="cost-analytics">
      <div className="cost-analytics-head">
        <h2 className="cost-analytics-title">💰 Cost Analytics</h2>
        <span className="cost-analytics-src">
          {analytics.mongoConnected ? "from MongoDB history" : "this session only (in-memory)"}
        </span>
      </div>

      {summary.runsWithUsage === 0 ? (
        <p className="cost-empty">
          No LLM usage recorded yet. Demo-mode runs never call the LLM — set
          <code> GROQ_API_KEY </code>on the server and run a pipeline to see
          real token &amp; cost analytics.
        </p>
      ) : (
        <>
          {/* Overall strip — totals across runs (read-only summary) */}
          <div className="cost-stat-cards">
            <div className="cost-stat-card">
              <span className="cost-stat-value">{formatUsd(summary.grandTotal ?? summary.totalCost)}</span>
              <span className="cost-stat-label">
                Total spend{summary.totalToolCalls > 0
                  ? ` (LLM ${formatUsd(summary.totalCost)} + tools ${formatUsd(summary.totalToolCost)})`
                  : ""}
              </span>
            </div>
            <div className="cost-stat-card">
              <span className="cost-stat-value">{formatTokens(summary.totalTokens)}</span>
              <span className="cost-stat-label">Total tokens</span>
            </div>
            <div className="cost-stat-card">
              <span className="cost-stat-value">
                {formatUsd(summary.avgGrandCostPerRun ?? summary.avgCostPerRun)}
              </span>
              <span className="cost-stat-label">
                Avg / run, LLM+tools ({summary.runsCountedForAverage} completed)
              </span>
            </div>
            <div className="cost-stat-card">
              <span className="cost-stat-value">
                {summary.mostExpensiveAgent?.agentName || "—"}
              </span>
              <span className="cost-stat-label">
                Most expensive agent
                {summary.mostExpensiveAgent
                  ? ` (${formatUsd(summary.mostExpensiveAgent.totalCost)})`
                  : ""}
              </span>
            </div>
          </div>

          {/* Per-run breakdown — each run (search) stays separate */}
          {mode === "full" &&
            runs.map((run) => {
              const cost = run.cost || {};
              return (
                <div key={run.runId} className="cost-run-card">
                  <div className="cost-run-head">
                    <div className="cost-run-title-wrap">
                      <span className="cost-run-topic">{run.topic || "Untitled run"}</span>
                      <span className="cost-run-date">
                        {run.createdAt ? new Date(run.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <div className="cost-run-meta">
                      <span className={`cost-status ${run.status}`}>{run.status || "—"}</span>
                      <span className="cost-run-chip">
                        {formatUsd(cost.grandTotal ?? cost.totalCost)}
                        {" · "}{formatTokens(cost.totalTokens)} tokens
                        {" · "}{cost.calls || 0} LLM call{cost.calls === 1 ? "" : "s"}
                        {cost.toolCalls > 0 && (
                          <> · {cost.toolCalls} tool call{cost.toolCalls === 1 ? "" : "s"} {formatUsd(cost.totalToolCost)}</>
                        )}
                      </span>
                    </div>
                  </div>

                  {cost.agents?.length > 0 && <AgentCostTable agents={cost.agents} />}

                  {cost.mostExpensiveAgent && (
                    <div className="cost-run-foot">
                      Most expensive in this run:{" "}
                      <strong>{cost.mostExpensiveAgent.agentName}</strong> (
                      {formatUsd(cost.mostExpensiveAgent.totalCost)})
                    </div>
                  )}
                </div>
              );
            })}

          {(summary.runsWithoutCost > 0 || summary.runsWithUnknownPricing > 0) && (
            <p className="cost-note">
              {summary.runsWithoutCost > 0 &&
                `${summary.runsWithoutCost} run(s) have no cost data (demo runs or recorded before tracking). `}
              {summary.runsWithUnknownPricing > 0 &&
                `${summary.runsWithUnknownPricing} run(s) used models without configured pricing — tokens counted, cost unknown.`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
