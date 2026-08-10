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
    if (loading) return { text: "Running", color: "orange" };
    if (!result) return { text: "Idle", color: "gray" };
    if (result.status === "approved") return { text: "Completed", color: "green" };
    if (result.status === "needs_revision") return { text: "Needs Review", color: "yellow" };
    return { text: "In Progress", color: "gray" };
  };

  const status = getStatus();

  const formatTime = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString();
  };

  const topicText = result?.input?.topic || "—";
  const displayTopic = topicText.length > 20 ? topicText.slice(0, 20) + "..." : topicText;
  const readabilityScore = result?.optimization?.readabilityScore;

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Pipeline info</span>
        <span className={`info-badge info-badge-${status.color}`}>
          {loading && <span className="info-badge-dot orange" />}
          {!loading && status.color === "green" && <span className="info-badge-dot green" />}
          {!loading && status.color !== "green" && <span className="info-badge-dot gray" />}
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
            <div className="info-value">{displayTopic}</div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">
            <HashIcon />
          </div>
          <div className="info-content">
            <div className="info-label">Iterations</div>
            <div className="info-value">
              {result?.totalIterations || 1} / {result?.maxIterations || 3}
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">
            <ClockIcon />
          </div>
          <div className="info-content">
            <div className="info-label">Started at</div>
            <div className="info-value">{loading ? "Running..." : formatTime(result?.createdAt)}</div>
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

        {readabilityScore != null && (
          <div className="info-card">
            <div className="info-icon">
              <HashIcon />
            </div>
            <div className="info-content">
              <div className="info-label">Readability</div>
              <div className="info-value">{readabilityScore}/100</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
