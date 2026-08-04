import "./AgentStatus.css";

export default function AgentStatus({ statuses = {} }) {
  const agents = ["researcher", "writer", "editor"];

  return (
    <section className="card agent-status-section">
      <h2>Agent Status</h2>
      <div className="status-grid">
        {agents.map((a) => (
          <div key={a} className={`status-item ${statuses[a] || "waiting"}`}>
            <span className="agent-label">{a}</span>
            <span className="status-value">
              {statuses[a]?.replace(/_/g, " ") || "waiting"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
