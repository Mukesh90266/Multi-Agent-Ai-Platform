import { useState } from "react";
import TopicInput from "../components/TopicInput/TopicInput";
import AgentCard from "../components/AgentCard/AgentCard";
import PipelineInfo from "../components/PipelineInfo/PipelineInfo";
import LiveOutput from "../components/LiveOutput/LiveOutput";
import "./Home.css";

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async (formData) => {
    setLoading(true);
    setError("");
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
      } else {
        setError(data.message || "Pipeline failed");
      }
    } catch (e) {
      setError("Could not contact the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-layout">
      {/* LEFT SIDEBAR */}
      <aside className="sidebar">
        {/* Topic Input Card */}
        <TopicInput onSubmit={run} disabled={loading} />

        {/* Pipeline Status Card */}
        <AgentCard 
          result={result} 
          loading={loading}
          error={error}
        />

        {/* Pipeline Info Card */}
        <PipelineInfo result={result} loading={loading} />
      </aside>

      {/* RIGHT CONTENT */}
      <main className="content">
        <LiveOutput result={result} loading={loading} />
      </main>
    </div>
  );
}
