import { useState, useEffect, useCallback, useRef } from "react";
import TopicInput from "../components/TopicInput/TopicInput";
import PipelineStatus from "../components/PipelineStatus/PipelineStatus";
import PipelineInfo from "../components/PipelineInfo/PipelineInfo";
import LiveOutput from "../components/LiveOutput/LiveOutput";
import { runPipeline, getPipelineStatus } from "../services/api.js";

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [agentStatus, setAgentStatus] = useState({
    researcher: "waiting",
    writer: "waiting",
    editor: "waiting",
    optimizer: "waiting"
  });

  const pollIntervalRef = useRef(null);
  const runIdRef = useRef(null);

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const updateAgentStatus = useCallback((agent, status) => {
    setAgentStatus(prev => ({
      ...prev,
      [agent]: status
    }));
  }, []);

  const determineCurrentAgent = useCallback((statusObj) => {
    if (statusObj?.researcher === "running") return "researcher";
    if (statusObj?.writer === "running") return "writer";
    if (statusObj?.editor === "running") return "editor";
    if (statusObj?.optimizer === "running") return "optimizer";
    return null;
  }, []);

  const runPipelineHandler = async (formData) => {
    // Reset states
    setLoading(true);
    setResult(null);
    setAgentStatus({
      researcher: "waiting",
      writer: "waiting",
      editor: "waiting",
      optimizer: "waiting"
    });
    setCurrentAgent(null);
    clearPolling();

    try {
      const startRes = await runPipeline(formData);

      if (!startRes.success || !startRes.runId) {
        throw new Error(startRes.message || "Failed to start pipeline");
      }

      const runId = startRes.runId;
      runIdRef.current = runId;

      // Start polling for status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const data = await getPipelineStatus(runId);

          if (data.success) {
            setResult(data);

            // Update agent status from backend state
            if (data.agentStatus) {
              setAgentStatus(data.agentStatus);
              const activeAgent = determineCurrentAgent(data.agentStatus);
              setCurrentAgent(activeAgent);
            }

            // Check if pipeline is complete or errored
            const isComplete =
              data.status === "approved" ||
              data.status === "needs_revision" ||
              data.status === "unknown" ||
              data.status === "error" ||
              (data.agentStatus?.researcher === "completed" &&
                data.agentStatus?.writer === "completed" &&
                data.agentStatus?.editor === "completed" &&
                (data.agentStatus?.optimizer === "completed" ||
                  data.agentStatus?.optimizer === "skipped"));

            if (isComplete) {
              clearPolling();
              setLoading(false);
              setCurrentAgent(null);
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
          clearPolling();
          setLoading(false);
          setCurrentAgent(null);
        }
      }, 1500);
    } catch (e) {
      console.error("Pipeline error:", e);
      setLoading(false);
      setCurrentAgent(null);
      setAgentStatus({
        researcher: "waiting",
        writer: "waiting",
        editor: "waiting",
        optimizer: "waiting"
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <TopicInput onSubmit={runPipelineHandler} disabled={loading} />
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
