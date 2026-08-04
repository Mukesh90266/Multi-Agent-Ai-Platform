import { useState, useEffect } from "react";
import TopicInput from "../components/TopicInput/TopicInput";
import WorkflowDiagram from "../components/WorkflowDiagram/WorkflowDiagram";
import PipelineRunner from "../components/PipelineRunner/PipelineRunner";
import AgentStatus from "../components/AgentStatus/AgentStatus";
import IterationLog from "../components/IterationLog/IterationLog";
import FinalOutput from "../components/FinalOutput/FinalOutput";
import WriterOutput from "../components/WriterOutput/WriterOutput";
import EditorReview from "../components/EditorReview/EditorReview";
import Loader from "../components/Loader/Loader";
import { usePipeline } from "../hooks/usePipeline";
import "./Home.css";

export default function Home() {
  const { result, loading, error, run } = usePipeline();
  const [currentAgent, setCurrentAgent] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  // Simulate real-time agent status updates during loading
  useEffect(() => {
    if (loading) {
      const agents = ["researcher", "writer", "editor"];
      let index = 0;
      
      const interval = setInterval(() => {
        if (index < agents.length) {
          setCurrentAgent(agents[index]);
          index++;
        } else {
          clearInterval(interval);
        }
      }, 3000);

      setPollInterval(interval);
      setCurrentAgent("researcher");

      return () => clearInterval(interval);
    } else {
      setCurrentAgent(null);
      if (pollInterval) clearInterval(pollInterval);
    }
  }, [loading]);

  // Clear current agent when result is ready
  useEffect(() => {
    if (result && !loading) {
      setCurrentAgent(null);
    }
  }, [result, loading]);

  const statuses = loading
    ? {
        researcher: currentAgent === "researcher" ? "running" : (result?.agentStatus?.researcher || "waiting"),
        writer: currentAgent === "writer" ? "running" : (result?.agentStatus?.writer || "waiting"),
        editor: currentAgent === "editor" ? "running" : (result?.agentStatus?.editor || "waiting"),
      }
    : result?.agentStatus;

  const handleRun = async (formData) => {
    setCurrentAgent("researcher");
    await run(formData);
  };

  const getCurrentIteration = () => {
    if (!result?.iterations) return 1;
    const editorIterations = result.iterations.filter(i => i.agent === "editor").length;
    return Math.max(1, editorIterations);
  };

  return (
    <main>
      <header>
        <p className="eyebrow">MULTI-AGENT AI PLATFORM</p>

        <h1>Researcher, Writer & Editor Agents</h1>

        <p>
          Enter a topic to start the pipeline. The Researcher Agent gathers 
          information, the Writer Agent creates content, and the Editor Agent 
          reviews it. If revisions are needed, the content goes back to the 
          Writer for improvements until the Editor approves it.
        </p>
      </header>

      {/* Visual Workflow Diagram */}
      <WorkflowDiagram 
        currentAgent={currentAgent}
        agentStatus={statuses}
        editorDecision={result?.editorReview?.decision}
        currentIteration={getCurrentIteration()}
      />

      {/* Topic Input Form */}
      <TopicInput onSubmit={handleRun} disabled={loading} />

      {error && <p className="error">{error}</p>}

      {loading && <Loader />}

      {/* Pipeline Runner with Agent Cards */}
      <PipelineRunner
        agentStatus={statuses}
        currentAgent={currentAgent}
        currentIteration={getCurrentIteration()}
        maxIterations={5}
        loading={loading}
        onRun={handleRun}
        disabled={loading}
      />

      {/* Traditional Agent Status List */}
      <AgentStatus statuses={statuses} />

      {/* Iteration Log */}
      <IterationLog iterations={result?.iterations} />

      {/* Research Output */}
      <FinalOutput research={result?.research} />

      {/* Writer Draft */}
      <WriterOutput draft={result?.draft} showRevisionNote={result?.iterations?.some(i => i.isRevision)} />

      {/* Editor Review */}
      <EditorReview review={result?.editorReview} />

      {/* Final Approval Message */}
      {result?.approved && (
        <section className="approval-banner">
          <div className="approval-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div>
              <h3>Content Approved!</h3>
              <p>
                The Editor Agent has approved the content after {getCurrentIteration()} 
                {getCurrentIteration() === 1 ? ' iteration' : ' iterations'}.
                Your content is ready for publication.
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
