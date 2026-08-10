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

const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M12 8V4" />
    <circle cx="8" cy="14" r="1" />
    <circle cx="16" cy="14" r="1" />
    <path d="M9 18h6" />
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

const SEOTagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

function getAgentIcon(agent) {
  if (agent.agentId === "researcher") return SearchIcon;
  if (agent.agentId === "writer") return PenIcon;
  if (agent.agentId === "editor") return EditIcon;
  return BotIcon;
}

function getStatusText(agent, status) {
  const builtInText = {
    researcher: {
      waiting: "Waiting for input",
      running: "Collecting research data...",
      completed: "Research collected successfully"
    },
    writer: {
      waiting: "Waiting for turn",
      running: "Generating content...",
      completed: "Draft content generated"
    },
    editor: {
      waiting: "Waiting for draft",
      running: "Reviewing content...",
      completed: "Review completed"
    }
  };

  if (builtInText[agent.agentId]?.[status]) return builtInText[agent.agentId][status];
  if (status === "running") return "Executing saved system prompt...";
  if (status === "completed") return "Agent output generated";
  if (status === "skipped") return "Skipped";
  if (status === "error" || status === "failed") return "Failed";
  return "Waiting for turn";
}

export default function PipelineStatus({ result, loading, agentStatus, pipelineSteps = [] }) {
  const steps = result?.pipeline?.steps || pipelineSteps;

  const getAgentStatus = (step) => {
    if (agentStatus?.[step.stepId]) return agentStatus[step.stepId];
    if (result?.agentStatus?.[step.stepId]) return result.agentStatus[step.stepId];
    if (agentStatus?.[step.agentId]) return agentStatus[step.agentId];
    return "waiting";
  };

  const editorStatus = steps.some((step) => step.agentId === "editor" && getAgentStatus(step) === "running") ? "running" :
    steps.some((step) => step.agentId === "editor" && getAgentStatus(step) === "completed") ? "completed" : "waiting";
  const isEditorRunning = editorStatus === "running";
  const isEditorCompleted = editorStatus === "completed";

  const editorReview = result?.editorReview;
  const qualityScore = editorReview?.qualityScore;
  const summary = editorReview?.summary;
  const revisionHistory = result?.revisionHistory || [];
  const reachedMaxIterations = result?.reachedMaxIterations;
  const maxIterations = result?.maxIterations || 1;
  const isApproved = qualityScore >= 80;

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Pipeline status</span>
        <span className="section-subtitle">
          {loading ? "Processing..." : result ? "Completed" : "Live execution progress"}
        </span>
      </div>

      {steps.length === 0 ? (
        <div className="pipeline-empty status-empty">No agents selected.</div>
      ) : steps.map((agent) => {
        const status = getAgentStatus(agent);
        const Icon = getAgentIcon(agent);
        const isCompleted = status === "completed";
        const isRunning = status === "running";
        const isSkipped = status === "skipped";
        const isError = status === "error" || status === "failed";

        return (
          <div key={agent.stepId} className={`agent-card ${agent.agentId} ${agent.type || "custom"}`}>
            <div className={`agent-icon ${agent.agentId} ${agent.type || "custom"}`}>
              <Icon />
            </div>
            <div className="agent-info">
              <div className="agent-header">
                <span className="agent-name">{agent.name}</span>
                <span className={`agent-badge ${status}`}>
                  {isCompleted ? "Completed" : isRunning ? "Running" : isSkipped ? "Skipped" : isError ? "Failed" : "Waiting"}
                </span>
              </div>
              <div className="agent-progress">
                <div
                  className="agent-progress-fill"
                  style={{ width: isCompleted ? "100%" : isRunning ? "60%" : isSkipped ? "100%" : "0%" }}
                />
              </div>
              <span className="agent-status">{getStatusText(agent, status)}</span>
            </div>
            <div className="agent-right">
              {isCompleted || isSkipped ? <CheckIcon /> : isRunning ? <LoaderIcon /> : isError ? <AlertIcon /> : <ClockIcon />}
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
            The built-in Editor reviews the latest available draft/output and returns structured
            feedback with a quality score. In the default pre-built pipeline, this can trigger
            Writer revisions through the dynamic executor.
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
              <div className="editor-verdict-score-fill" style={{ width: `${qualityScore || 0}%` }} />
            </div>
            <div className="editor-verdict-score-value">{qualityScore || 0}/100</div>
          </div>

          {revisionHistory.length > 0 && (
            <div className="editor-revision-summary">
              <div className="revision-summary-header">
                <span className="revision-cycle-icon">🔄</span>
                <span>Revision History</span>
              </div>
              <div className="revision-history-list">
                {revisionHistory.map((revision, index) => {
                  const iterationApproved = revision.qualityScore >= 80;
                  return (
                    <div key={index} className={`revision-history-item ${iterationApproved ? "approved" : "revision-needed"}`}>
                      <span className="revision-decision-icon">{iterationApproved ? "✅" : "🔄"}</span>
                      <span className="revision-iteration">Iteration {revision.iteration}:</span>
                      <span className="revision-decision">{iterationApproved ? "APPROVED" : "NEEDS WORK"}</span>
                      <span className="revision-score">({revision.qualityScore}/100)</span>
                      {!iterationApproved && revision.revisionCount > 0 && (
                        <span className="revision-count">- {revision.revisionCount} revisions</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {reachedMaxIterations && qualityScore < 80 && (
                <div className="max-iterations-warning">
                  ⚠️ Max iterations ({maxIterations}) reached. Quality score below 80.
                </div>
              )}
            </div>
          )}

          {summary && <p className="editor-verdict-summary">{summary}</p>}
        </div>
      )}

      {result?.optimization && (
        <div className="editor-verdict-panel approved optimizer-panel">
          <div className="editor-verdict-header">
            <div className="editor-verdict-icon"><SEOTagIcon /></div>
            <div className="editor-verdict-title">SEO Optimized</div>
          </div>
        </div>
      )}
    </div>
  );
}
