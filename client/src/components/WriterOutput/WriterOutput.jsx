import "./WriterOutput.css";

export default function WriterOutput({ draft }) {
  if (!draft?.content) return null;

  return (
    <section className="card writer-section">
      <div className="writer-header">
        <h2>Writer Output</h2>
        <span className="word-count-badge">{draft.wordCount} words</span>
      </div>
      <article className="draft-content">{draft.content}</article>
    </section>
  );
}
