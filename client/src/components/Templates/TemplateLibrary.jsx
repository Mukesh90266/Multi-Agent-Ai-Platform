import { useState } from "react";

const LayersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const DEFAULT_AGENT_NAMES = { researcher: "Researcher", writer: "Writer", editor: "Editor" };

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function templateAgentCount(template) {
  const pipeline = template?.pipeline || {};
  if (Array.isArray(pipeline.agentIds) && pipeline.agentIds.length) {
    return pipeline.agentIds.length;
  }
  if (pipeline.templateId === "default-rwe") return 3; // Researcher → Writer → Editor
  return 0;
}

function templateConnectionCount(template) {
  const dependencies = template?.pipeline?.dependencies;
  if (!dependencies || typeof dependencies !== "object") return 0;
  return Object.values(dependencies).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );
}

function templateAgentLabels(template) {
  const pipeline = template?.pipeline || {};
  const ids = Array.isArray(pipeline.agentIds) && pipeline.agentIds.length
    ? pipeline.agentIds
    : pipeline.templateId === "default-rwe"
      ? ["researcher", "writer", "editor"]
      : [];

  const configs = Array.isArray(pipeline.agentConfigs) ? pipeline.agentConfigs : [];
  const configById = new Map(configs.map((agent) => [agent.id, agent]));

  return ids.map((agentId) => {
    const config = configById.get(agentId);
    return config?.name || DEFAULT_AGENT_NAMES[agentId] || agentId;
  });
}

/**
 * Template Library — lists saved pipeline templates with their agent count,
 * connection count and dates. Use Template loads the saved configuration into
 * the shared pipeline builder; Delete removes it from the library.
 */
export default function TemplateLibrary({
  templates,
  loading,
  error,
  onUseTemplate,
  onDeleteTemplate,
  onRetry
}) {
  const [busyId, setBusyId] = useState(null);

  const handleUse = async (template) => {
    if (busyId) return;
    setBusyId(template.templateId);
    try {
      await onUseTemplate(template);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (template) => {
    if (busyId) return;
    setBusyId(template.templateId);
    try {
      await onDeleteTemplate(template);
    } finally {
      setBusyId(null);
    }
  };

  if (loading && templates === null) {
    return (
      <div className="history-loading">
        <div className="history-spinner" />
        <span>Loading templates…</span>
      </div>
    );
  }

  if (error && (!templates || templates.length === 0)) {
    return (
      <div className="page-card">
        <div className="builder-message error">{error}</div>
        <button type="button" className="history-refresh-btn" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="page-card template-empty">
        <div className="template-empty-icon">
          <LayersIcon />
        </div>
        <h2 className="template-empty-title">No templates yet</h2>
        <p className="template-empty-text">
          Configure a pipeline on the Run Pipeline page — choose agents, connect
          dependencies, then click <strong>Save as Template</strong>. Saved
          templates appear here and can be reused with any new input.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="builder-message error page-banner">{error}</div>}
      <div className="template-grid">
        {templates.map((template) => {
          const agentCount = templateAgentCount(template);
          const connectionCount = templateConnectionCount(template);
          const busy = busyId === template.templateId;

          return (
            <article key={template.templateId} className="template-card">
              <div className="template-card-head">
                <div className="template-card-icon">
                  <LayersIcon />
                </div>
                <div className="template-card-titles">
                  <h3 className="template-card-name">{template.name}</h3>
                  <p className="template-card-id">{template.templateId}</p>
                </div>
              </div>

              {template.description && (
                <p className="template-card-desc">{template.description}</p>
              )}

              <div className="template-card-agents">
                {templateAgentLabels(template).map((label, index) => (
                  <span key={`${label}-${index}`} className="template-agent-chip">
                    {label}
                  </span>
                ))}
              </div>

              <div className="template-card-meta">
                <span>
                  {agentCount} Agent{agentCount === 1 ? "" : "s"}
                </span>
                <span className="template-meta-dot">·</span>
                <span>
                  {connectionCount} Connection{connectionCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="template-card-dates">
                <span title={`Created ${formatDate(template.createdAt)}`}>
                  Created {formatDate(template.createdAt)}
                </span>
                {template.updatedAt && template.updatedAt !== template.createdAt && (
                  <span title={`Updated ${formatDate(template.updatedAt)}`}>
                    Updated {formatDate(template.updatedAt)}
                  </span>
                )}
              </div>

              <div className="template-card-actions">
                <button
                  type="button"
                  className="template-use-btn"
                  disabled={busy}
                  onClick={() => handleUse(template)}
                >
                  <PlayIcon />
                  {busy ? "Loading…" : "Use Template"}
                </button>
                <button
                  type="button"
                  className="template-delete-btn"
                  disabled={busy}
                  aria-label={`Delete template ${template.name}`}
                  onClick={() => handleDelete(template)}
                >
                  <TrashIcon />
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
