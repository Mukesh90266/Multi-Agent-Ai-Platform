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
    <form className="topic-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Enter Your Research Topic</h2>
        <p>Provide details about the content you want to create</p>
      </div>

      <label className="main-topic">
        Research topic
        <textarea
          required
          minLength="3"
          name="topic"
          value={form.topic}
          onChange={change}
          placeholder="Example: Benefits and limitations of the MERN stack for web development"
          disabled={disabled}
        />
      </label>

      <div className="form-grid">
        <label>
          Content type
          <input
            name="contentType"
            value={form.contentType}
            onChange={change}
            disabled={disabled}
          />
        </label>
        <label>
          Target audience
          <input 
            name="audience" 
            value={form.audience} 
            onChange={change}
            disabled={disabled}
          />
        </label>
        <label>
          Tone
          <select name="tone" value={form.tone} onChange={change} disabled={disabled}>
            <option>Educational</option>
            <option>Professional</option>
            <option>Conversational</option>
            <option>Formal</option>
          </select>
        </label>
      </div>

      <label className="word-count-label">
        Target word count
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
        <span className="word-count-value">{form.wordCount} words</span>
      </label>

      <button type="submit" disabled={disabled || form.topic.trim().length < 3}>
        <SendIcon />
        {disabled ? "Processing..." : "Start Pipeline"}
      </button>
    </form>
  );
}
