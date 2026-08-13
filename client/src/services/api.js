import axios from "axios";

function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL || "";

  if (!configuredUrl) return "/api";

  try {
    const parsed = new URL(configuredUrl);
    const isConfiguredForLocalhost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname);
    const isBrowserOnLocalhost = typeof window !== "undefined" &&
      ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);

    // In Arena/live-preview environments the browser cannot call localhost:5000.
    // Use the Vite relative proxy instead so /api works after refresh too.
    if (isConfiguredForLocalhost && !isBrowserOnLocalhost) {
      return "/api";
    }
  } catch {
    return "/api";
  }

  return `${configuredUrl.replace(/\/$/, "")}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl()
});

export const runPipeline = (payload) => api.post("/pipeline/run", payload).then((r) => r.data);
export const getPipelineStatus = (runId) => api.get(`/pipeline/status/${runId}`).then((r) => r.data);
export const getPipelineTemplates = () => api.get("/pipeline/templates").then((r) => r.data);
export const getAgents = () => api.get("/agents").then((r) => r.data);
export const createAgent = (payload) => api.post("/agents", payload).then((r) => r.data);
export const deleteAgent = (agentId) => api.delete(`/agents/${agentId}`).then((r) => r.data);
export const getTools = () => api.get("/tools").then((r) => r.data);
export const getHistory = () => api.get("/history").then((r) => r.data);
export const getCostAnalytics = () => api.get("/history/cost-analytics").then((r) => r.data);
