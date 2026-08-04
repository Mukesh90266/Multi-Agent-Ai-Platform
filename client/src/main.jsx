import { createRoot } from "react-dom/client";
import App from "./App";
import { PipelineProvider } from "./context/PipelineContext";
createRoot(document.getElementById("root")).render(
  <PipelineProvider>
    <App />
  </PipelineProvider>,
);
