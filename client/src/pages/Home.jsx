import TopicInput from "../components/TopicInput/TopicInput";
import AgentStatus from "../components/AgentStatus/AgentStatus";
import IterationLog from "../components/IterationLog/IterationLog";
import FinalOutput from "../components/FinalOutput/FinalOutput";
import WriterOutput from "../components/WriterOutput/WriterOutput";
import EditorReview from "../components/EditorReview/EditorReview";
import Loader from "../components/Loader/Loader";
import { usePipeline } from "../hooks/usePipeline";

export default function Home() {
  const { result, loading, error, run } = usePipeline();

  const statuses = loading
    ? {
        researcher: "running",
        writer: "waiting",
        editor: "waiting",
      }
    : result?.agentStatus;

  return (
    <main>
      <header>
        <p className="eyebrow">MULTI-AGENT AI PLATFORM</p>

        <h1>Researcher, Writer and Editor Agents</h1>

        <p>
          Enter a topic. The Researcher Agent creates structured research notes,
          the Writer Agent creates a content draft, and the Editor Agent reviews
          the quality and provides feedback.
        </p>
      </header>

      <TopicInput onSubmit={run} disabled={loading} />

      {error && <p className="error">{error}</p>}

      {loading && <Loader />}

      <div className="stack">
        <AgentStatus statuses={statuses} />

        <IterationLog iterations={result?.iterations} />

        <FinalOutput research={result?.research} />

        <WriterOutput draft={result?.draft} />

        <EditorReview review={result?.editorReview} />
      </div>
    </main>
  );
}
