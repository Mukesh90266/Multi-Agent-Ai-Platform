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
  const getStatus = () => {
    if (loading) return { text: "Running", color: "gray" };
    if (!result) return { text: "Idle", color: "gray" };
    if (result.status === "approved") return { text: "Completed", color: "green" };
    return { text: "In Progress", color: "gray" };
  };

  const status = getStatus();

  const formatTime = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString();
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Pipeline info</span>
        <span className={`info-badge info-badge-${status.color}`}>
          <span className={`info-badge-dot ${status.color}`} />
          {status.text}
        </span>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <div className="info-icon">
            <TopicIcon />
          </div>
          <div className="info-content">
            <div className="info-label">Topic</div>
            <div className="info-value">
              {result?.input?.topic?.slice(0, 20) || "—"}
              {result?.input?.topic?.length > 20 && "..."}
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">
            <HashIcon />
          </div>
          <div className="info-content">
            <div className="info-label">Iteration</div>
            <div className="info-value">
              {result?.currentIteration || 1} of {result?.maxIterations || 5}
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">
            <ClockIcon />
          </div>
          <div className="info-content">
            <div className="info-label">Started at</div>
            <div className="info-value">{formatTime(result?.createdAt)}</div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">
            <PlayIcon />
          </div>
          <div className="info-content">
            <div className="info-label">Status</div>
            <div className="info-value">{status.text}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
