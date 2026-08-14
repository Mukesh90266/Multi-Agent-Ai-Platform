const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a8 8 0 0 1 8 8c0 5.33-8 12-8 12s-8-6.67-8-12a8 8 0 0 1 8-8z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

const BoxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const WrenchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const LayersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CoinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M14.5 9.5c-.5-.96-1.45-1.5-2.5-1.5-1.38 0-2.5.9-2.5 2s1 1.75 2.5 2c1.5.25 2.5 1 2.5 2s-1.12 2-2.5 2c-1.05 0-2-.54-2.5-1.5" />
    <line x1="12" y1="6.5" x2="12" y2="17.5" />
  </svg>
);

const NAV_ITEMS = [
  { id: "run", label: "Run Pipeline", Icon: PlayIcon },
  { id: "agents", label: "Agent Library", Icon: BoxIcon },
  { id: "builder", label: "Agent Builder", Icon: WrenchIcon },
  { id: "pipeline", label: "Pipeline Builder", Icon: LayersIcon },
  { id: "templates", label: "Template Library", Icon: LayersIcon },
  { id: "cost", label: "Cost Analytics", Icon: CoinIcon },
  { id: "history", label: "History", Icon: ClockIcon }
];

/**
 * Left navigation shell. Pure UI — navigation state lives in App,
 * all feature state stays in Home (unchanged behavior).
 */
export default function Sidebar({ activePage, onNavigate }) {
  return (
    <nav className="side-nav">
      <div className="side-nav-brand">
        <div className="navbar-logo">
          <BrainIcon />
        </div>
        <div className="side-nav-brand-text">
          <span className="side-nav-title">Multi-Agent</span>
          <span className="side-nav-subtitle">AI Platform</span>
        </div>
      </div>

      <div className="side-nav-items">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${activePage === id ? "active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <span className="nav-item-icon">
              <Icon />
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="side-nav-footer">v2 · dynamic pipelines</div>
    </nav>
  );
}
