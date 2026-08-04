import "./EditorReview.css";

export default function EditorReview({ review }) {
  if (!review) return null;

  const isApproved = review.decision === "approved";

  return (
    <section className="card editor-section">
      <div className="editor-header">
        <div>
          <h2>Editor Review</h2>
          <p className="review-summary">{review.summary}</p>
        </div>
        <div className={`decision-badge ${review.decision}`}>
          <strong>{isApproved ? "Approved" : "Needs Revision"}</strong>
          <span>{review.qualityScore}/100</span>
        </div>
      </div>

      <div className="review-grid">
        <div className="review-column">
          <h3>Strengths</h3>
          <ul>
            {review.strengths?.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="review-column">
          <h3>Missing Points</h3>
          <ul>
            {review.missingPoints?.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {review.weaknesses?.length > 0 && (
        <>
          <h3>Weaknesses</h3>
          <div className="weakness-list">
            {review.weaknesses.map((item, i) => (
              <div key={i} className="weakness-item">
                <div className="weakness-header">
                  <strong>{item.section || "General"}</strong>
                  <span className={`severity ${item.severity}`}>{item.severity}</span>
                </div>
                <p><strong>Issue:</strong> {item.issue}</p>
                <p><strong>Suggestion:</strong> {item.suggestion}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {review.revisionInstructions?.length > 0 && (
        <>
          <h3>Revision Instructions</h3>
          <ol className="revision-list">
            {review.revisionInstructions.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </>
      )}

      {review.factCheckWarnings?.length > 0 && (
        <>
          <h3>Fact Check Warnings</h3>
          <ul className="warnings-list">
            {review.factCheckWarnings.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
