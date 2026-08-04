import "./WriterOutput.css";

export default function WriterOutput({ draft, showRevisionNote }) {
  if (!draft?.content) {
    return null;
  }

  return (
    <section className="card writer-output">
      <div className="writer-header">
        <h2>Writer Agent Draft</h2>
        <span className="badge">{draft.wordCount} words</span>
      </div>

      {showRevisionNote ? (
        <p className="draft-note revision">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          This draft has been revised based on Editor feedback.
        </p>
      ) : (
        <p className="draft-note">
          This is the initial draft from the Writer Agent.
        </p>
      )}

      <article className="draft-content">{draft.content}</article>
    </section>
  );
}
