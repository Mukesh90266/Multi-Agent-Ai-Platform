import { useState } from "react";
import Home from "./pages/Home";
import History from "./pages/History";
import "./App.css";

const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a8 8 0 0 1 8 8c0 5.33-8 12-8 12s-8-6.67-8-12a8 8 0 0 1 8-8z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

export default function App() {
  const [page, setPage] = useState("home");

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-logo">
            <BrainIcon />
          </div>
          <span className="navbar-title">Multi-Agent AI Platform</span>
        </div>
        <div className="navbar-right">
          <button 
            className="view-history-btn"
            onClick={() => setPage(page === "home" ? "history" : "home")}
          >
            View History
          </button>
        </div>
      </nav>
      {page === "home" ? <Home /> : <History />}
    </div>
  );
}
