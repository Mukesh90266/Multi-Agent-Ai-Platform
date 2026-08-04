import { useState } from "react";
import TopicInput from "../components/TopicInput/TopicInput";
import PipelineStatus from "../components/PipelineStatus/PipelineStatus";
import PipelineInfo from "../components/PipelineInfo/PipelineInfo";
import LiveOutput from "../components/LiveOutput/LiveOutput";

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runPipeline = async (formData) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:5000/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data);
      }
    } catch (e) {
      console.error("Pipeline error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <TopicInput onSubmit={runPipeline} disabled={loading} />
        <div className="section section-divider">
          <PipelineStatus result={result} loading={loading} />
        </div>
        <div className="section section-divider">
          <PipelineInfo result={result} loading={loading} />
        </div>
      </aside>
      <main className="right-panel">
        <LiveOutput result={result} loading={loading} />
      </main>
    </div>
  );
}
