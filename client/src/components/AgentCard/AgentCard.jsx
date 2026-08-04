import "./AgentCard.css";

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

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default function AgentCard({ result, loading, error }) {
  const getAgentStatus = (agentId) => {
    if (loading && !result) return "waiting";
    return result?.agentStatus?.[agentId] || "waiting";
  };

  const agents = [
    {
      id: "researcher",
      name: "Researcher",
      icon: SearchIcon,
      description: "Research collected successfully",
      runningText: "Collecting research data...",
      waitingText: "Waiting for input",
    },
    {
      id: "writer",
      name: "Writer",
      icon: PenIcon,
      description: "Generating draft content...",
      runningText: "Generating content...",
      waitingText: "Waiting for research",
    },
    {
      id: "editor",
      name: "Editor",
      icon: EditIcon,
      description: "Reviewing draft content...",
      runningText: "Reviewing content...",
      waitingText: "Waiting for writer",
    },
  ];

  return (
    <div className="card agent-card-container">
      <div className="card-header">
        <div>
          <h3>Pipeline Status</h3>
          <p className="subtitle">Live execution progress</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="agent-list">
        {agents.map((agent) => {
          const status = getAgentStatus(agent.id);
          const isRunning = status === "running";
          const isCompleted = status === "completed";

          return (
            <div key={agent.id} className={`agent-item ${agent.id} ${status}`}>
              <div className={`agent-icon ${status}`}>
                <agent.icon />
              </div>
              
              <div className="agent-info">
                <div className="agent-name-row">
                  <span className="agent-name">{agent.name}</span>
                  <span className={`status-badge ${status}`}>
                    {isCompleted && <CheckIcon />}
                    {status === "completed" && "Completed"}
                    {status === "running" && "Running"}
                    {status === "waiting" && "Waiting"}
                  </span>
                </div>
                <p className="agent-description">
                  {isRunning ? agent.runningText : 
                   isCompleted ? agent.description :
                   agent.waitingText}
                </p>
              </div>

              <div className="agent-right">
                {isCompleted && (
                  <div className="check-circle">
                    <CheckIcon />
                  </div>
                )}
                {isRunning && (
                  <div className="loader-ring">
                    <div className="loader-ring-inner" />
                  </div>
                )}
                {status === "waiting" && (
                  <div className="clock-icon">
                    <ClockIcon />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
