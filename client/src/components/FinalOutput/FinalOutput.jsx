import { prettyJson } from "../../utils/formatOutput";
import "./FinalOutput.css";
export default function FinalOutput({ research }) {
  if (!research) return null;
  return (
    <section className="card output">
      <div className="output-head">
        <h2>Researcher output</h2>
        <span className="badge">
          {research.mode === "llm" ? "LLM mode" : "Demo mode"}
        </span>
      </div>
      <p>{research.summary}</p>
      <h3>Key points</h3>
      <ul>
        {research.keyPoints?.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
      <h3>Suggested outline</h3>
      <ol>
        {research.suggestedOutline?.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ol>
      <details>
        <summary>View complete structured JSON</summary>
        <pre>{prettyJson(research)}</pre>
      </details>
    </section>
  );
}
