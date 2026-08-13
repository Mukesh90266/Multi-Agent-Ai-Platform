import { useEffect, useState } from "react";
import { getCostAnalytics } from "../services/api";
import CostAnalyticsSection from "../components/Cost/CostAnalyticsSection";

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

/**
 * Dedicated Cost Analytics page — total LLM spend, total tokens, average
 * cost per completed run, most expensive agent, agent-wise breakdown and
 * recent runs. Served from /api/history/cost-analytics (MongoDB when
 * connected, otherwise this session's in-memory data).
 */
export default function CostDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = () => {
    setError("");
    getCostAnalytics()
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load cost analytics.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page page-cost">
      <header className="page-header-row">
        <div>
          <h1 className="page-title">Cost Analytics</h1>
          <p className="page-subtitle">
            LLM token usage and cost across pipeline runs — total spend, average per run,
            most expensive agent, and agent-wise breakdown.
          </p>
        </div>
        <button
          type="button"
          className="history-refresh-btn"
          onClick={() => {
            setLoading(true);
            fetchAnalytics();
          }}
          disabled={loading}
        >
          <RefreshIcon />
          Refresh
        </button>
      </header>

      {error && <div className="builder-message error page-banner">{error}</div>}

      {loading && !analytics ? (
        <div className="history-loading">
          <div className="history-spinner" />
          <span>Loading cost analytics…</span>
        </div>
      ) : (
        <CostAnalyticsSection analytics={analytics} mode="full" />
      )}
    </div>
  );
}
