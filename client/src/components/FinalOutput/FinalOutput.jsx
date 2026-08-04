import { prettyJson } from "../../utils/formatOutput";
import "./FinalOutput.css";

export default function FinalOutput({ research }) {
  if (!research) return null;

  return (
    <section className="card output-section">
      <div className="output-header">
        <h2>Research Output</h2>
        <span className="mode-badge">{research.mode}</span>
      </div>
      
      <p className="research-summary">{research.summary}</p>

      <h3>Key Points</h3>
      <ul className="key-points">
        {research.keyPoints?.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>

      <h3>Suggested Outline</h3>
      <ol className="outline-list">
        {research.suggestedOutline?.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>

      <details className="json-details">
        <summary>View JSON</summary>
        <pre>{prettyJson(research)}</pre>
      </details>
    </section>
  );
}
