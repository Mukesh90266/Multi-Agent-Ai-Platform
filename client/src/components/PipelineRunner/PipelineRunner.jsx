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

const agents = [
  { id: "researcher", name: "Researcher", icon: ResearcherIcon },
  { id: "writer", name: "Writer", icon: WriterIcon },
  { id: "editor", name: "Editor", icon: EditorIcon },
];

export default function PipelineRunner({
  agentStatus,
  currentAgent,
  currentIteration,
  maxIterations,
  loading,
  onRun
}) {
  const getAgentStatus = (agentId) => {
    if (currentAgent === agentId) return "running";
    return agentStatus?.[agentId] || "waiting";
  };

  return (
    <section className="pipeline-section">
      <div className="pipeline-header">
        <h2>Pipeline Status</h2>
        <div className="iteration-badge">
          Iteration {currentIteration} of {maxIterations}
        </div>
      </div>
      
      <div className="agent-cards">
        {agents.map((agent) => {
          const status = getAgentStatus(agent.id);
          return (
            <div key={agent.id} className={`agent-card ${status}`}>
              <div className="agent-icon-wrapper">
                <div className="agent-icon">
                  <agent.icon />
                </div>
                {status === "running" && (
                  <div className="running-indicator" />
                )}
              </div>
              <div className="agent-details">
                <span className="agent-name">{agent.name}</span>
                <span className="agent-status-label">
                  {status === "running" ? "Running" :
                   status === "completed" ? "Completed" : "Waiting"}
                </span>
              </div>
              {status === "completed" && (
                <div className="check-mark">✓</div>
              )}
              {status === "running" && (
                <div className="progress-ring">
                  <div className="progress-ring-inner" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button 
        className="run-button"
        onClick={onRun}
        disabled={loading}
      >
        {loading ? "Running..." : "Run Pipeline"}
      </button>
    </section>
  );
}
