import { useState } from "react";

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const LayersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export default function TopicInput({ onSubmit, onSaveTemplate, disabled, selectedCount = 0, isDefaultPipeline = false }) {
  const [form, setForm] = useState({
    topic: "",
    contentType: "Blog post",
    audience: "General",
    tone: "Educational",
    wordCount: 800,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.topic.trim().length >= 3 && selectedCount > 0) {
      onSubmit(form);
    }
  };

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Configure run</span>
        <div className="topic-pipeline-pill">
          {selectedCount} agent{selectedCount === 1 ? "" : "s"} selected
          {isDefaultPipeline && <span> · default loop</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Original user input / topic</label>
          <textarea
            name="topic"
            className="form-textarea"
            value={form.topic}
            onChange={handleChange}
            placeholder="What should the selected agents work on?"
            disabled={disabled}
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Content type</label>
            <input
              name="contentType"
              className="form-input"
              value={form.contentType}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Audience</label>
            <input
              name="audience"
              className="form-input"
              value={form.audience}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tone</label>
            <select
              name="tone"
              className="form-select"
              value={form.tone}
              onChange={handleChange}
              disabled={disabled}
            >
              <option>Educational</option>
              <option>Casual</option>
              <option>Formal</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Word count</label>
            <input
              type="number"
              name="wordCount"
              className="form-input"
              value={form.wordCount}
              onChange={handleChange}
              min={200}
              max={3000}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="run-actions-row">
          <button type="submit" className="run-button" disabled={disabled || form.topic.trim().length < 3 || selectedCount === 0}>
            <SendIcon />
            Run selected pipeline
          </button>
          {onSaveTemplate && (
            <button
              type="button"
              className="run-button secondary"
              disabled={disabled || selectedCount === 0}
              onClick={onSaveTemplate}
              title="Save the current pipeline configuration as a reusable template"
            >
              <LayersIcon />
              Save as Template
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
