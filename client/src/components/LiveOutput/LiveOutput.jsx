import { useState } from "react";

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

export default function LiveOutput({ result, loading }) {
  const [activeTab, setActiveTab] = useState("research");
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: "research", label: "Research JSON", icon: SearchIcon, file: "research-output.json" },
    { id: "draft", label: "Draft", icon: PenIcon, file: "draft.md" },
    { id: "feedback", label: "Feedback", icon: MessageIcon, file: "editor-feedback.json" },
    { id: "final", label: "Final output", icon: FileIcon, file: "final-output.md" },
  ];

  const getContent = () => {
    switch (activeTab) {
      case "research":
        return result?.research ? JSON.stringify(result.research, null, 2) : "";
      case "draft":
        return result?.draft?.content || "";
      case "feedback":
        return result?.editorReview ? JSON.stringify(result.editorReview, null, 2) : "";
      case "final":
        return result?.draft?.content || "";
      default:
        return "";
    }
  };

  const getFileName = () => {
    return tabs.find((t) => t.id === activeTab)?.file || "output.json";
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
  const lineCount = content ? content.split("\n").length : 1;
  const hasContent = content && content.length > 0;

  return (
    <div className="live-output-card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-header-icon">
            <BoltIcon />
          </div>
          <div>
            <div className="card-header-title">Live output</div>
            <div className="card-header-subtitle">
              {loading ? "Processing pipeline..." : hasContent ? "Real-time output from each agent" : "Run the pipeline to see results"}
            </div>
          </div>
        </div>
        <div className="card-header-right">
          <ExpandIcon />
        </div>
      </div>

      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="file-status-bar">
        <div className="file-info">
          <div className="file-dot" />
          <span className="file-name">{getFileName()}</span>
        </div>
        <div className="file-actions">
          <span className="line-count">
            {loading ? "..." : `${lineCount} lines`}
          </span>
          <button className="copy-btn" onClick={handleCopy} disabled={!hasContent}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {hasContent ? (
        <div className="code-container">
          <pre className="code-content">{content}</pre>
          {loading && (
            <div className="live-loading-bar">
              <div className="loading-spinner-small"></div>
              <span>Pipeline running...</span>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="code-container">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <span>Processing pipeline...</span>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <ClipboardIcon />
          </div>
          <div className="empty-title">Output will appear here</div>
          <div className="empty-subtitle">Run the pipeline to see results</div>
        </div>
      )}
    </div>
  );
}
