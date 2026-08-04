import "./EditorReview.css";

export default function EditorReview({ review }) {
  if (!review) {
    return null;
  }

  const approved = review.decision === "approved";

  return (
    <section className="card editor-review">
      <div className="editor-review-header">
        <div>
          <h2>Editor Agent Review</h2>

          <p className="editor-summary">{review.summary}</p>
        </div>

        <div
          className={`decision-badge ${
            approved ? "approved" : "needs-revision"
          }`}
        >
          <strong>{approved ? "Approved" : "Needs Revision"}</strong>
          <span>{review.qualityScore}/100</span>
        </div>
      </div>

      <div className="review-grid">
        <div>
          <h3>Strengths</h3>

          {review.strengths?.length ? (
            <ul>
              {review.strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          ) : (
            <p>No strengths returned.</p>
          )}
        </div>

        <div>
          <h3>Missing Points</h3>

          {review.missingPoints?.length ? (
            <ul>
              {review.missingPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          ) : (
            <p>No major missing points found.</p>
          )}
        </div>
      </div>

      <h3>Weaknesses and Improvements</h3>

      {review.weaknesses?.length ? (
        <div className="weakness-list">
          {review.weaknesses.map((item, index) => (
            <article className="weakness-item" key={index}>
              <div className="weakness-title">
                <strong>{item.section || "General"}</strong>

                <span className={`severity ${item.severity || "low"}`}>
                  {item.severity || "low"}
                </span>
              </div>

              <p>
                <strong>Issue:</strong> {item.issue}
              </p>

              <p>
                <strong>Improvement:</strong> {item.suggestion}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p>No major weaknesses found.</p>
      )}

      <h3>Revision Instructions</h3>

      {review.revisionInstructions?.length ? (
        <ol>
          {review.revisionInstructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ol>
      ) : (
        <p>No revision instructions needed.</p>
      )}

      {review.factCheckWarnings?.length > 0 && (
        <>
          <h3>Fact-Check Warnings</h3>

          <ul className="fact-warnings">
            {review.factCheckWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
