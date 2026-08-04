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
  return (
    <form
      className="topic-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <label>
        Research topic
        <textarea
          required
          minLength="3"
          name="topic"
          value={form.topic}
          onChange={change}
          placeholder="Example: Benefits and limitations of the MERN stack"
        />
      </label>
      <div className="form-grid">
        <label>
          Content type
          <input
            name="contentType"
            value={form.contentType}
            onChange={change}
          />
        </label>
        <label>
          Target audience
          <input name="audience" value={form.audience} onChange={change} />
        </label>
        <label>
          Tone
          <select name="tone" value={form.tone} onChange={change}>
            <option>Educational</option>
            <option>Professional</option>
            <option>Conversational</option>
            <option>Formal</option>
          </select>
        </label>
      </div>
      <label>
        Target word count
        <input
          type="number"
          name="wordCount"
          min="200"
          max="3000"
          value={form.wordCount}
          onChange={change}
        />
      </label>
      <button disabled={disabled}>
        {disabled ? "Researching…" : "Run Researcher Agent"}
      </button>
    </form>
  );
}
