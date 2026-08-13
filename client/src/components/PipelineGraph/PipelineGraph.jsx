import { useEffect, useMemo, useState } from "react";

const NODE_W = 178;
const NODE_H = 76;
const LEVEL_GAP = 96;
const NODE_GAP = 20;
const PAD = 24;
const GROUP_PAD = 13;
const GROUP_LABEL_H = 26;

const TOOL_EMOJI = {
  web_search: "🌐",
  verification_api: "🛡️"
};

const STATUS_LABEL = {
  waiting: "Waiting",
  running: "Running",
  completed: "Done",
  error: "Failed",
  failed: "Failed",
  skipped: "Skipped"
};

function getStepStatus(step, agentStatus, result) {
  const raw =
    agentStatus?.[step.stepId] ||
    result?.agentStatus?.[step.stepId] ||
    agentStatus?.[step.agentId] ||
    result?.agentStatus?.[step.agentId];
  return raw || "waiting";
}

function outputsForStep(result, step) {
  return (result?.agentOutputs || []).filter(
    (entry) => entry.stepId === step.stepId || entry.agentId === step.agentId
  );
}

function formatDuration(ms) {
  if (ms == null) return null;
  if (ms < 1000) return `${Math.max(ms, 1)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function deriveLevels(steps, result) {
  const scheduled = result?.schedule?.levels;
  const stepIds = new Set(steps.map((s) => s.stepId));
  if (
    Array.isArray(scheduled) &&
    scheduled.length &&
    scheduled.every((level) => Array.isArray(level) && level.every((id) => stepIds.has(id)))
  ) {
    return scheduled;
  }
  // Fallback (no run yet): pipeline order as a simple left-to-right chain.
  return steps.map((step) => [step.stepId]);
}

function deriveEdges(steps, levels, result) {
  const scheduleEdges = result?.schedule?.edges;
  const stepIds = new Set(steps.map((s) => s.stepId));
  const edges = new Map();

  if (scheduleEdges && Object.keys(scheduleEdges).length) {
    for (const [stepId, deps] of Object.entries(scheduleEdges)) {
      if (!stepIds.has(stepId)) continue;
      const valid = (Array.isArray(deps) ? deps : []).filter((d) => stepIds.has(d));
      edges.set(stepId, valid);
    }
    return edges;
  }

  // Linear fallback: each step connects from the previous one.
  steps.forEach((step, index) => {
    edges.set(step.stepId, index > 0 ? [steps[index - 1].stepId] : []);
  });
  return edges;
}

function computeLayout(levels) {
  const maxInLevel = Math.max(...levels.map((l) => l.length), 1);
  const hasGroup = levels.some((l) => l.length > 1);

  const canvasH =
    PAD * 2 +
    GROUP_LABEL_H +
    maxInLevel * NODE_H +
    Math.max(0, maxInLevel - 1) * NODE_GAP +
    (hasGroup ? GROUP_PAD * 2 : 0);

  const positions = new Map();
  levels.forEach((level, li) => {
    const groupH = level.length * NODE_H + Math.max(0, level.length - 1) * NODE_GAP;
    const startY = (canvasH - groupH) / 2;
    const x = PAD + li * (NODE_W + LEVEL_GAP);
    level.forEach((stepId, ni) => {
      positions.set(stepId, {
        x,
        y: startY + ni * (NODE_H + NODE_GAP),
        level: li
      });
    });
  });

  const canvasW = PAD * 2 + levels.length * NODE_W + Math.max(0, levels.length - 1) * LEVEL_GAP;
  return { positions, canvasW, canvasH };
}

/**
 * Dependency-graph view of the pipeline run.
 * Reads schedule.levels / schedule.edges from live run state (additive
 * backend fields); without a run it previews the selected pipeline as a
 * simple chain. Purely presentational — no behavior changes.
 */
export default function PipelineGraph({ steps = [], agentStatus = {}, result = null, loading = false, currentAgent = null }) {
  const levels = useMemo(() => deriveLevels(steps, result), [steps, result]);
  const edges = useMemo(() => deriveEdges(steps, levels, result), [steps, levels, result]);
  const { positions, canvasW, canvasH } = useMemo(() => computeLayout(levels), [levels]);

  const stepById = useMemo(() => new Map(steps.map((s) => [s.stepId, s])), [steps]);

  if (!steps.length) {
    return <div className="pg-empty">Select agents in the Pipeline Builder to preview the execution graph.</div>;
  }

  return (
    <div className="pg-scroll">
      <div className="pg-canvas" style={{ width: canvasW, height: canvasH }}>
        {/* Edges */}
        <svg className="pg-edges" width={canvasW} height={canvasH}>
          <defs>
            <marker id="pg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#c4b5fd" />
            </marker>
          </defs>
          {[...edges.entries()].flatMap(([targetId, deps]) =>
            deps.map((depId) => {
              const from = positions.get(depId);
              const to = positions.get(targetId);
              if (!from || !to) return null;
              const x1 = from.x + NODE_W;
              const y1 = from.y + NODE_H / 2;
              const x2 = to.x;
              const y2 = to.y + NODE_H / 2;
              const mx = x1 + (x2 - x1) / 2;
              const targetStatus = getStepStatus(stepById.get(targetId) || {}, agentStatus, result);
              return (
                <path
                  key={`${depId}->${targetId}`}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  className={`pg-edge ${targetStatus === "running" ? "active" : ""}`}
                  markerEnd="url(#pg-arrow)"
                />
              );
            })
          )}
        </svg>

        {/* Parallel group boxes */}
        {levels.map((level, li) => {
          if (level.length < 2) return null;
          const boxes = level.map((id) => positions.get(id)).filter(Boolean);
          const minX = Math.min(...boxes.map((p) => p.x)) - GROUP_PAD;
          const maxX = Math.max(...boxes.map((p) => p.x)) + NODE_W + GROUP_PAD;
          const minY = Math.min(...boxes.map((p) => p.y)) - GROUP_PAD - GROUP_LABEL_H;
          const maxY = Math.max(...boxes.map((p) => p.y)) + NODE_H + GROUP_PAD;
          return (
            <div
              key={`group-${li}`}
              className="pg-group"
              style={{ left: minX, top: minY, width: maxX - minX, height: maxY - minY }}
            >
              <span className="pg-group-label">Level {li + 1} — parallel</span>
            </div>
          );
        })}

        {/* Nodes */}
        {steps.map((step) => {
          const pos = positions.get(step.stepId);
          if (!pos) return null;
          const status = getStepStatus(step, agentStatus, result);
          const outputs = outputsForStep(result, step);
          const latest = outputs[outputs.length - 1];
          const duration = formatDuration(latest?.durationMs);
          const isCurrent = currentAgent && step.agentId === currentAgent;
          const tools = Array.isArray(step.tools) ? step.tools : [];

          return (
            <div
              key={step.stepId}
              className={`pg-node st-${status} ${isCurrent ? "current" : ""}`}
              style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
              title={result?.schedule?.reasons?.[step.stepId] || step.name}
            >
              <div className="pg-node-row">
                <span className={`pg-dot st-${status}`} />
                <span className="pg-name">{step.name}</span>
              </div>
              <div className="pg-chips">
                <span className={`pg-chip st-${status}`}>
                  {STATUS_LABEL[status] || status}
                </span>
                {duration && <span className="pg-chip time">{duration}</span>}
              </div>
              {tools.length > 0 && (
                <div className="pg-tools">
                  {tools.map((tool) => (
                    <span key={tool} className="pg-tool" title={tool}>
                      {TOOL_EMOJI[tool] || "⚙️"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact meta strip: elapsed time + completion progress for a run.
 */
export function RunMetaStrip({ result, loading, agentStatus = {}, steps = [] }) {
  const [now, setNow] = useState(() => Date.now());

  const outputs = result?.agentOutputs || [];
  const startedAt = outputs.find((o) => o.startedAt)?.startedAt || null;
  const anyRunning = Object.values(agentStatus || {}).includes("running");

  useEffect(() => {
    if (!loading && !anyRunning) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [loading, anyRunning]);

  const completedCount = Object.values(agentStatus || {}).filter((s) => s === "completed").length;
  const total = steps.length || Object.keys(agentStatus || {}).length;

  let elapsed = null;
  if (startedAt) {
    const completedTimes = outputs.map((o) => o.completedAt).filter(Boolean);
    const end = anyRunning || loading
      ? now
      : completedTimes.length
        ? new Date(completedTimes[completedTimes.length - 1]).getTime()
        : now;
    elapsed = Math.max(0, end - new Date(startedAt).getTime());
  }

  const pct = total ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="run-meta">
      {elapsed != null && <span className="run-meta-item">⏱ {formatDuration(elapsed)} elapsed</span>}
      <span className="run-meta-item">{completedCount} of {total} agents done</span>
      <span className="run-meta-bar">
        <span className="run-meta-fill" style={{ width: `${pct}%` }} />
      </span>
      {loading && <span className="run-meta-live">● live</span>}
    </div>
  );
}
