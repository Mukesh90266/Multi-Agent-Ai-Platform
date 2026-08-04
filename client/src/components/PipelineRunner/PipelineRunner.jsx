import "./PipelineRunner.css";

const ResearcherIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const WriterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
  </svg>
);

const EditorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IterationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const agents = [
  { id: "researcher", name: "Researcher Agent", icon: ResearcherIcon, task: "Gathering and structuring research data" },
  { id: "writer", name: "Writer Agent", icon: WriterIcon, task: "Creating content draft from research" },
  { id: "editor", name: "Editor Agent", icon: EditorIcon, task: "Reviewing and providing feedback" },
];

export default function PipelineRunner({
  agentStatus,
  currentAgent,
  currentIteration,
  maxIterations,
  loading,
  onRun,
  onStop,
  disabled
}) {
  const getAgentStatus = (agentId) => {
    return agentStatus?.[agentId] || "waiting";
  };

  const getOverallProgress = () => {
    const status = agentStatus || {};
    const completed = Object.values(status).filter(v => v === "completed").length;
    const total = 3;
    return (completed / total) * 100;
  };

  const isPipelineRunning = loading || currentAgent;

  return (
    <section className="pipeline-runner">
      <h2>Pipeline Status</h2>
      
      <div className="pipeline-status">
        {agents.map((agent) => {
          const status = getAgentStatus(agent.id);
          const isActive = currentAgent === agent.id;
          
          return (
            <div 
              key={agent.id} 
              className={`agent-card ${status} ${isActive ? 'active' : ''}`}
            >
              <div className="agent-icon">
                <agent.icon />
              </div>
              <div className="agent-info">
                <div className="agent-name">{agent.name}</div>
                <p className="agent-task">
                  {isActive ? `Working: ${agent.task}` : agent.task}
                </p>
                {isActive && (
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: '100%', animation: 'progressPulse 2s infinite' }}
                    />
                  </div>
                )}
              </div>
              <div className={`agent-status-badge ${status}`}>
                {status === "running" && <span className="spinner-small" />}
                {status.replace(/_/g, " ")}
              </div>
            </div>
          );
        })}
      </div>

      {currentIteration > 1 && (
        <div className="iteration-info">
          <IterationIcon />
          <span>Iteration {currentIteration} of {maxIterations} - Feedback loop active</span>
        </div>
      )}

      <div className="pipeline-actions">
        <button 
          className="btn-primary" 
          onClick={onRun}
          disabled={disabled || loading}
        >
          {loading ? (
            <>
              <span className="spinner-small" />
              Processing...
            </>
          ) : (
            <>
              <PlayIcon />
              {currentAgent ? "Restart Pipeline" : "Start Pipeline"}
            </>
          )}
        </button>

        {isPipelineRunning && (
          <button className="btn-danger" onClick={onStop}>
            <StopIcon />
            Stop
          </button>
        )}

        {currentIteration > 1 && (
          <button className="btn-secondary" onClick={() => {}}>
            <RefreshIcon />
            View All Iterations
          </button>
        )}
      </div>
    </section>
  );
}
