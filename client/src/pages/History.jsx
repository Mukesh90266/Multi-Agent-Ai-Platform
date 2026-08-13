import { useEffect, useState } from "react";
import { getHistory, getCostAnalytics } from "../services/api";
import { formatUsd, formatTokens } from "../utils/costFormat";

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const TagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

export default function History() {
  const [runs, setRuns] = useState([]);
  const [message, setMessage] = useState("");
  const [mongoConnected, setMongoConnected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  const fetchHistory = () => {
    setLoading(true);
    getHistory()
      .then((x) => {
        setRuns(x.runs || []);
        setMessage(x.message || "");
        setMongoConnected(x.mongoConnected);
        setLoading(false);
      })
      .catch(() => {
        setMessage("Unable to load history.");
        setMongoConnected(false);
        setLoading(false);
      });

    // Cost analytics works even without MongoDB (in-memory session fallback),
    // so fetch it independently.
    getCostAnalytics()
      .then((data) => setAnalytics(data))
      .catch(() => setAnalytics(null));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="history-page">
      <div className="history-header">
        <div className="history-header-left">
          <h1 className="history-title">Pipeline History</h1>
          <span className="history-subtitle">
            {runs.length > 0 ? `${runs.length} run${runs.length !== 1 ? "s" : ""}` : "No runs yet"}
          </span>
        </div>
        <div className="history-header-right">
          {mongoConnected && (
            <button className="history-refresh-btn" onClick={fetchHistory} disabled={loading}>
              <RefreshIcon />
              Refresh
            </button>
          )}
          <div className={`history-db-badge ${mongoConnected ? "connected" : "disconnected"}`}>
            <DatabaseIcon />
            <span>{mongoConnected ? "MongoDB Connected" : "MongoDB Offline"}</span>
          </div>
        </div>
      </div>

      {mongoConnected === false && (
        <div className="history-notice">
          <div className="history-notice-icon">💡</div>
          <div className="history-notice-text">
            <strong>MongoDB is not connected.</strong> Pipeline runs won't be saved to history.
            <br />
            Set <code>MONGODB_URI</code> in <code>server/.env</code> or start MongoDB locally to enable history persistence.
          </div>
        </div>
      )}

      {/* ── LLM Cost Analytics ─────────────────────────────── */}
      {analytics && (
        <section className="cost-analytics">
          <div className="cost-analytics-head">
            <h2 className="cost-analytics-title">💰 Cost Analytics</h2>
            <span className="cost-analytics-src">
              {analytics.mongoConnected ? "from MongoDB history" : "this session only (in-memory)"}
            </span>
          </div>

          {analytics.summary?.runsWithUsage === 0 ? (
            <p className="cost-empty">
              No LLM usage recorded yet. Demo-mode runs never call the LLM — set
              <code> GROQ_API_KEY </code>on the server and run a pipeline to see
              real token &amp; cost analytics.
            </p>
          ) : (
            <>
              <div className="cost-stat-cards">
                <div className="cost-stat-card">
                  <span className="cost-stat-value">{formatUsd(analytics.summary.totalCost)}</span>
                  <span className="cost-stat-label">Total LLM cost</span>
                </div>
                <div className="cost-stat-card">
                  <span className="cost-stat-value">{formatTokens(analytics.summary.totalTokens)}</span>
                  <span className="cost-stat-label">Total tokens</span>
                </div>
                <div className="cost-stat-card">
                  <span className="cost-stat-value">{formatUsd(analytics.summary.avgCostPerRun)}</span>
                  <span className="cost-stat-label">
                    Avg / run ({analytics.summary.runsCountedForAverage} completed)
                  </span>
                </div>
                <div className="cost-stat-card">
                  <span className="cost-stat-value">
                    {analytics.summary.mostExpensiveAgent?.agentName || "—"}
                  </span>
                  <span className="cost-stat-label">
                    Most expensive agent
                    {analytics.summary.mostExpensiveAgent
                      ? ` (${formatUsd(analytics.summary.mostExpensiveAgent.totalCost)})`
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

              {(analytics.summary.runsWithoutCost > 0 || analytics.summary.runsWithUnknownPricing > 0) && (
                <p className="cost-note">
                  {analytics.summary.runsWithoutCost > 0 &&
                    `${analytics.summary.runsWithoutCost} older run(s) have no cost data (recorded before tracking was added). `}
                  {analytics.summary.runsWithUnknownPricing > 0 &&
                    `${analytics.summary.runsWithUnknownPricing} run(s) used models without configured pricing — tokens counted, cost unknown.`}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {loading ? (
        <div className="history-loading">
          <div className="history-spinner"></div>
          <span>Loading history...</span>
        </div>
      ) : runs.length === 0 && mongoConnected ? (
        <div className="history-empty">
          <div className="history-empty-icon">📋</div>
          <div className="history-empty-title">No pipeline runs yet</div>
          <div className="history-empty-subtitle">Run a pipeline from the home page to see results here</div>
        </div>
      ) : (
        <div className="history-list">
          {runs.map((run) => (
            <div className="history-card" key={run._id}>
              {/* Card Header */}
              <div className="history-card-header">
                <div className="history-card-title-row">
                  <div className={`history-status-dot ${run.approved ? "approved" : "needs-revision"}`}></div>
                  <h3 className="history-card-topic">{run.topic}</h3>
                </div>
                <div className={`history-status-badge ${run.approved ? "approved" : "needs-revision"}`}>
                  {run.approved ? (
                    <><CheckIcon /> Approved</>
                  ) : (
                    <><AlertIcon /> Needs Revision</>
                  )}
                </div>
              </div>

              {/* Meta Row */}
              <div className="history-card-meta">
                <div className="history-meta-item">
                  <ClockIcon />
                  <span>{new Date(run.createdAt).toLocaleString()}</span>
                </div>
                {run.contentType && (
                  <div className="history-meta-item">
                    <span className="history-meta-tag">{run.contentType}</span>
                  </div>
                )}
                {run.audience && (
                  <div className="history-meta-item">
                    <span className="history-meta-tag">{run.audience}</span>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="history-card-stats">
                <div className="history-stat">
                  <span className="history-stat-value">{run.totalIterations || 1}</span>
                  <span className="history-stat-label">Iterations</span>
                </div>
                {run.editorReview?.qualityScore != null && (
                  <div className="history-stat">
                    <span className={`history-stat-value ${run.editorReview.qualityScore >= 80 ? "good" : "warn"}`}>
                      {run.editorReview.qualityScore}
                    </span>
                    <span className="history-stat-label">Quality</span>
                  </div>
                )}
                {run.draft?.wordCount && (
                  <div className="history-stat">
                    <span className="history-stat-value">{run.draft.wordCount}</span>
                    <span className="history-stat-label">Words</span>
                  </div>
                )}
                {run.optimization?.readabilityScore != null && (
                  <div className="history-stat">
                    <span className="history-stat-value">{run.optimization.readabilityScore}</span>
                    <span className="history-stat-label">Readability</span>
                  </div>
                )}
                {run.cost?.available && (
                  <div className="history-stat">
                    <span className="history-stat-value cost">{formatUsd(run.cost.totalCost)}</span>
                    <span className="history-stat-label">
                      LLM Cost · {formatTokens(run.cost.totalTokens)} tokens
                    </span>
                  </div>
                )}
              </div>

              {/* SEO Info */}
              {run.optimization?.seo?.primaryKeyword && (
                <div className="history-card-seo">
                  <TagIcon />
                  <span className="history-seo-keyword">{run.optimization.seo.primaryKeyword}</span>
                  {run.optimization.slug && (
                    <code className="history-seo-slug">/{run.optimization.slug}</code>
                  )}
                </div>
              )}

              {/* Research Summary */}
              {run.research?.summary && (
                <p className="history-card-summary">{run.research.summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
