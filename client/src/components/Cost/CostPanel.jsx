import { formatUsd, formatTokens } from "../../utils/costFormat";

/**
 * Live LLM cost for the current pipeline run.
 * Data comes from the normal status poll (result.cost) — no extra requests.
 *
 * States:
 *  - no result yet      → hint
 *  - cost.available off → graceful "no LLM usage" (demo mode / failed run)
 *  - available          → totals + agent-wise table with cost share bars
 */
export default function CostPanel({ result, loading }) {
  const cost = result?.cost || null;

  return (
    <div className="cost-panel">
      <div className="cost-head">
        <h3 className="page-card-title">💰 LLM Cost</h3>
        {cost?.mostExpensiveAgent && (
          <span className="cost-peak" title="Most expensive agent in this run">
            Top: {cost.mostExpensiveAgent.agentName}
          </span>
        )}
      </div>

      {!cost && !loading && (
        <p className="cost-empty">
          Run a pipeline — live token usage and per-agent cost will appear here.
        </p>
      )}

      {loading && !cost?.available && (
        <p className="cost-empty">Waiting for LLM usage…</p>
      )}

      {!loading && cost && !cost.available && (
        <p className="cost-empty">
          No LLM calls were recorded for this run. Set <code>GROQ_API_KEY</code> on
          the server to enable real token &amp; cost tracking — demo mode never
          bills tokens.
        </p>
      )}

      {cost?.available && (
        <>
          <div className="cost-totals">
            <div className="cost-total-box">
              <span className="cost-total-value">
                {formatUsd(cost.totalCost)}
                {!cost.pricingKnown && <span className="cost-star">*</span>}
              </span>
              <span className="cost-total-label">Total run cost</span>
            </div>
            <div className="cost-mini">
              <div><strong>{formatTokens(cost.totalTokens)}</strong> tokens</div>
              <div>{formatTokens(cost.totalInputTokens)} in / {formatTokens(cost.totalOutputTokens)} out</div>
              <div>{cost.calls} LLM call{cost.calls === 1 ? "" : "s"}</div>
              <div>{((cost.totalDurationMs || 0) / 1000).toFixed(1)}s LLM time</div>
            </div>
          </div>

          {!cost.pricingKnown && (
            <p className="cost-warn">
              * A model without configured pricing was used — its tokens are
              counted, but cost is unknown. Update <code>MODEL_PRICING</code> on
              the server.
            </p>
          )}

          <table className="cost-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {cost.agents.map((agent) => (
                <tr key={agent.agentId}>
                  <td>
                    <div className="cost-agent-name">{agent.agentName}</div>
                    <div className="cost-agent-model">
                      {agent.model}
                      {agent.calls > 1 ? ` · ${agent.calls} calls` : ""}
                    </div>
                  </td>
                  <td>{formatTokens(agent.totalTokens)}</td>
                  <td>
                    {formatUsd(agent.totalCost)}
                    {!agent.pricingKnown && <span className="cost-star">*</span>}
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
        </>
      )}
    </div>
  );
}
