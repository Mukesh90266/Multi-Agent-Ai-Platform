import { useMemo, useState } from "react";

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);
const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
const PenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M12 8V4" />
    <circle cx="8" cy="14" r="1" />
    <circle cx="16" cy="14" r="1" />
    <path d="M9 18h6" />
  </svg>
);
const SEOTabIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

function formatOutput(output) {
  if (!output) return "";
  if (typeof output === "string") return output;
  if (typeof output.content === "string") return output.content;
  if (typeof output.optimizedContent === "string") return output.optimizedContent;
  return JSON.stringify(output, null, 2);
}

function AgentOutputs({ outputs = [] }) {
  if (!outputs.length) {
    return (
      <div className="empty-state compact-empty">
        <div className="empty-icon"><ClipboardIcon /></div>
        <div className="empty-title">Agent outputs will appear here</div>
        <div className="empty-subtitle">Every selected agent writes into the shared pipeline context.</div>
      </div>
    );
  }

  return (
    <div className="agent-output-list">
      {outputs.map((entry, index) => (
        <div className="agent-output-card" key={`${entry.stepId}-${index}`}>
          <div className="agent-output-card-header">
            <div>
              <span className="agent-output-index">#{index + 1}</span>
              <span className="agent-output-name">{entry.agentName}</span>
              <span className={`agent-output-type ${entry.type}`}>{entry.type}</span>
            </div>
            <span className="agent-output-phase">{entry.phase}</span>
          </div>
          {entry.summary && <div className="agent-output-summary">{entry.summary}</div>}
          <pre className="agent-output-pre">{formatOutput(entry.output)}</pre>
        </div>
      ))}
    </div>
  );
}

function SEOResultCard({ optimization }) {
  if (!optimization) return null;
  return (
    <div className="seo-card">
      <div className="seo-card-title-block">
        <div className="seo-card-title-text">
          <h2 className="seo-card-heading">{optimization.suggestedTitle || "SEO Optimized"}</h2>
          {optimization.slug && <code className="seo-slug-value">/{optimization.slug}</code>}
        </div>
      </div>
      <div className="seo-card-section">
        <div className="seo-section-heading">SEO Metadata</div>
        <pre className="seo-content-preview">{JSON.stringify(optimization, null, 2)}</pre>
      </div>
    </div>
  );
}

export default function LiveOutput({ result, loading }) {
  const [activeTab, setActiveTab] = useState("agents");
  const [selectedIteration, setSelectedIteration] = useState(1);
  const [copied, setCopied] = useState(false);

  const agentOutputs = result?.agentOutputs || [];

  const draftIterations = useMemo(() => {
    if (!result?.iterations) return [];
    return result.iterations.filter((it) => it.phase === "write");
  }, [result]);

  const editorIterations = useMemo(() => {
    if (!result?.iterations) return [];
    return result.iterations.filter((it) => it.phase === "review");
  }, [result]);

  const totalIterations = Math.max(draftIterations.length, editorIterations.length);

  const tabs = [
    { id: "agents", label: "Agents", icon: BotIcon },
    { id: "research", label: "Research", icon: SearchIcon },
    { id: "draft", label: "Draft", icon: PenIcon },
    { id: "feedback", label: "Editor", icon: MessageIcon },
    { id: "final", label: "Final", icon: FileIcon },
    { id: "seo", label: "SEO", icon: SEOTabIcon },
  ];

  const getContent = () => {
    switch (activeTab) {
      case "agents": return agentOutputs.map((entry, index) => `#${index + 1} ${entry.agentName}\n${formatOutput(entry.output)}`).join("\n\n---\n\n");
      case "research": return result?.research ? JSON.stringify(result.research, null, 2) : "";
      case "draft": {
        if (totalIterations === 0) return "";
        const iteration = draftIterations[selectedIteration - 1];
        return iteration?.output?.content || formatOutput(iteration?.output);
      }
      case "feedback": {
        if (totalIterations === 0) return "";
        const iteration = editorIterations[selectedIteration - 1];
        return iteration?.output ? JSON.stringify(iteration.output, null, 2) : "";
      }
      case "final": return result?.finalOutput?.content || result?.draft?.content || "";
      case "seo": return result?.optimization ? JSON.stringify(result.optimization, null, 2) : "";
      default: return "";
    }
  };

  const getFileName = () => {
    switch (activeTab) {
      case "agents": return "agent-outputs.txt";
      case "research": return "research-output.json";
      case "draft": return `draft-v${selectedIteration}.md`;
      case "feedback": return `editor-review-v${selectedIteration}.json`;
      case "final": return "final-output.md";
      case "seo": return "seo-optimization.json";
      default: return "output.txt";
    }
  };

  const handleCopy = () => {
    const content = getContent();
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const content = getContent();
  const isSEOTab = activeTab === "seo";
  const hasContent = activeTab === "agents" ? agentOutputs.length > 0 : Boolean(content && content.length > 0);
  const lineCount = content ? content.split("\n").length : 1;

  const getCurrentScore = () => {
    if (activeTab === "feedback" && editorIterations[selectedIteration - 1]) {
      return editorIterations[selectedIteration - 1].output?.qualityScore;
    }
    return null;
  };
  const score = getCurrentScore();

  return (
    <div className="live-output-card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-header-icon"><BoltIcon /></div>
          <div>
            <div className="card-header-title">Live output</div>
            <div className="card-header-subtitle">
              {loading ? "Processing dynamic pipeline..." : hasContent ? "Shared context and outputs from every agent" : "Run a pipeline to see results"}
            </div>
          </div>
        </div>
        <div className="card-header-right"><ExpandIcon /></div>
      </div>

      <div className="tabs-container">
        {tabs.map((tab) => (
          <button key={tab.id} className={`tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
            <tab.icon />{tab.label}
          </button>
        ))}
      </div>

      {(activeTab === "draft" || activeTab === "feedback") && totalIterations > 0 && (
        <div className="iteration-selector">
          <span className="iteration-selector-label">{activeTab === "draft" ? "Draft Version:" : "Editor Review:"}</span>
          <div className="iteration-buttons">
            {Array.from({ length: totalIterations }, (_, i) => i + 1).map((iter) => {
              const iterData = activeTab === "draft" ? draftIterations[iter - 1] : editorIterations[iter - 1];
              const iterScore = iterData?.output?.qualityScore;
              const isApproved = iterScore >= 80;
              return (
                <button key={iter} className={`iteration-btn ${selectedIteration === iter ? "active" : ""} ${isApproved ? "approved" : ""}`} onClick={() => setSelectedIteration(iter)}>
                  v{iter}{iterScore && <span className="iteration-score">{iterScore}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="file-status-bar">
        <div className="file-info">
          <div className="file-dot" />
          <span className="file-name">{getFileName()}</span>
          {score && (
            <span className={`iteration-badge ${score >= 80 ? "approved" : "needs-work"}`}>
              {score >= 80 ? "✅ Approved" : "🔄 Needs Work"} ({score}/100)
            </span>
          )}
        </div>
        <div className="file-actions">
          <span className="line-count">{loading ? "..." : isSEOTab ? "structured" : `${lineCount} lines`}</span>
          <button className="copy-btn" onClick={handleCopy} disabled={!hasContent}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      </div>

      {activeTab === "agents" ? (
        <div className="code-container agent-output-container">
          <AgentOutputs outputs={agentOutputs} />
          {loading && <div className="live-loading-bar"><div className="loading-spinner-small"></div><span>Pipeline running...</span></div>}
        </div>
      ) : isSEOTab ? (
        result?.optimization ? (
          <div className="seo-card-scroll">
            <SEOResultCard optimization={result.optimization} />
            {loading && <div className="live-loading-bar"><div className="loading-spinner-small"></div><span>Pipeline running...</span></div>}
          </div>
        ) : loading ? (
          <div className="code-container"><div className="loading-content"><div className="loading-spinner"></div><span>Processing pipeline...</span></div></div>
        ) : (
          <div className="empty-state"><div className="empty-icon"><ClipboardIcon /></div><div className="empty-title">SEO output will appear here</div><div className="empty-subtitle">Add/run an optimizer agent if available</div></div>
        )
      ) : hasContent ? (
        <div className="code-container">
          <pre className="code-content">{content}</pre>
          {loading && <div className="live-loading-bar"><div className="loading-spinner-small"></div><span>Pipeline running...</span></div>}
        </div>
      ) : loading ? (
        <div className="code-container"><div className="loading-content"><div className="loading-spinner"></div><span>Processing pipeline...</span></div></div>
      ) : (
        <div className="empty-state"><div className="empty-icon"><ClipboardIcon /></div><div className="empty-title">Output will appear here</div><div className="empty-subtitle">Run the pipeline to see results</div></div>
      )}
    </div>
  );
}
