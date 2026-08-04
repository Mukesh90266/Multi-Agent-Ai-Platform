import { useState } from "react";
import Home from "./pages/Home";
import History from "./pages/History";
import "./App.css";
export default function App() {
  const [page, setPage] = useState("home");
  return (
    <>
      <nav>
        <strong>AgentLab</strong>
        <div>
          <button onClick={() => setPage("home")}>Research</button>
          <button onClick={() => setPage("history")}>History</button>
        </div>
      </nav>
      {page === "home" ? <Home /> : <History />}
    </>
  );
}
