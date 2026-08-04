import "./WorkflowDiagram.css";

const ResearcherIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
    <path d="M11 8v6M8 11h6" />
  </svg>
);

const WriterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

const EditorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ArrowIcon = ({ completed }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FeedbackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const TopicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const FinalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default function WorkflowDiagram({ currentAgent, agentStatus, editorDecision, currentIteration }) {
  const steps = [
    { id: "topic", label: "User Input", icon: TopicIcon, agent: null },
    { id: "researcher", label: "Researcher", icon: ResearcherIcon, agent: "researcher" },
    { id: "writer", label: "Writer", icon: WriterIcon, agent: "writer" },
    { id: "editor", label: "Editor", icon: EditorIcon, agent: "editor" },
    { id: "final", label: "Final Output", icon: FinalIcon, agent: null },
  ];

  const getStepStatus = (step) => {
    if (step.agent === null) {
      // Topic input - always completed when pipeline starts
      if (currentAgent) return "completed";
      return "waiting";
    }

    const status = agentStatus?.[step.agent];
    
    if (step.agent === currentAgent) return "active";
    if (status === "completed") return "completed";
    if (status === "error") return "error";
    return "waiting";
  };

  const getArrowStatus = (index) => {
    const nextStep = steps[index + 1];
    const currentStep = steps[index];
    
    if (currentStep.agent === currentAgent) return "active";
    if (nextStep.agent && agentStatus?.[nextStep.agent] === "completed") return "completed";
    return "";
  };

  return (
    <section className="workflow-diagram">
      <h2 className="workflow-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Pipeline Workflow
        {currentIteration > 1 && (
          <span className="iteration-badge">Iteration {currentIteration}</span>
        )}
      </h2>

      <div className="workflow-container">
        {steps.map((step, index) => (
          <>
            <div className="workflow-step" key={step.id}>
              <div className={`step-circle ${getStepStatus(step)}`}>
                <step.icon />
                {getStepStatus(step) === "completed" && (
                  <span style={{ position: "absolute", bottom: -2, right: -2 }}>
                    <CheckIcon />
                  </span>
                )}
              </div>
              <span className="step-label">{step.label}</span>
              <span className={`step-status ${getStepStatus(step)}`}>
                {step.agent && agentStatus?.[step.agent]?.replace(/_/g, " ")}
                {!step.agent && index === 0 && currentAgent && "Completed"}
                {!step.agent && index === steps.length - 1 && editorDecision && editorDecision}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`workflow-arrow ${getArrowStatus(index)}`} key={`arrow-${index}`}>
                <ArrowIcon completed={getArrowStatus(index) === "completed"} />
              </div>
            )}
          </>
        ))}
      </div>

      {/* Feedback Loop Indicator */}
      {editorDecision === "needs_revision" && (
        <div className="feedback-loop-indicator">
          <FeedbackIcon />
          <span>Feedback Loop Active - Sending back to Writer Agent</span>
        </div>
      )}

      {/* Editor Decision Display */}
      {editorDecision && (
        <div className="workflow-branch">
          <span className="branch-label">Editor Decision:</span>
          <div className={`decision-box ${editorDecision === "approved" ? "approved" : "needs-revision"}`}>
            <span className="decision-text">
              {editorDecision === "approved" ? "✓ Approved" : "⟲ Needs Revision"}
            </span>
            {editorDecision === "approved" && (
              <span style={{ fontSize: "0.8rem", color: "#166534" }}>
                Content ready for publication!
              </span>
            )}
            {editorDecision === "needs_revision" && (
              <span style={{ fontSize: "0.8rem", color: "#92400e" }}>
                Sending to Writer for improvements...
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
