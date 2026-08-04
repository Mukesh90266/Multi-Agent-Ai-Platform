import { useState } from "react";
import "./TopicInput.css";

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export default function TopicInput({ onSubmit, disabled }) {
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
    if (form.topic.trim().length >= 3) {
      onSubmit(form);
    }
  };

  return (
    <div className="topic-card">
      <div className="card-header-custom">
        <div>
          <h3>Configure Pipeline</h3>
          <p className="subtitle">Enter your research parameters</p>
        </div>
        <div className="config-icon">⚙️</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            <span className="label-icon">📝</span>
            Research Topic
          </label>
          <textarea
            name="topic"
            value={form.topic}
            onChange={handleChange}
            placeholder="What would you like to research?"
            disabled={disabled}
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              <span className="label-icon">📄</span>
              Content Type
            </label>
            <input
              name="contentType"
              value={form.contentType}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
          <div className="form-group">
            <label>
              <span className="label-icon">👥</span>
              Audience
            </label>
            <input
              name="audience"
              value={form.audience}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              <span className="label-icon">🎯</span>
              Tone
            </label>
            <select name="tone" value={form.tone} onChange={handleChange} disabled={disabled}>
              <option>Educational</option>
              <option>Professional</option>
              <option>Conversational</option>
              <option>Formal</option>
            </select>
          </div>
          <div className="form-group">
            <label>
              <span className="label-icon">📊</span>
              Word Count
            </label>
            <input
              type="number"
              name="wordCount"
              value={form.wordCount}
              onChange={handleChange}
              min={200}
              max={3000}
              disabled={disabled}
            />
          </div>
        </div>

        <button type="submit" disabled={disabled || form.topic.trim().length < 3}>
          <SendIcon />
          {disabled ? "Processing..." : "Run Pipeline"}
        </button>
      </form>
    </div>
  );
}
