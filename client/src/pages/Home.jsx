import { useState, useEffect } from "react";
import TopicInput from "../components/TopicInput/TopicInput";
import WorkflowDiagram from "../components/WorkflowDiagram/WorkflowDiagram";
import PipelineRunner from "../components/PipelineRunner/PipelineRunner";
import AgentStatus from "../components/AgentStatus/AgentStatus";
import IterationLog from "../components/IterationLog/IterationLog";
import FinalOutput from "../components/FinalOutput/FinalOutput";
import WriterOutput from "../components/WriterOutput/WriterOutput";
import EditorReview from "../components/EditorReview/EditorReview";
import "./Home.css";

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentAgent, setCurrentAgent] = useState(null);

  const run = async (formData) => {
    setLoading(true);
    setError("");
    setResult(null);
    setCurrentAgent("researcher");

    try {
      const response = await fetch("http://localhost:5000/api/pipeline/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      setCurrentAgent(null);
    }
  };

  const statuses = result?.agentStatus || {};

  const getCurrentIteration = () => {
    if (!result?.iterations) return 1;
    const editorIterations = result.iterations.filter(i => i.agent === "editor").length;
    return Math.max(1, editorIterations);
  };

  return (
    <main>
      <header>
        <p className="eyebrow">MULTI-AGENT AI PLATFORM</p>
        <h1>Research, Write & Edit Agents</h1>
        <p className="subtitle">
          Enter a topic to start the pipeline. The Researcher Agent gathers information, 
          the Writer Agent creates content, and the Editor Agent reviews it.
        </p>
      </header>

      {/* Workflow Diagram */}
      <WorkflowDiagram 
        currentAgent={currentAgent}
        agentStatus={statuses}
      />

      {/* Topic Input */}
      <TopicInput onSubmit={run} disabled={loading} />

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Pipeline Runner */}
      <PipelineRunner
        agentStatus={statuses}
        currentAgent={currentAgent}
        currentIteration={getCurrentIteration()}
        maxIterations={5}
        loading={loading}
        onRun={() => {}}
      />

      {/* Loading Indicator */}
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Processing...</span>
        </div>
      )}

      {/* Results Section */}
      {result && !loading && (
        <div className="results-section">
          {/* Iteration Log */}
          <IterationLog iterations={result?.iterations} />

          {/* Research Output */}
          <FinalOutput research={result?.research} />

          {/* Writer Output */}
          <WriterOutput draft={result?.draft} />

          {/* Editor Review */}
          <EditorReview review={result?.editorReview} />
        </div>
      )}
    </main>
  );
}
