import { formatUsd, formatTokens } from "../../utils/costFormat";

/**
 * Shared LLM cost analytics block.
 * Used on the Cost Dashboard page (full, incl. recent runs) and embedded
 * compactly on the History page. Data comes from GET /api/history/cost-analytics.
 */
export default function CostAnalyticsSection({ analytics, showRecent = false }) {
  if (!analytics) return null;

  const summary = analytics.summary || {};

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
          <div className="cost-stat-cards">
            <div className="cost-stat-card">
              <span className="cost-stat-value">{formatUsd(summary.totalCost)}</span>
              <span className="cost-stat-label">Total LLM cost</span>
            </div>
            <div className="cost-stat-card">
              <span className="cost-stat-value">{formatTokens(summary.totalTokens)}</span>
              <span className="cost-stat-label">Total tokens</span>
            </div>
            <div className="cost-stat-card">
              <span className="cost-stat-value">{formatUsd(summary.avgCostPerRun)}</span>
              <span className="cost-stat-label">
                Avg / run ({summary.runsCountedForAverage} completed)
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

          {analytics.agentBreakdown?.length > 0 && (
            <table className="cost-table cost-table-wide">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>LLM Calls</th>
                  <th>Tokens</th>
                  <th>Cost</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {analytics.agentBreakdown.map((agent) => (
                  <tr key={agent.agentId}>
                    <td className="cost-agent-name">{agent.agentName}</td>
                    <td>{agent.calls}</td>
                    <td>{formatTokens(agent.totalTokens)}</td>
                    <td>{formatUsd(agent.totalCost)}</td>
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
          )}

          {showRecent && analytics.recentRuns?.length > 0 && (
            <div className="cost-recent">
              <h3 className="cost-recent-title">Recent runs with usage</h3>
              <table className="cost-table cost-table-wide">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Status</th>
                    <th>Tokens</th>
                    <th>Cost</th>
                    <th>Top agent</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentRuns.map((run) => (
                    <tr key={run.runId}>
                      <td>
                        <div className="cost-agent-name">{run.topic || "Untitled run"}</div>
                        <div className="cost-agent-model">
                          {run.createdAt ? new Date(run.createdAt).toLocaleString() : ""}
                        </div>
                      </td>
                      <td>
                        <span className={`cost-status ${run.status}`}>{run.status || "—"}</span>
                      </td>
                      <td>{formatTokens(run.totalTokens)}</td>
                      <td>{formatUsd(run.totalCost)}</td>
                      <td>{run.topAgent || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(summary.runsWithoutCost > 0 || summary.runsWithUnknownPricing > 0) && (
            <p className="cost-note">
              {summary.runsWithoutCost > 0 &&
                `${summary.runsWithoutCost} run(s) have no cost data (recorded before tracking was added). `}
              {summary.runsWithUnknownPricing > 0 &&
                `${summary.runsWithUnknownPricing} run(s) used models without configured pricing — tokens counted, cost unknown.`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
