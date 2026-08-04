import { createContext, useState } from "react";
export const PipelineContext = createContext(null);
export function PipelineProvider({ children }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <PipelineContext.Provider
      value={{ result, setResult, loading, setLoading, error, setError }}
    >
      {children}
    </PipelineContext.Provider>
  );
}
