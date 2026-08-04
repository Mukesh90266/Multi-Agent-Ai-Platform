import "./AgentStatus.css";
export default function AgentStatus({ statuses = {} }) {
  const agents = ["researcher", "writer", "editor"];
  return (
    <section className="card">
      <h2>Agent status</h2>
      <div className="agent-list">
        {agents.map((a) => (
          <div key={a} className={`agent ${statuses[a] || "waiting"}`}>
            <b>{a}</b>
            <span>{(statuses[a] || "waiting").replaceAll("_", " ")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
