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

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

function getIcon(agent) {
  if (agent.id === "researcher") return SearchIcon;
  if (agent.id === "writer") return PenIcon;
  if (agent.id === "editor") return EditIcon;
  return BotIcon;
}

function AgentCard({ agent, onAddAgent, onDeleteAgent, disabled }) {
  const Icon = getIcon(agent);
  const canDelete = agent.type === "custom" && !agent.immutable;

  return (
    <div className={`library-agent-card ${agent.type}`}>
      <div className={`library-agent-icon ${agent.id}`}><Icon /></div>
      <div className="library-agent-body">
        <div className="library-agent-title-row">
          <span className="library-agent-name">{agent.name}</span>
          <span className={`library-agent-badge ${agent.type}`}>
            {agent.type === "built-in" ? "Built-in" : "Custom"}
          </span>
        </div>
        <p className="library-agent-role">{agent.role}</p>
        {agent.personality && (
          <div className="library-agent-personality">{agent.personality}</div>
        )}
      </div>
      <div className="library-agent-actions">
        <button
          type="button"
          className="library-add-btn"
          onClick={() => onAddAgent(agent.id)}
          disabled={disabled}
          title={`Add ${agent.name} to pipeline`}
        >
          <PlusIcon />
        </button>
        {canDelete && (
          <button
            type="button"
            className="library-delete-btn"
            onClick={() => onDeleteAgent(agent)}
            disabled={disabled}
            title={`Delete ${agent.name}`}
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AgentLibrary({ agents, onAddAgent, onDeleteAgent, disabled }) {
  const builtInAgents = agents.filter((agent) => agent.type === "built-in");
  const customAgents = agents.filter((agent) => agent.type === "custom");

  return (
    <div className="agent-library">
      <div className="section-header-row agent-library-header">
        <span className="section-title">Agent Library</span>
        <span className="section-subtitle">{agents.length} available</span>
      </div>

      <div className="library-group-label">Built-in agents</div>
      <div className="library-list">
        {builtInAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onAddAgent={onAddAgent}
            onDeleteAgent={onDeleteAgent}
            disabled={disabled}
          />
        ))}
      </div>

      <div className="library-group-label custom-label">Custom agents</div>
      {customAgents.length > 0 ? (
        <div className="library-list">
          {customAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onAddAgent={onAddAgent}
              onDeleteAgent={onDeleteAgent}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        <div className="library-empty-custom">
          No custom agents yet. Use Agent Builder to create one with its own system prompt.
        </div>
      )}
    </div>
  );
}
