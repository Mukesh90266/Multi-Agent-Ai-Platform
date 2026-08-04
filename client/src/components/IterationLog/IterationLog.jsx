import "./IterationLog.css";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
  </svg>
);

export default function IterationLog({ iterations = [] }) {
  if (iterations.length === 0) {
    return (
      <section className="card">
        <h2>Iteration Log</h2>
        <p className="no-logs">No pipeline run yet. Enter a topic to start.</p>
      </section>
    );
  }

  // Group iterations by iteration number
  const iterationGroups = iterations.reduce((acc, item) => {
    if (!acc[item.iteration]) {
      acc[item.iteration] = [];
    }
    acc[item.iteration].push(item);
    return acc;
  }, {});

  const iterationNumbers = Object.keys(iterationGroups).sort((a, b) => b - a);

  return (
    <section className="card iteration-log">
      <h2>Iteration Log</h2>
      
      <div className="iteration-summary">
        <span className="total-iterations">
          Total Iterations: {iterationNumbers.length}
        </span>
      </div>

      {iterationNumbers.map((iterationNum) => {
        const items = iterationGroups[iterationNum];
        const isRevision = parseInt(iterationNum) > 1;
        
        return (
          <div 
            key={iterationNum} 
            className={`iteration-group ${isRevision ? 'revision' : ''}`}
          >
            <div className="iteration-header">
              <span className="iteration-number">Iteration {iterationNum}</span>
              {isRevision && (
                <span className="revision-badge">
                  <RefreshIcon />
                  Revision
                </span>
              )}
            </div>
            
            <div className="iteration-items">
              {items.map((item, index) => (
                <div key={index} className={`log-item ${item.status}`}>
                  <div className="log-agent">
                    <span className={`status-icon ${item.status}`}>
                      {item.status === "completed" || item.status === "approved" ? (
                        <CheckIcon />
                      ) : item.status === "needs_revision" ? (
                        <RefreshIcon />
                      ) : null}
                    </span>
                    <span className="agent-name">{item.agent}</span>
                  </div>
                  <span className={`log-status ${item.status}`}>
                    {item.status === "approved" ? "Approved" : 
                     item.status === "needs_revision" ? "Needs Revision" :
                     item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
