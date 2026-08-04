import "./IterationLog.css";

export default function IterationLog({ iterations = [] }) {
  if (iterations.length === 0) return null;

  // Group by iteration
  const grouped = iterations.reduce((acc, item) => {
    if (!acc[item.iteration]) acc[item.iteration] = [];
    acc[item.iteration].push(item);
    return acc;
  }, {});

  const iterationNumbers = Object.keys(grouped).sort((a, b) => b - a);

  return (
    <section className="card iteration-section">
      <h2>Iteration Log</h2>
      
      {iterationNumbers.map((num) => (
        <div key={num} className="iteration-group">
          <div className="iteration-header">
            <span className="iteration-label">Iteration {num}</span>
            {parseInt(num) > 1 && <span className="revision-tag">Revision</span>}
          </div>
          <div className="iteration-items">
            {grouped[num].map((item, i) => (
              <div key={i} className={`log-item ${item.status}`}>
                <span className="log-agent">{item.agent}</span>
                <span className={`log-status ${item.status}`}>
                  {item.status === "approved" ? "Approved" :
                   item.status === "needs_revision" ? "Revision" :
                   item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
