import "./PipelineStatus.css";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const PenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

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

const LoaderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 12 15 16 10" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function PipelineStatus({ result, loading, currentAgent, agentStatus }) {
  const agents = [
    {
      id: "researcher",
      name: "Researcher",
      icon: SearchIcon,
      statusText: {
        waiting: "Waiting for input",
        running: "Collecting research data...",
        completed: "Research collected successfully",
      },
    },
    {
      id: "writer",
      name: "Writer",
      icon: PenIcon,
      statusText: {
        waiting: "Waiting for research",
        running: "Generating content...",
        completed: "Draft content generated",
      },
    },
    {
      id: "editor",
      name: "Editor",
      icon: EditIcon,
      statusText: {
        waiting: "Waiting for writer",
        running: "Reviewing content...",
        completed: "Review completed",
      },
    },
  ];

  // Use real-time agentStatus if available, otherwise fall back to result
  const getAgentStatus = (agentId) => {
    if (agentStatus) {
      return agentStatus[agentId] || "waiting";
    }

    if (!result && !loading) return "waiting";

    // If result exists, use it
    if (result?.agentStatus?.[agentId]) {
      return result.agentStatus[agentId];
    }

    return "waiting";
  };

  const editorStatus = getAgentStatus("editor");
  const isEditorRunning = editorStatus === "running";
  const isEditorCompleted = editorStatus === "completed";

  const editorReview = result?.editorReview;
  const decision = editorReview?.decision;
  const qualityScore = editorReview?.qualityScore;
  const summary = editorReview?.summary;
  const revisionHistory = result?.revisionHistory || [];
  const reachedMaxIterations = result?.reachedMaxIterations;
  const totalIterations = result?.totalIterations || 0;
  const maxIterations = result?.maxIterations || 3;

  const isApproved = decision === "approved";
  const isNeedsRevision = decision === "needs_revision";

  // Calculate revision summary
  const getRevisionSummary = () => {
    if (revisionHistory.length === 0) return null;
    
    const iterationsWithRevisions = revisionHistory.filter(r => r.hadRevisions);
    const totalRevisions = iterationsWithRevisions.reduce((sum, r) => sum + r.revisionCount, 0);
    
    return {
      totalCycles: revisionHistory.length,
      revisionCycles: iterationsWithRevisions.length,
      totalRevisions
    };
  };

  const revisionSummary = getRevisionSummary();

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Pipeline status</span>
        <span className="section-subtitle">
          {loading ? "Processing..." : result ? "Completed" : "Live execution progress"}
        </span>
      </div>

      {agents.map((agent) => {
        const status = getAgentStatus(agent.id);
        const isCompleted = status === "completed";
        const isRunning = status === "running";
        const isWaiting = status === "waiting";

        return (
          <div key={agent.id} className={`agent-card ${agent.id}`}>
            <div className={`agent-icon ${agent.id}`}>
              <agent.icon />
            </div>
            <div className="agent-info">
              <div className="agent-header">
                <span className="agent-name">{agent.name}</span>
                <span className={`agent-badge ${status}`}>
                  {isCompleted ? "Completed" : isRunning ? "Running" : "Waiting"}
                </span>
              </div>
              <div className="agent-progress">
                <div
                  className="agent-progress-fill"
                  style={{
                    width: isCompleted ? "100%" : isRunning ? "60%" : "0%",
                  }}
                />
              </div>
              <span className="agent-status">{agent.statusText[status]}</span>
            </div>
            <div className="agent-right">
              {isCompleted ? <CheckIcon /> : isRunning ? <LoaderIcon /> : <ClockIcon />}
            </div>
          </div>
        );
      })}

      {isEditorRunning && (
        <div className="editor-info-panel">
          <div className="editor-info-header">
            <InfoIcon />
            <span>Editor Agent</span>
          </div>
          <p className="editor-info-text">
            This agent reviews the Writer&apos;s draft and produces structured feedback
            (what&apos;s weak, what&apos;s missing, what needs improvement) along with a quality
            score. Output should clearly indicate whether the content is{" "}
            <strong>&quot;approved&quot;</strong> or <strong>&quot;needs revision.&quot;</strong>
          </p>
        </div>
      )}

      {isEditorCompleted && editorReview && (
        <div className={`editor-verdict-panel ${isApproved ? "approved" : "needs-revision"}`}>
          <div className="editor-verdict-header">
            <div className="editor-verdict-icon">
              {isApproved ? <ShieldCheckIcon /> : <AlertIcon />}
            </div>
            <div className="editor-verdict-title">
              {isApproved ? "Approved" : "Needs Revision"}
            </div>
          </div>

          <div className="editor-verdict-score">
            <div className="editor-verdict-score-label">
              <StarIcon />
              <span>Quality Score</span>
            </div>
            <div className="editor-verdict-score-bar">
              <div
                className="editor-verdict-score-fill"
                style={{ width: `${qualityScore || 0}%` }}
              />
            </div>
            <div className="editor-verdict-score-value">{qualityScore || 0}/100</div>
          </div>

          {/* Revision Summary - Show when there were iterations */}
          {revisionSummary && (
            <div className="editor-revision-summary">
              <div className="revision-summary-header">
                <span className="revision-cycle-icon">🔄</span>
                <span>Revision History</span>
              </div>
              <div className="revision-history-list">
                {revisionHistory.map((r, idx) => (
                  <div key={idx} className={`revision-history-item ${r.decision === 'approved' ? 'approved' : 'revision-needed'}`}>
                    <span className="revision-decision-icon">
                      {r.decision === 'approved' ? '✅' : '🔄'}
                    </span>
                    <span className="revision-iteration">Iteration {r.iteration}:</span>
                    <span className="revision-decision">{r.decision.toUpperCase()}</span>
                    <span className="revision-score">({r.qualityScore}/100)</span>
                    {r.hadRevisions && (
                      <span className="revision-count">- {r.revisionCount} revisions</span>
                    )}
                  </div>
                ))}
              </div>
              {reachedMaxIterations && (
                <div className="max-iterations-warning">
                  ⚠️ Max iterations ({maxIterations}) reached. Content requires further improvements.
                </div>
              )}
            </div>
          )}

          {summary && (
            <p className="editor-verdict-summary">{summary}</p>
          )}
        </div>
      )}
    </div>
  );
}
