import { useState } from "react";
import Sidebar from "./components/Sidebar/Sidebar";
import Home from "./pages/Home";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("run");

  return (
    <div className="app-shell">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="app-content">
        {/* Home keeps ALL feature state (agents, pipeline selection, run,
            polling); `section` only changes WHAT is rendered where — no
            logic changes. State survives navigation (no remount). */}
        <Home section={page} onNavigate={setPage} />
      </main>
    </div>
  );
}
