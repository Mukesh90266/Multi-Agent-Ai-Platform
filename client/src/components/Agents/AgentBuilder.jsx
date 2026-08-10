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
  systemPrompt: ""
};

export default function AgentBuilder({ onCreateAgent, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      const created = await onCreateAgent(form);
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
          <small>Create custom prompt-driven agents</small>
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

          <button type="submit" className="save-agent-btn" disabled={!canSubmit || disabled || saving}>
            <PlusIcon />
            {saving ? "Saving..." : "Save custom agent"}
          </button>
        </form>
      )}
    </div>
  );
}
