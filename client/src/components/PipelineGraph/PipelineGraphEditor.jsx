import { useEffect, useMemo, useRef, useState } from "react";

const NODE_W = 178;
const NODE_H = 76;
const LEVEL_GAP = 96;
const NODE_GAP = 20;
const PAD = 26;

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

function formatDuration(ms) {
  if (ms == null) return null;
  return ms < 1000 ? `${Math.max(ms, 1)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** Kahn leveling on client-side edges; falls back gracefully on cycles. */
function computeLevels(nodes, edges) {
  const ids = nodes.map((n) => n.clientId);
  const depth = new Map(ids.map((id) => [id, 0]));
  const adj = new Map(ids.map((id) => [id, []]));
  for (const e of edges) {
    if (!depth.has(e.from) || !depth.has(e.to)) continue;
    adj.get(e.from).push(e.to);
    depth.set(e.to, depth.get(e.to) + 1);
  }
  const queue = ids.filter((id) => depth.get(id) === 0);
  const levels = [];
  const placed = new Set();
  while (placed.size < ids.length) {
    const ready = queue.splice(0, queue.length);
    if (!ready.length) {
      // cycle → one node per level in original order
      return ids.filter((id) => !placed.has(id)).map((id) => [id]);
    }
    levels.push(ready);
    for (const id of ready) {
      placed.add(id);
      for (const next of adj.get(id)) {
        depth.set(next, depth.get(next) - 1);
        if (depth.get(next) === 0) queue.push(next);
      }
    }
  }
  return levels;
}

function autoLayout(nodes, edges) {
  const levels = computeLevels(nodes, edges);
  const maxInLevel = Math.max(...levels.map((l) => l.length), 1);
  const height = PAD * 2 + maxInLevel * NODE_H + Math.max(0, maxInLevel - 1) * NODE_GAP;
  const positions = new Map();
  levels.forEach((level, li) => {
    const groupH = level.length * NODE_H + Math.max(0, level.length - 1) * NODE_GAP;
    const startY = Math.max(PAD, (height - groupH) / 2);
    level.forEach((clientId, ni) => {
      positions.set(clientId, {
        x: PAD + li * (NODE_W + LEVEL_GAP),
        y: startY + ni * (NODE_H + NODE_GAP),
        level: li
      });
    });
  });
  const width = PAD * 2 + levels.length * NODE_W + Math.max(0, levels.length - 1) * LEVEL_GAP;
  return { positions, width, height: Math.max(height, 240), levels };
}

function bezier(x1, y1, x2, y2) {
  const mx = x1 + (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

/**
 * Interactive pipeline graph.
 * Edit mode: drag agents in from the palette, move nodes, connect by
 *   dragging from a node's output port onto another node (or click the port,
 *   then click the target node), click an edge to remove it.
 * Run mode (loading): read-only, shows live status + timings.
 * After a run completes the graph stays editable — any edit clears the run view.
 * The same shared state backs the Pipeline Builder page, so connections made
 * on either page appear on the other.
 */
export default function PipelineGraphEditor({
  nodes = [],            // [{ clientId, stepId, agentId, name, phase, type, tools }]
  edges = [],            // [{ id, from, to }] — clientId refs
  paletteAgents = [],
  statuses = {},
  result = null,
  loading = false,
  currentAgent = null,
  onAddNode,
  onRemoveNode,
  onConnect,
  onDisconnect
}) {
  // Locked only while a run is actually executing. A finished run's result
  // can stay on screen while the user edits; edit handlers clear the result.
  const readOnly = Boolean(loading);
  const showStatus = Boolean(result);
  const canvasRef = useRef(null);
  const [manual, setManual] = useState({});            // clientId -> {x, y}
  const [drag, setDrag] = useState(null);              // { clientId, offsetX, offsetY }
  const [pendingFrom, setPendingFrom] = useState(null); // clientId being connected
  const [cursor, setCursor] = useState(null);          // canvas-relative cursor for temp line
  const pressRef = useRef(null);                        // { clientId, startX, startY, moved }

  // Fresh run → snap back to auto layout so levels line up in columns.
  const runId = result?.runId || null;
  useEffect(() => {
    if (runId) setManual({});
  }, [runId]);

  const auto = useMemo(() => autoLayout(nodes, edges), [nodes, edges]);
  const posOf = (clientId) => manual[clientId] || auto.positions.get(clientId);

  const canvasPoint = (evt) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect
      ? { x: evt.clientX - rect.left + (canvasRef.current.scrollLeft || 0), y: evt.clientY - rect.top + (canvasRef.current.scrollTop || 0) }
      : { x: 0, y: 0 };
  };

  const finishConnect = (fromClientId, toClientId) => {
    if (!fromClientId || !toClientId || fromClientId === toClientId) return;
    onConnect?.(fromClientId, toClientId);
  };

  // ── Node dragging (blocked while connecting so targets stay put) ──
  useEffect(() => {
    if (!drag) return undefined;
    const move = (evt) => {
      const p = canvasPoint(evt);
      setManual((prev) => ({
        ...prev,
        [drag.clientId]: { x: Math.max(8, p.x - drag.offsetX), y: Math.max(8, p.y - drag.offsetY) }
      }));
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  const beginDrag = (evt, clientId) => {
    if (readOnly || pendingFrom) return;
    if (evt.target.closest(".pge-port") || evt.target.closest(".pge-remove")) return;
    evt.preventDefault();
    const p = canvasPoint(evt);
    const pos = posOf(clientId);
    if (!pos) return;
    setDrag({ clientId, offsetX: p.x - pos.x, offsetY: p.y - pos.y });
  };

  // ── Connect flow ──
  // Drag: press on output port → release over another node = connected.
  // Click-click: press+release on the port (no movement) arms "pending" mode,
  // then click any node (or its input port) to connect; Esc / empty-canvas
  // click cancels.
  useEffect(() => {
    if (!pendingFrom) return undefined;

    const move = (evt) => {
      setCursor(canvasPoint(evt));
      const press = pressRef.current;
      if (press && !press.moved) {
        const dx = evt.clientX - press.startX;
        const dy = evt.clientY - press.startY;
        if (dx * dx + dy * dy > 36) press.moved = true; // > 6px = drag, not click
      }
    };

    const up = (evt) => {
      const press = pressRef.current;
      pressRef.current = null;
      const el = document.elementFromPoint(evt.clientX, evt.clientY);
      const targetId = el?.closest?.("[data-client-id]")?.getAttribute("data-client-id");

      if (targetId && targetId !== pendingFrom) {
        // Released over a node (drag-connect) — connect immediately.
        finishConnect(pendingFrom, targetId);
        setPendingFrom(null);
        setCursor(null);
      } else if (press?.moved) {
        // Dragged out into empty space — cancel.
        setPendingFrom(null);
        setCursor(null);
      }
      // else: plain click on the port → stay pending, user clicks a target next.
    };

    const key = (evt) => {
      if (evt.key === "Escape") {
        pressRef.current = null;
        setPendingFrom(null);
        setCursor(null);
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFrom]);

  const startConnect = (evt, clientId) => {
    if (readOnly) return;
    evt.stopPropagation();
    evt.preventDefault();
    pressRef.current = { clientId, startX: evt.clientX, startY: evt.clientY, moved: false };
    setPendingFrom(clientId);
    const pos = posOf(clientId);
    setCursor(pos ? { x: pos.x + NODE_W, y: pos.y + NODE_H / 2 } : canvasPoint(evt));
  };

  const completeConnect = (clientId) => {
    if (readOnly || !pendingFrom || pendingFrom === clientId) return;
    finishConnect(pendingFrom, clientId);
    setPendingFrom(null);
    setCursor(null);
  };

  // ── Palette drag-in ──
  const handleDrop = (evt) => {
    evt.preventDefault();
    if (readOnly || !onAddNode) return;
    const agentId = evt.dataTransfer.getData("text/agent-id");
    if (!agentId) return;
    onAddNode(agentId);
  };

  const nodeByClientId = useMemo(() => new Map(nodes.map((n) => [n.clientId, n])), [nodes]);

  const statusOf = (node) =>
    statuses[node.stepId] || result?.agentStatus?.[node.stepId] || "waiting";

  const durationOf = (node) => {
    const outputs = (result?.agentOutputs || []).filter((o) => o.stepId === node.stepId);
    return formatDuration(outputs[outputs.length - 1]?.durationMs);
  };

  return (
    <div className="pge">
      {/* Palette */}
      {!readOnly && (
        <div className="pge-palette">
          <span className="pge-palette-label">Drag an agent onto the canvas (or click to add):</span>
          {paletteAgents.map((agent) => (
            <span
              key={agent.id}
              className={`pge-chip ${agent.type || "custom"}`}
              draggable
              onDragStart={(evt) => evt.dataTransfer.setData("text/agent-id", agent.id)}
              onClick={() => !readOnly && onAddNode?.(agent.id)}
              title={agent.role || agent.name}
            >
              {agent.name}
            </span>
          ))}
          {paletteAgents.length === 0 && <span className="pge-palette-empty">No agents available.</span>}
        </div>
      )}

      {pendingFrom && !readOnly && (
        <div className="pge-hint">
          🔗 Connecting from <strong>{nodeByClientId.get(pendingFrom)?.name}</strong> —
          drop on a node, or click a target node. <kbd>Esc</kbd> or click empty canvas to cancel.
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`pge-canvas ${readOnly ? "readonly" : ""} ${pendingFrom ? "connecting" : ""}`}
        style={{ height: auto.height }}
        onDragOver={(evt) => evt.preventDefault()}
        onDrop={handleDrop}
        onClick={(evt) => {
          if (pendingFrom && evt.target === evt.currentTarget) {
            pressRef.current = null;
            setPendingFrom(null);
            setCursor(null);
          }
        }}
      >
        <svg className="pg-edges" width="100%" height="100%">
          <defs>
            <marker id="pge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#8b7cf6" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const from = posOf(edge.from);
            const to = posOf(edge.to);
            if (!from || !to) return null;
            const d = bezier(
              from.x + NODE_W, from.y + NODE_H / 2,
              to.x, to.y + NODE_H / 2
            );
            return (
              <g key={edge.id}>
                <path d={d} className="pge-edge" markerEnd="url(#pge-arrow)" />
                {!readOnly && (
                  <path
                    d={d}
                    className="pge-edge-hitzone"
                    onClick={() => {
                      if (pendingFrom) return;
                      onDisconnect?.(edge.from, edge.to);
                    }}
                  >
                    <title>Click to remove this dependency</title>
                  </path>
                )}
              </g>
            );
          })}

          {pendingFrom && cursor && posOf(pendingFrom) && (
            <path
              d={bezier(
                posOf(pendingFrom).x + NODE_W,
                posOf(pendingFrom).y + NODE_H / 2,
                cursor.x,
                cursor.y
              )}
              className="pge-temp-line"
              markerEnd="url(#pge-arrow)"
            />
          )}
        </svg>

        {nodes.length === 0 && (
          <div className="pge-empty">
            Drag agents here from the palette above — or use the Agent Library to add agents.
          </div>
        )}

        {nodes.map((node) => {
          const pos = posOf(node.clientId);
          if (!pos) return null;
          const status = statusOf(node);
          const isCurrent = currentAgent && node.agentId === currentAgent;
          const tools = Array.isArray(node.tools) ? node.tools : [];
          const isSource = pendingFrom === node.clientId;
          const isTarget = Boolean(pendingFrom) && !isSource;
          const incoming = edges.filter((e) => e.to === node.clientId);
          const duration = showStatus ? durationOf(node) : null;

          return (
            <div
              key={node.clientId}
              data-client-id={node.clientId}
              className={[
                "pg-node pge-node",
                `st-${showStatus ? status : "edit"}`,
                isCurrent ? "current" : "",
                isSource ? "connecting" : "",
                isTarget ? "pge-target" : ""
              ].filter(Boolean).join(" ")}
              style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
              onPointerDown={(evt) => beginDrag(evt, node.clientId)}
              onClick={() => (pendingFrom ? completeConnect(node.clientId) : null)}
            >
              <div className="pg-node-row">
                <span className={`pg-dot st-${showStatus ? status : "edit"}`} />
                <span className="pg-name">{node.name}</span>
              </div>

              {showStatus ? (
                <div className="pg-chips">
                  <span className={`pg-chip st-${status}`}>{STATUS_LABEL[status] || status}</span>
                  {duration && <span className="pg-chip time">{duration}</span>}
                </div>
              ) : (
                <div className="pge-node-deps">
                  {incoming.length > 0
                    ? `⏳ after: ${incoming.map((e) => nodeByClientId.get(e.from)?.name || "?").join(", ")}`
                    : "⚡ no dependencies"}
                </div>
              )}

              {tools.length > 0 && (
                <div className="pg-tools">
                  {tools.map((tool) => (
                    <span key={tool} className="pg-tool" title={tool}>
                      {TOOL_EMOJI[tool] || "⚙️"}
                    </span>
                  ))}
                </div>
              )}

              {!readOnly && (
                <>
                  <span
                    className="pge-port in"
                    title="Input — while connecting, click here to finish the connection"
                    onClick={(evt) => {
                      evt.stopPropagation();
                      completeConnect(node.clientId);
                    }}
                  />
                  <span
                    className="pge-port out"
                    title="Dependency out — drag onto another node (or click, then click the target)"
                    onPointerDown={(evt) => startConnect(evt, node.clientId)}
                  />
                  <button
                    type="button"
                    className="pge-remove"
                    title="Remove from pipeline"
                    onClick={(evt) => {
                      evt.stopPropagation();
                      onRemoveNode?.(node.clientId);
                    }}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && nodes.length > 0 && (
        <div className="pge-footnote">
          <strong>Connect:</strong> drag from a node's <span className="pge-dot-demo" /> right-side port onto another node
          (or click the port, then click the target). <strong>Disconnect:</strong> click an edge.
          Connections stay in sync with the Pipeline Builder page.
        </div>
      )}
    </div>
  );
}
