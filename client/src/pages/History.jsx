import { useEffect, useState } from "react";
import { getHistory } from "../services/api";
export default function History() {
  const [runs, setRuns] = useState([]);
  const [message, setMessage] = useState("Loading…");
  useEffect(() => {
    getHistory()
      .then((x) => {
        setRuns(x.runs);
        setMessage(x.message || "");
      })
      .catch(() => setMessage("Unable to load history."));
  }, []);
  return (
    <main>
      <h1>Past research runs</h1>
      {message && <p>{message}</p>}
      {runs.map((run) => (
        <article className="card" key={run._id}>
          <b>{run.topic}</b>
          <p>{new Date(run.createdAt).toLocaleString()}</p>
          <p>{run.research?.summary}</p>
        </article>
      ))}
    </main>
  );
}
