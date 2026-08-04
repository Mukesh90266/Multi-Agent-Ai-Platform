import { useState } from "react";
import "./TopicInput.css";

export default function TopicInput({ onSubmit, disabled }) {
  const [form, setForm] = useState({
    topic: "",
    contentType: "Blog post",
    audience: "Beginner learners",
    tone: "Educational",
    wordCount: 800,
  });

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.topic.trim().length >= 3) {
      onSubmit(form);
    }
  };

  return (
    <form className="topic-section" onSubmit={handleSubmit}>
      <h2>Research Topic</h2>
      
      <div className="form-group">
        <label>Topic</label>
        <textarea
          required
          minLength="3"
          name="topic"
          value={form.topic}
          onChange={change}
          placeholder="Enter your research topic here..."
          disabled={disabled}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Content Type</label>
          <input
            name="contentType"
            value={form.contentType}
            onChange={change}
            disabled={disabled}
          />
        </div>
        <div className="form-group">
          <label>Audience</label>
          <input 
            name="audience" 
            value={form.audience} 
            onChange={change}
            disabled={disabled}
          />
        </div>
        <div className="form-group">
          <label>Tone</label>
          <select name="tone" value={form.tone} onChange={change} disabled={disabled}>
            <option>Educational</option>
            <option>Professional</option>
            <option>Conversational</option>
            <option>Formal</option>
          </select>
        </div>
      </div>

      <div className="form-group word-count-group">
        <label>Word Count: {form.wordCount} words</label>
        <input
          type="range"
          name="wordCount"
          min="200"
          max="3000"
          step="100"
          value={form.wordCount}
          onChange={change}
          disabled={disabled}
        />
      </div>

      <button type="submit" disabled={disabled || form.topic.trim().length < 3}>
        {disabled ? "Processing..." : "Submit"}
      </button>
    </form>
  );
}
