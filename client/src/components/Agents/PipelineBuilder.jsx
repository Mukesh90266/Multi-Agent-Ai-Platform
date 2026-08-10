import { useState } from "react";

const ArrowUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
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

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </svg>
);

const GripIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

export default function PipelineBuilder({
  selectedSteps,
  agentsById,
  onMoveStep,
  onReorderStep,
  onRemoveStep,
  onResetDefault,
  disabled,
  isDefaultPipeline
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const clearDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragStart = (event, index) => {
    if (disabled) return;
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (event, index) => {
    if (disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = (event, targetIndex) => {
    if (disabled) return;
    event.preventDefault();

    const rawSourceIndex = event.dataTransfer.getData("text/plain");
    const sourceIndexFromEvent = Number(rawSourceIndex);
    const sourceIndex = rawSourceIndex !== "" && Number.isInteger(sourceIndexFromEvent)
      ? sourceIndexFromEvent
      : draggedIndex;

    if (sourceIndex != null && sourceIndex !== targetIndex) {
      onReorderStep?.(sourceIndex, targetIndex);
    }

    clearDragState();
  };

  return (
    <div className="pipeline-builder">
      <div className="section-header-row">
        <span className="section-title">Pipeline Builder</span>
        <button type="button" className="reset-pipeline-btn" onClick={onResetDefault} disabled={disabled}>
          <RefreshIcon /> Reset
        </button>
      </div>

      <div className="pipeline-builder-hint">
        Select agents from the library, then drag & drop or use arrows to reorder the exact execution sequence.
      </div>

      {isDefaultPipeline && (
        <div className="default-pipeline-badge">
          Default pre-built pipeline: Researcher runs once, then Writer ↔ Editor can revise up to 3 times.
        </div>
      )}

      {selectedSteps.length === 0 ? (
        <div className="pipeline-empty">Add at least one agent to run a pipeline.</div>
      ) : (
        <div className="pipeline-step-list" onDragLeave={() => setDragOverIndex(null)}>
          {selectedSteps.map((step, index) => {
            const agent = agentsById.get(step.agentId);
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index && draggedIndex !== index;

            return (
              <div
                className={`pipeline-step-card ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
                key={step.clientId}
                draggable={!disabled}
                onDragStart={(event) => handleDragStart(event, index)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={(event) => handleDrop(event, index)}
                onDragEnd={clearDragState}
              >
                <div className="pipeline-step-drag-handle" title="Drag to reorder">
                  <GripIcon />
                </div>
                <div className="pipeline-step-number">{index + 1}</div>
                <div className="pipeline-step-main">
                  <div className="pipeline-step-name">{agent?.name || step.agentId}</div>
                  <div className="pipeline-step-role">{agent?.role || "Agent configuration missing"}</div>
                </div>
                <div className="pipeline-step-actions">
                  <button type="button" onClick={() => onMoveStep(index, -1)} disabled={disabled || index === 0} title="Move up">
                    <ArrowUpIcon />
                  </button>
                  <button type="button" onClick={() => onMoveStep(index, 1)} disabled={disabled || index === selectedSteps.length - 1} title="Move down">
                    <ArrowDownIcon />
                  </button>
                  <button type="button" onClick={() => onRemoveStep(index)} disabled={disabled} title="Remove">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
