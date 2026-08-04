import { useState } from "react";
import "./LiveOutput.css";

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
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

export default function LiveOutput({ result, loading }) {
  const [activeTab, setActiveTab] = useState("research");
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: "research", label: "Research JSON" },
    { id: "draft", label: "Draft" },
    { id: "feedback", label: "Feedback" },
    { id: "final", label: "Final Output" },
  ];

  const getTabContent = () => {
    switch (activeTab) {
      case "research":
        return result?.research ? JSON.stringify(result.research, null, 2) : "// Research output will appear here";
      case "draft":
        return result?.draft?.content || "// Draft content will appear here";
      case "feedback":
        return result?.editorReview ? JSON.stringify(result.editorReview, null, 2) : "// Editor feedback will appear here";
      case "final":
        return result?.draft?.content || "// Final output will appear here";
      default:
        return "";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getTabContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card live-output-card">
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
        <button className="expand-btn">
          <ExpandIcon />
          Expand All
        </button>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="code-container">
        <div className="code-header">
          <span className="code-lang">{activeTab === "draft" ? "Markdown" : "JSON"}</span>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="code-content">
          <pre>
            <code>{getTabContent()}</code>
          </pre>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Processing pipeline...</span>
        </div>
      )}
    </div>
  );
}
