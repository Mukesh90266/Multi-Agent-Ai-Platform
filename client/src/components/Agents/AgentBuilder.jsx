import { useState } from "react";

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
  </svg>
);

const emptyForm = {
  name: "",
  role: "",
  personality: "",
  systemPrompt: "",
  tools: []
};

export default function AgentBuilder({ onCreateAgent, disabled, availableTools = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToolToggle = (toolId) => {
    setForm((prev) => {
      const hasTool = prev.tools.includes(toolId);
      return {
        ...prev,
        tools: hasTool
          ? prev.tools.filter((id) => id !== toolId)
          : [...prev.tools, toolId]
      };
    });
  };

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.role.trim().length >= 2 &&
    form.personality.trim().length >= 2 &&
    form.systemPrompt.trim().length >= 10;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const created = await onCreateAgent({
        name: form.name,
        role: form.role,
        personality: form.personality,
        systemPrompt: form.systemPrompt,
        tools: form.tools
      });
      setForm(emptyForm);
      setExpanded(false);
      setMessage({ type: "success", text: `${created?.name || "Agent"} saved to your library.` });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Could not create agent."
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="agent-builder-card">
      <button
        type="button"
        className="agent-builder-toggle"
        onClick={() => setExpanded((value) => !value)}
        disabled={disabled || saving}
      >
        <span className="agent-builder-toggle-icon"><SparkIcon /></span>
        <span>
          <strong>Agent Builder</strong>
          <small>Create custom prompt-driven agents with optional tools</small>
        </span>
        <span className="agent-builder-plus"><PlusIcon /></span>
      </button>

      {message && (
        <div className={`builder-message ${message.type}`}>{message.text}</div>
      )}

      {expanded && (
        <form className="agent-builder-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Agent name</label>
            <input
              name="name"
              className="form-input"
              value={form.name}
              onChange={handleChange}
              placeholder="Fact Checker, Translator, Summarizer..."
              disabled={disabled || saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <input
              name="role"
              className="form-input"
              value={form.role}
              onChange={handleChange}
              placeholder="What should this agent do?"
              disabled={disabled || saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Personality</label>
            <input
              name="personality"
              className="form-input"
              value={form.personality}
              onChange={handleChange}
              placeholder="Strict, friendly, concise, skeptical..."
              disabled={disabled || saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label">System prompt</label>
            <textarea
              name="systemPrompt"
              className="form-textarea system-prompt-input"
              value={form.systemPrompt}
              onChange={handleChange}
              placeholder="Define exactly how this agent should behave and what it should return."
              rows={5}
              disabled={disabled || saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tools (optional)</label>
            <p className="tool-picker-hint">
              Tools are agent capabilities — not pipeline steps. The LLM decides from the user input whether to call them during this agent&apos;s execution.
            </p>
            {availableTools.length > 0 ? (
              <div className="tool-picker-list">
                {availableTools.map((tool) => {
                  const checked = form.tools.includes(tool.id);
                  return (
                    <label
                      key={tool.id}
                      className={`tool-picker-item ${checked ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToolToggle(tool.id)}
                        disabled={disabled || saving}
                      />
                      <span className="tool-picker-text">
                        <strong>{tool.name}</strong>
                        <small>{tool.description}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="tool-picker-empty">
                Loading tools… Default options: Web Search, Verification API.
              </div>
            )}
          </div>

          <button type="submit" className="save-agent-btn" disabled={!canSubmit || disabled || saving}>
            <PlusIcon />
            {saving ? "Saving..." : "Save custom agent"}
          </button>
        </form>
      )}
    </div>
  );
}
