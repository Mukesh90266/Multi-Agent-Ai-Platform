import "./WriterOutput.css";

export default function WriterOutput({ draft }) {
  if (!draft?.content) {
    return null;
  }

  return (
    <section className="card writer-output">
      <div className="writer-header">
        <h2>Writer Agent Draft</h2>

        <span className="badge">{draft.wordCount} words</span>
      </div>

      <p className="draft-note">
        This is the first draft. Editor review is not implemented yet.
      </p>

      <article className="draft-content">{draft.content}</article>
    </section>
  );
}
