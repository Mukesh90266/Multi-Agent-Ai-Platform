import "./PipelineInfo.css";

const TopicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const HashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export default function PipelineInfo({ result, loading }) {
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div className="card pipeline-info-card">
      <h3>Pipeline Info</h3>

      <div className="info-list">
        <div className="info-item">
          <div className="info-icon">
            <TopicIcon />
          </div>
          <div className="info-content">
            <span className="info-label">Topic</span>
            <span className="info-value">
              {result?.input?.topic || "-"}
            </span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <HashIcon />
          </div>
          <div className="info-content">
            <span className="info-label">Iteration</span>
            <span className="info-value">
              {result?.currentIteration || 1} of {result?.maxIterations || 5}
            </span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <ClockIcon />
          </div>
          <div className="info-content">
            <span className="info-label">Started At</span>
            <span className="info-value">
              {result ? formatDate(result.runId ? new Date().toISOString() : null) : "-"}
            </span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">
            <PlayIcon />
          </div>
          <div className="info-content">
            <span className="info-label">Status</span>
            <span className={`status-pill ${result?.status || (loading ? 'running' : 'idle')}`}>
              {loading ? "Running" : result?.status === "approved" ? "Completed" : result ? "In Progress" : "Idle"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
