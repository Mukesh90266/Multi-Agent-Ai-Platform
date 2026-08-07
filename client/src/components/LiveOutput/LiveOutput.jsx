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

const SEOTabIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

/* ─── Structured SEO Result Card ─── */
function SEOResultCard({ optimization }) {
  if (!optimization) return null;

  const {
    suggestedTitle,
    metaTitle,
    metaDescription,
    slug,
    headings,
    tableOfContents,
    seo,
    readabilityScore,
    mode,
    optimizedContent
  } = optimization;

  const primaryKeyword = seo?.primaryKeyword || "";
  const secondaryKeywords = seo?.secondaryKeywords || [];
  const keywordDensity = seo?.keywordDensity || {};
  const densityWarning = seo?.densityWarning;

  return (
    <div className="seo-result-card">
      {/* Header */}
      <div className="seo-result-header">
        <SEOTabIcon />
        <span>SEO Optimized</span>
        {mode && <span className="seo-mode-badge">{mode === "demo" ? "Demo" : "LLM"}</span>}
      </div>

      {/* Suggested Title */}
      <div className="seo-result-section">
        <div className="seo-result-label">Suggested Title</div>
        <div className="seo-result-title">{suggestedTitle || "—"}</div>
      </div>

      {/* URL Slug */}
      <div className="seo-result-section">
        <div className="seo-result-label">URL Slug</div>
        <code className="seo-result-slug">/{slug || "—"}</code>
      </div>

      {/* Primary Keyword + Readability — side by side */}
      <div className="seo-result-row">
        <div className="seo-result-section seo-result-section-flex">
          <div className="seo-result-label">Primary Keyword</div>
          <span className="seo-result-primary-keyword">{primaryKeyword || "—"}</span>
        </div>
        <div className="seo-result-section seo-result-section-flex">
          <div className="seo-result-label">Readability</div>
          <div className="seo-result-readability">
            <span className="seo-readability-value">{readabilityScore ?? "—"}/100</span>
            <div className="seo-readability-bar">
              <div
                className="seo-readability-fill"
                style={{ width: `${readabilityScore || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Keywords — tag chips */}
      {secondaryKeywords.length > 0 && (
        <div className="seo-result-section">
          <div className="seo-result-label">Secondary Keywords</div>
          <div className="seo-result-keyword-tags">
            {secondaryKeywords.map((kw, i) => (
              <span key={i} className="seo-result-keyword-chip">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* Keyword Density */}
      {Object.keys(keywordDensity).length > 0 && (
        <div className="seo-result-section">
          <div className="seo-result-label">Keyword Density</div>
          <div className="seo-result-density-list">
            {Object.entries(keywordDensity).map(([kw, density]) => (
              <div key={kw} className="seo-result-density-item">
                <span className="seo-density-kw">{kw}</span>
                <span className="seo-density-val">{density}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta Title */}
      <div className="seo-result-section">
        <div className="seo-result-label">Meta Title <span className="seo-char-count">({metaTitle?.length || 0} chars)</span></div>
        <p className="seo-result-meta-text">{metaTitle || "—"}</p>
      </div>

      {/* Meta Description */}
      <div className="seo-result-section">
        <div className="seo-result-label">Meta Description <span className="seo-char-count">({metaDescription?.length || 0} chars)</span></div>
        <p className="seo-result-meta-text">{metaDescription || "—"}</p>
      </div>

      {/* Table of Contents */}
      {tableOfContents && tableOfContents.length > 0 && (
        <div className="seo-result-section">
          <div className="seo-result-label">Table of Contents</div>
          <div className="seo-result-toc">
            {tableOfContents.map((item, i) => (
              <div key={i} className="seo-toc-item">{item}</div>
            ))}
          </div>
        </div>
      )}

      {/* Headings Structure */}
      {headings && (headings.h2?.length > 0 || headings.h3?.length > 0) && (
        <div className="seo-result-section">
          <div className="seo-result-label">Heading Structure</div>
          <div className="seo-result-headings">
            {headings.h1 && <div className="seo-heading-item seo-heading-h1">H1: {headings.h1}</div>}
            {headings.h2?.map((h, i) => (
              <div key={`h2-${i}`} className="seo-heading-item seo-heading-h2">H2: {h}</div>
            ))}
            {headings.h3?.map((h, i) => (
              <div key={`h3-${i}`} className="seo-heading-item seo-heading-h3">H3: {h}</div>
            ))}
          </div>
        </div>
      )}

      {/* Density Warning */}
      {densityWarning && (
        <div className="seo-result-warning">
          <span className="seo-warning-icon">⚠️</span>
          <span>{densityWarning}</span>
        </div>
      )}

      {/* Optimized Content Preview */}
      {optimizedContent && (
        <div className="seo-result-section seo-content-section">
          <div className="seo-result-label">Optimized Content</div>
          <pre className="seo-result-content-preview">{optimizedContent}</pre>
        </div>
      )}
    </div>
  );
}

export default function LiveOutput({ result, loading }) {
  const [activeTab, setActiveTab] = useState("research");
  const [selectedIteration, setSelectedIteration] = useState(1);
  const [copied, setCopied] = useState(false);

  // Extract iterations from result
  const getDraftIterations = () => {
    if (!result?.iterations) return [];
    return result.iterations.filter(it => it.phase === "write");
  };

  const getEditorIterations = () => {
    if (!result?.iterations) return [];
    return result.iterations.filter(it => it.phase === "review");
  };

  const draftIterations = getDraftIterations();
  const editorIterations = getEditorIterations();
  const totalIterations = Math.max(draftIterations.length, editorIterations.length);

  // Main tabs
  const tabs = [
    { id: "research", label: "Research", icon: SearchIcon },
    { id: "draft", label: "Draft", icon: PenIcon },
    { id: "feedback", label: "Editor", icon: MessageIcon },
    { id: "final", label: "Final", icon: FileIcon },
    { id: "seo", label: "SEO", icon: SEOTabIcon },
  ];

  // Get text content for non-SEO tabs
  const getContent = () => {
    switch (activeTab) {
      case "research":
        return result?.research ? JSON.stringify(result.research, null, 2) : "";

      case "draft": {
        if (totalIterations === 0) return "";
        const iteration = draftIterations[selectedIteration - 1];
        return iteration?.output?.content || "";
      }

      case "feedback": {
        if (totalIterations === 0) return "";
        const iteration = editorIterations[selectedIteration - 1];
        return iteration?.output ? JSON.stringify(iteration.output, null, 2) : "";
      }

      case "final":
        return result?.draft?.content || "";

      default:
        return "";
    }
  };

  const getFileName = () => {
    switch (activeTab) {
      case "research":
        return "research-output.json";
      case "draft":
        return `draft-v${selectedIteration}.md`;
      case "feedback":
        return `editor-review-v${selectedIteration}.json`;
      case "final":
        return "final-output.md";
      case "seo":
        return "seo-optimization.md";
      default:
        return "output.json";
    }
  };

  const handleCopy = () => {
    if (activeTab === "seo" && result?.optimization) {
      navigator.clipboard.writeText(JSON.stringify(result.optimization, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    const content = getContent();
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const content = getContent();
  const isSEOTab = activeTab === "seo";
  const seoHasData = isSEOTab && result?.optimization;
  const lineCount = content ? content.split("\n").length : 1;
  const hasContent = isSEOTab ? !!seoHasData : (content && content.length > 0);

  // Get score for current iteration
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
          <div className="card-header-icon">
            <BoltIcon />
          </div>
          <div>
            <div className="card-header-title">Live output</div>
            <div className="card-header-subtitle">
              {loading ? "Processing pipeline..." : hasContent ? "All iterations from each agent" : "Run the pipeline to see results"}
            </div>
          </div>
        </div>
        <div className="card-header-right">
          <ExpandIcon />
        </div>
      </div>

      {/* Main Tabs */}
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

      {/* Iteration Selector - Only show for Draft and Editor tabs */}
      {(activeTab === "draft" || activeTab === "feedback") && totalIterations > 0 && (
        <div className="iteration-selector">
          <span className="iteration-selector-label">
            {activeTab === "draft" ? "Draft Version:" : "Editor Review:"}
          </span>
          <div className="iteration-buttons">
            {Array.from({ length: totalIterations }, (_, i) => i + 1).map((iter) => {
              const iterData = activeTab === "draft"
                ? draftIterations[iter - 1]
                : editorIterations[iter - 1];
              const iterScore = iterData?.output?.qualityScore;
              const isApproved = iterScore >= 80;

              return (
                <button
                  key={iter}
                  className={`iteration-btn ${selectedIteration === iter ? "active" : ""} ${isApproved ? "approved" : ""}`}
                  onClick={() => setSelectedIteration(iter)}
                >
                  v{iter}
                  {iterScore && <span className="iteration-score">{iterScore}</span>}
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
          {isSEOTab && result?.optimization?.readabilityScore != null && (
            <span className="iteration-badge approved">
              ✅ Readability {result.optimization.readabilityScore}/100
            </span>
          )}
        </div>
        <div className="file-actions">
          <span className="line-count">
            {loading ? "..." : isSEOTab ? "structured" : `${lineCount} lines`}
          </span>
          <button className="copy-btn" onClick={handleCopy} disabled={!hasContent}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* SEO Tab — Structured HTML Card */}
      {isSEOTab ? (
        seoHasData ? (
          <div className="seo-result-scroll">
            <SEOResultCard optimization={result.optimization} />
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
            <div className="empty-title">SEO output will appear here</div>
            <div className="empty-subtitle">Run the pipeline and get content approved</div>
          </div>
        )
      ) : (
        /* Non-SEO tabs — Code/Text view */
        hasContent ? (
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
        )
      )}
    </div>
  );
}
