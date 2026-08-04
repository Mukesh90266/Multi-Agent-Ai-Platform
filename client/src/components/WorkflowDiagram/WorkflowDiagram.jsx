import "./WorkflowDiagram.css";

export default function WorkflowDiagram({ currentAgent, agentStatus }) {
  const steps = [
    { id: "topic", label: "Enter Topic" },
    { id: "researcher", label: "Researcher" },
    { id: "writer", label: "Writer" },
    { id: "editor", label: "Editor" },
  ];

  const getStepStatus = (stepId) => {
    if (stepId === "topic") {
      return currentAgent || agentStatus?.researcher === "completed" ? "completed" : "waiting";
    }
    if (stepId === "researcher") {
      if (currentAgent === "researcher") return "running";
      if (agentStatus?.researcher === "completed") return "completed";
      return "waiting";
    }
    if (stepId === "writer") {
      if (currentAgent === "writer") return "running";
      if (agentStatus?.writer === "completed") return "completed";
      return "waiting";
    }
    if (stepId === "editor") {
      if (currentAgent === "editor") return "running";
      if (agentStatus?.editor === "completed") return "completed";
      return "waiting";
    }
    return "waiting";
  };

  return (
    <section className="workflow-section">
      <h2 className="workflow-title">Pipeline Workflow</h2>
      <div className="workflow-steps">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          return (
            <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
              <div className={`workflow-box ${status}`}>
                <span className="step-number">{index + 1}</span>
                <span className="step-label">{step.label}</span>
                <span className="step-status-text">
                  {status === "completed" ? "Completed" : 
                   status === "running" ? "Running" : "Waiting"}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="arrow">→</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
