import { useState, useEffect, useCallback } from "react";
import TopicInput from "../components/TopicInput/TopicInput";
import PipelineStatus from "../components/PipelineStatus/PipelineStatus";
import PipelineInfo from "../components/PipelineInfo/PipelineInfo";
import LiveOutput from "../components/LiveOutput/LiveOutput";

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [agentStatus, setAgentStatus] = useState({
    researcher: "waiting",
    writer: "waiting",
    editor: "waiting"
  });

  const updateAgentStatus = useCallback((agent, status) => {
    setAgentStatus(prev => ({
      ...prev,
      [agent]: status
    }));
  }, []);

  const runPipeline = async (formData) => {
    // Reset states
    setLoading(true);
    setResult(null);
    setAgentStatus({
      researcher: "waiting",
      writer: "waiting",
      editor: "waiting"
    });

    try {
      // Start with researcher
      setCurrentAgent("researcher");
      updateAgentStatus("researcher", "running");

      const response = await fetch("http://localhost:5000/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        // Mark all as completed based on result
        setAgentStatus({
          researcher: "completed",
          writer: "completed",
          editor: "completed"
        });
        setResult(data);
      }
    } catch (e) {
      console.error("Pipeline error:", e);
      setAgentStatus({
        researcher: "waiting",
        writer: "waiting",
        editor: "waiting"
      });
    } finally {
      setLoading(false);
      setCurrentAgent(null);
    }
  };

  // Simulate real-time updates during loading
  useEffect(() => {
    if (!loading) return;

    const stages = [
      { agent: "researcher", delay: 500 },
      { agent: "writer", delay: 2500 },
      { agent: "editor", delay: 4500 }
    ];

    stages.forEach(({ agent, delay }) => {
      setTimeout(() => {
        setCurrentAgent(agent);
        updateAgentStatus(agent, "running");
        
        // Complete previous agents
        if (agent === "writer") {
          updateAgentStatus("researcher", "completed");
        } else if (agent === "editor") {
          updateAgentStatus("researcher", "completed");
          updateAgentStatus("writer", "completed");
        }
      }, delay);
    });
  }, [loading, updateAgentStatus]);

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <TopicInput onSubmit={runPipeline} disabled={loading} />
        <div className="section section-divider">
          <PipelineStatus 
            result={result} 
            loading={loading}
            currentAgent={currentAgent}
            agentStatus={agentStatus}
          />
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
