import { useState, useEffect } from "react";
import "./LiveOutput.css";

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

const MinimizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
  </svg>
);

export default function LiveOutput({ result, loading }) {
  const [activeTab, setActiveTab] = useState("research");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const tabs = [
    { id: "research", label: "Research JSON", icon: "🔍" },
    { id: "draft", label: "Draft", icon: "✍️" },
    { id: "feedback", label: "Feedback", icon: "💬" },
    { id: "final", label: "Final Output", icon: "✨" },
  ];

  const getTabContent = () => {
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

  const handleCopy = () => {
    navigator.clipboard.writeText(getTabContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJson = (json) => {
    if (!json) return "";
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  };

  return (
    <div className={`live-output-card ${expanded ? "expanded" : ""}`}>
      <div className="output-header">
        <div className="header-left">
          <div className="header-icon">
            <BoltIcon />
          </div>
          <div>
            <h2>Live Output</h2>
            <p>Real-time output from each agent</p>
          </div>
        </div>
        <div className="header-actions">
          {loading && (
            <div className="live-indicator">
              <span className="pulse"></span>
              Live
            </div>
          )}
          <button className="icon-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? <MinimizeIcon /> : <ExpandIcon />}
          </button>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="code-wrapper">
        <div className="code-header">
          <div className="code-info">
            <span className="dot"></span>
            <span className="file-name">
              {activeTab === "research" && "research-output.json"}
              {activeTab === "draft" && "draft.md"}
              {activeTab === "feedback" && "editor-feedback.json"}
              {activeTab === "final" && "final-output.md"}
            </span>
          </div>
          <div className="code-actions">
            <span className="line-count">
              {getTabContent().split('\n').length} lines
            </span>
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <div className="code-content">
          {getTabContent() ? (
            <pre>
              <code>{formatJson(getTabContent())}</code>
            </pre>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>Output will appear here</p>
              <span>Run the pipeline to see results</span>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      )}
    </div>
  );
}
