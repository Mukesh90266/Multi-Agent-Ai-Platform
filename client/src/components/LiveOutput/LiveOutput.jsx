import { useEffect, useMemo, useState } from "react";

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);
const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);
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
const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
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
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

function formatOutput(output) {
  if (!output) return "";
  if (typeof output === "string") return output;
  if (typeof output.content === "string") return output.content;
  if (typeof output.optimizedContent === "string")
    return output.optimizedContent;
  return JSON.stringify(output, null, 2);
}

function formatToolResultSummary(result) {
  if (!result) return "No result";
  if (typeof result === "string") return result;
  if (result.summary) return result.summary;
  if (result.error) return `Error: ${result.error}`;
  return JSON.stringify(result);
}

function ToolCallsPanel({ toolCalls }) {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return null;

  return (
    <div className="tool-calls-panel">
      <div className="tool-calls-header">
        <span>Tool calls during this agent</span>
        <span>
          {toolCalls.length} call{toolCalls.length === 1 ? "" : "s"}
        </span>
      </div>
      {toolCalls.map((call, index) => (
        <div
          className={`tool-call-item ${call.ok === false ? "failed" : "ok"}`}
          key={`${call.tool}-${call.timestamp || index}-${index}`}
        >
          <div className="tool-call-title-row">
            <span className="tool-call-name">{call.toolName || call.tool}</span>
            <span className="tool-call-badge">{call.ok === false ? "failed" : "ok"}>
              {call.ok === false ? "Failed" : "OK"}
            </span>
          </div>
          {call.reason && <div className="tool-call-reason">{call.reason}</div>}
          {call.args && Object.keys(call.args).length > 0 && (
            <div className="tool-call-args">
              Args: {JSON.stringify(call.args)}
            </div>
          )}
          <div className="tool-call-result">
            {formatToolResultSummary(call.result)}
          </div>
        </div>
      ))}
    </div>
  );
}

function getAgentIcon(step) {
  if (step.agentId === "researcher") return SearchIcon;
  if (step.agentId === "writer") return PenIcon;
  if (step.agentId === "editor") return EditIcon;
  return BotIcon;
}

function normalizeStatus(status) {
  if (status === "error") return "failed";
  return status || "waiting";
}

function getStatusLabel(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "running") return "Running";
  if (normalized === "completed") return "Completed";
  if (normalized === "failed") return "Failed";
  if (normalized === "skipped") return "Skipped";
  return "Waiting";
}

function getStatusDescription(step, status, hasOutput) {
  const normalized = normalizeStatus(status);
  if (normalized === "running")
    return `${step.name} is executing now. Output will stream into this card when the step finishes.`;
  if (normalized === "completed" && hasOutput)
    return `${step.name} completed and generated output.`;
  if (normalized === "completed")
    return `${step.name} completed, but no output was captured.`;
  if (normalized === "failed") return `${step.name} failed while running.`;
  if (normalized === "skipped")
    return `${step.name} was skipped by the pipeline.`;
  return `${step.name} is waiting for its turn in this pipeline.`;
}

function getProgressWidth(status) {
  const normalized = normalizeStatus(status);
  if (
    normalized === "completed" ||
    normalized === "skipped" ||
    normalized === "failed"
  )
    return "100%";
  if (normalized === "running") return "60%";
  return "0%";
}

function getStatusIcon(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "completed" || normalized === "skipped") return CheckIcon;
  if (normalized === "running") return LoaderIcon;
  if (normalized === "failed") return AlertIcon;
  return ClockIcon;
}

function buildFallbackStepsFromOutputs(outputs) {
  const seen = new Set();
  const steps = [];

  outputs.forEach((entry, index) => {
    const key = entry.stepId || entry.agentId || `${entry.agentName}-${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    steps.push({
      stepId: key,
      index,
      agentId: entry.agentId || key,
      name: entry.agentName || entry.agentId || `Agent ${index + 1}`,
      type: entry.type || "custom",
      role: entry.role || "",
      phase: entry.phase || "agent",
    });
  });

  return steps;
}

function outputBlockTitle(output, index, total) {
  const parts = [];
  if (total > 1) parts.push(`Run ${index + 1}`);
  if (output.iteration != null) parts.push(`Iteration ${output.iteration}`);
  if (output.phase) parts.push(output.phase);
  return parts.join(" · ") || `Output ${index + 1}`;
}

function FinalOutputCard({ finalOutput }) {
  const content = finalOutput?.content || formatOutput(finalOutput?.output);

  if (!content) return null;

  return (
    <div className="final-output-card">
      <div className="final-output-header">
        <div className="final-output-title-wrap">
          <div className="final-output-icon">
            <FileIcon />
          </div>
          <div>
            <div className="final-output-title">Final Output</div>
            <div className="final-output-subtitle">
              {finalOutput?.agentName
                ? `Produced from ${finalOutput.agentName}`
                : finalOutput?.type
                  ? `Final ${finalOutput.type} result`
                  : "Final pipeline result"}
            </div>
          </div>
        </div>
        <span className="final-output-badge">Ready</span>
      </div>
      <pre className="final-output-pre">{content}</pre>
    </div>
  );
}

function DynamicAgentCard({ step, status, outputs, error }) {
  const Icon = getAgentIcon(step);
  const StatusIcon = getStatusIcon(status);
  const normalizedStatus = normalizeStatus(status);
  const hasOutput = outputs.length > 0;
  const assignedTools = Array.isArray(step.tools) ? step.tools : [];
  const allToolCalls = outputs.flatMap((entry) =>
    Array.isArray(entry.toolCalls)
      ? entry.toolCalls
      : Array.isArray(entry.output?.toolCalls)
        ? entry.output.toolCalls
        : []
  );

  return (
    <div className={`live-agent-card ${normalizedStatus}`}>
      <div className="live-agent-card-top">
        <div
          className={`live-agent-icon ${step.agentId} ${step.type || "custom"}`}
        >
          <Icon />
        </div>
        <div className="live-agent-heading">
          <div className="live-agent-title-row">
            <span className="live-agent-name">{step.name}</span>
            <span className={`live-agent-type ${step.type || "custom"}`}>
              {step.type === "built-in" ? "Built-in" : "Custom"}
            </span>
          </div>
          {step.role && <div className="live-agent-role">{step.role}</div>}
          {assignedTools.length > 0 && (
            <div className="live-agent-tools">
              {assignedTools.map((toolId) => (
                <span key={toolId} className="tool-chip">
                  {toolId === "web_search"
                    ? "Web Search"
                    : toolId === "verification_api"
                      ? "Verification"
                      : toolId}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={`live-agent-status ${normalizedStatus}`}>
          <StatusIcon />
          <span>{getStatusLabel(normalizedStatus)}</span>
        </div>
      </div>

      <div className="live-agent-progress">
        <div
          className={`live-agent-progress-fill ${normalizedStatus}`}
          style={{ width: getProgressWidth(normalizedStatus) }}
        />
      </div>

      <div className="live-agent-description">
        {getStatusDescription(step, normalizedStatus, hasOutput)}
      </div>

      {normalizedStatus === "failed" && error && (
        <div className="live-agent-error">{error}</div>
      )}

      <ToolCallsPanel toolCalls={allToolCalls} />

      <div className="live-agent-output-section">
        <div className="live-agent-output-header">
          <span>Generated output</span>
          <span>
            {outputs.length
              ? `${outputs.length} item${outputs.length === 1 ? "" : "s"}`
              : "No output yet"}
          </span>
        </div>

        {outputs.length > 0 ? (
          outputs.map((entry, index) => (
            <div
              className="live-agent-output-block"
              key={`${step.stepId}-${entry.timestamp || index}-${index}`}
            >
              <div className="live-agent-output-meta">
                <span>{outputBlockTitle(entry, index, outputs.length)}</span>
                {entry.summary && <span>{entry.summary}</span>}
              </div>
              <pre className="live-agent-output-pre">
                {formatOutput(entry.output)}
              </pre>
            </div>
          ))
        ) : (
          <div className="live-agent-output-empty">
            {normalizedStatus === "running"
              ? "Running now — output will appear here after this agent finishes."
              : normalizedStatus === "waiting"
                ? "Waiting for this agent to execute."
                : normalizedStatus === "failed"
                  ? "No output was generated before failure."
                  : "No output captured for this agent."}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveOutput({
  result,
  loading,
  pipelineSteps = [],
  agentStatus = {},
}) {
  const [activeStepId, setActiveStepId] = useState("all");
  const [copied, setCopied] = useState(false);

  const agentOutputs = result?.agentOutputs || [];
  const finalOutputContent =
    result?.finalOutput?.content || formatOutput(result?.finalOutput?.output);
  const hasFinalOutput = Boolean(finalOutputContent?.trim());
  const isFinalOutputTab = activeStepId === "__final__";

  const steps = useMemo(() => {
    const currentSteps = result?.pipeline?.steps?.length
      ? result.pipeline.steps
      : pipelineSteps;
    if (currentSteps?.length) return currentSteps;
    return buildFallbackStepsFromOutputs(agentOutputs);
  }, [agentOutputs, pipelineSteps, result?.pipeline?.steps]);

  const outputsByStepId = useMemo(() => {
    const grouped = new Map();

    agentOutputs.forEach((entry) => {
      const key = entry.stepId || entry.agentId;
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(entry);
    });

    return grouped;
  }, [agentOutputs]);

  const getStepStatus = (step) => {
    const rawStatus =
      agentStatus?.[step.stepId] ||
      result?.agentStatus?.[step.stepId] ||
      agentStatus?.[step.agentId] ||
      result?.agentStatus?.[step.agentId];

    if (rawStatus) return normalizeStatus(rawStatus);
    if (outputsByStepId.has(step.stepId) || outputsByStepId.has(step.agentId))
      return "completed";
    return "waiting";
  };

  useEffect(() => {
    if (activeStepId === "all") return;
    if (activeStepId === "__final__") {
      if (!hasFinalOutput) setActiveStepId("all");
      return;
    }
    const stillExists = steps.some((step) => step.stepId === activeStepId);
    if (!stillExists) setActiveStepId("all");
  }, [activeStepId, hasFinalOutput, steps]);

  const visibleSteps =
    activeStepId === "all"
      ? steps
      : isFinalOutputTab
        ? []
        : steps.filter((step) => step.stepId === activeStepId);

  const agentOutputText = visibleSteps
    .map((step, index) => {
      const outputs =
        outputsByStepId.get(step.stepId) ||
        outputsByStepId.get(step.agentId) ||
        [];
      const status = getStatusLabel(getStepStatus(step));
      const outputContent = outputs.length
        ? outputs
            .map(
              (entry, outputIndex) =>
                `## ${outputBlockTitle(entry, outputIndex, outputs.length)}\n${formatOutput(entry.output)}`,
            )
            .join("\n\n")
        : "No output yet.";

      return `# ${index + 1}. ${step.name} — ${status}\n${outputContent}`;
    })
    .join("\n\n---\n\n");

  const outputText = isFinalOutputTab
    ? `# Final Output\n${finalOutputContent}`
    : [
        hasFinalOutput && activeStepId === "all"
          ? `# Final Output\n${finalOutputContent}`
          : "",
        agentOutputText,
      ]
        .filter(Boolean)
        .join("\n\n---\n\n");

  const hasAnyOutput = agentOutputs.length > 0 || hasFinalOutput;
  const hasSelectedSteps = steps.length > 0;
  const canCopy = Boolean(outputText.trim()) && hasSelectedSteps;
  const completedCount = steps.filter(
    (step) => getStepStatus(step) === "completed",
  ).length;
  const runningCount = steps.filter(
    (step) => getStepStatus(step) === "running",
  ).length;
  const failedCount = steps.filter(
    (step) => getStepStatus(step) === "failed",
  ).length;

  const handleCopy = () => {
    if (!canCopy) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="live-output-card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-header-icon">
            <BoltIcon />
          </div>
          <div>
            <div className="card-header-title">Live Output Dashboard</div>
            <div className="card-header-subtitle">
              {loading
                ? "Showing the exact agents selected for this run"
                : hasSelectedSteps
                  ? "Dynamic status and generated output for the selected pipeline"
                  : "Select agents and run a pipeline to see live output"}
            </div>
          </div>
        </div>
        <div className="card-header-right">
          <ExpandIcon />
        </div>
      </div>

      <div className="dynamic-tabs-container">
        <button
          type="button"
          className={`dynamic-tab ${activeStepId === "all" ? "active" : ""}`}
          onClick={() => setActiveStepId("all")}
        >
          <BotIcon />
          All selected agents
        </button>
        {steps.map((step) => {
          const Icon = getAgentIcon(step);
          const status = getStepStatus(step);
          return (
            <button
              type="button"
              key={step.stepId}
              className={`dynamic-tab ${activeStepId === step.stepId ? "active" : ""}`}
              onClick={() => setActiveStepId(step.stepId)}
            >
              <Icon />
              {step.name}
              <span className={`dynamic-tab-status ${status}`} />
            </button>
          );
        })}
        {hasFinalOutput && (
          <button
            type="button"
            className={`dynamic-tab ${isFinalOutputTab ? "active" : ""}`}
            onClick={() => setActiveStepId("__final__")}
          >
            <FileIcon />
            Final Output
            <span className="dynamic-tab-status completed" />
          </button>
        )}
      </div>

      <div className="file-status-bar dynamic-file-status">
        <div className="file-info">
          <div
            className={`file-dot ${failedCount > 0 ? "failed" : runningCount > 0 ? "running" : hasAnyOutput ? "completed" : "waiting"}`}
          />
          <span className="file-name">
            {isFinalOutputTab
              ? "final-output.md"
              : activeStepId === "all"
                ? "dynamic-agent-dashboard"
                : `${visibleSteps[0]?.name || "agent"}-output`}
          </span>
          <span className="dynamic-run-summary">
            {steps.length} selected · {completedCount} completed ·{" "}
            {runningCount} running
            {failedCount ? ` · ${failedCount} failed` : ""}
          </span>
        </div>
        <div className="file-actions">
          <span className="line-count">
            {outputText ? `${outputText.split("\n").length} lines` : "0 lines"}
          </span>
          <button className="copy-btn" onClick={handleCopy} disabled={!canCopy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="dynamic-dashboard-scroll">
        {!hasSelectedSteps ? (
          <div className="empty-state compact-empty">
            <div className="empty-icon">
              <ClipboardIcon />
            </div>
            <div className="empty-title">No agents selected</div>
            <div className="empty-subtitle">
              Build a pipeline to populate this dashboard.
            </div>
          </div>
        ) : isFinalOutputTab ? (
          <FinalOutputCard finalOutput={result?.finalOutput} />
        ) : (
          <>
            {hasFinalOutput && activeStepId === "all" && (
              <FinalOutputCard finalOutput={result?.finalOutput} />
            )}
            <div className="dynamic-agent-grid">
              {visibleSteps.map((step) => {
                const outputs =
                  outputsByStepId.get(step.stepId) ||
                  outputsByStepId.get(step.agentId) ||
                  [];
                return (
                  <DynamicAgentCard
                    key={step.stepId}
                    step={step}
                    status={getStepStatus(step)}
                    outputs={outputs}
                    error={result?.error}
                  />
                );
              })}
            </div>
          </>
        )}

        {loading && (
          <div className="live-loading-bar">
            <div className="loading-spinner-small"></div>
            <span>Pipeline running...</span>
          </div>
        )}
      </div>
    </div>
  );
}
