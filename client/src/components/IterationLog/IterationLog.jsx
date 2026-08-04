import "./IterationLog.css";
export default function IterationLog({ iterations = [] }) {
  return (
    <section className="card">
      <h2>Iteration log</h2>
      {iterations.length ? (
        iterations.map((item) => (
          <div className="log" key={item.iteration}>
            <b>
              Iteration {item.iteration}: {item.agent}
            </b>
            <span>{item.status}</span>
          </div>
        ))
      ) : (
        <p>No pipeline run yet.</p>
      )}
    </section>
  );
}
