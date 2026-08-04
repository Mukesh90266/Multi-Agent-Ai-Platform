import { useState } from "react";
import "./TopicInput.css";

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
    <div className="card topic-card">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Topic</label>
          <textarea
            name="topic"
            value={form.topic}
            onChange={handleChange}
            placeholder="Enter your research topic..."
            disabled={disabled}
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Content Type</label>
            <input
              name="contentType"
              value={form.contentType}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
          <div className="form-group">
            <label>Audience</label>
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
            <label>Tone</label>
            <select name="tone" value={form.tone} onChange={handleChange} disabled={disabled}>
              <option>Educational</option>
              <option>Professional</option>
              <option>Conversational</option>
              <option>Formal</option>
            </select>
          </div>
          <div className="form-group">
            <label>Word Count</label>
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
          {disabled ? "Running..." : "Run Pipeline"}
        </button>
      </form>
    </div>
  );
}
