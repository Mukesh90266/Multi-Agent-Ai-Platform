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
    </div>
  );
}
