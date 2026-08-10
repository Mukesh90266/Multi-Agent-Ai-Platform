import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import TopicInput from "../components/TopicInput/TopicInput";
import PipelineStatus from "../components/PipelineStatus/PipelineStatus";
import PipelineInfo from "../components/PipelineInfo/PipelineInfo";
import LiveOutput from "../components/LiveOutput/LiveOutput";
import AgentBuilder from "../components/Agents/AgentBuilder";
import AgentLibrary from "../components/Agents/AgentLibrary";
import PipelineBuilder from "../components/Agents/PipelineBuilder";
import { createAgent, deleteAgent, getAgents, getPipelineStatus, runPipeline } from "../services/api.js";

const DEFAULT_AGENT_IDS = ["researcher", "writer", "editor"];
const CUSTOM_AGENTS_STORAGE_KEY = "multi-agent-platform.customAgents";
const DELETED_CUSTOM_AGENTS_STORAGE_KEY = "multi-agent-platform.deletedCustomAgentIds";

const CLIENT_BUILT_IN_AGENTS = [
  {
    id: "researcher",
    type: "built-in",
    name: "Researcher",
    role: "Collects trustworthy planning notes, key points, definitions, outlines, examples, and source-verification reminders for the user's topic.",
    personality: "Careful, skeptical, concise, and source-aware.",
    phase: "research",
    immutable: true,
    builtIn: true
  },
  {
    id: "writer",
    type: "built-in",
    name: "Writer",
    role: "Turns the original input and any prior agent outputs into clear, useful Markdown content.",
    personality: "Practical, engaging, and audience-focused.",
    phase: "write",
    immutable: true,
    builtIn: true
  },
  {
    id: "editor",
    type: "built-in",
    name: "Editor",
    role: "Reviews drafts for quality, accuracy, completeness, structure, tone, and actionability.",
    personality: "Strict, helpful, professional, and specific.",
    phase: "review",
    immutable: true,
    builtIn: true
  }
];

function isCustomAgent(agent) {
  return agent?.type === "custom" || String(agent?.id || "").startsWith("custom-");
}

function loadPersistedCustomAgents() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(CUSTOM_AGENTS_STORAGE_KEY) || "[]");
    const deletedIds = loadDeletedCustomAgentIds();
    return Array.isArray(parsed)
      ? parsed.filter((agent) => isCustomAgent(agent) && !deletedIds.has(agent.id))
      : [];
  } catch {
    return [];
  }
}

function loadDeletedCustomAgentIds() {
  if (typeof window === "undefined") return new Set();

  try {
    const parsed = JSON.parse(window.localStorage.getItem(DELETED_CUSTOM_AGENTS_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function saveDeletedCustomAgentIds(deletedIds) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DELETED_CUSTOM_AGENTS_STORAGE_KEY, JSON.stringify(Array.from(deletedIds)));
}

function rememberDeletedCustomAgentId(agentId) {
  const deletedIds = loadDeletedCustomAgentIds();
  deletedIds.add(agentId);
  saveDeletedCustomAgentIds(deletedIds);
}

function forgetDeletedCustomAgentId(agentId) {
  const deletedIds = loadDeletedCustomAgentIds();
  deletedIds.delete(agentId);
  saveDeletedCustomAgentIds(deletedIds);
}

function savePersistedCustomAgents(customAgents) {
  if (typeof window === "undefined") return;

  const deletedIds = loadDeletedCustomAgentIds();
  const uniqueCustomAgents = Array.from(
    new Map(
      customAgents
        .filter((agent) => isCustomAgent(agent) && !deletedIds.has(agent.id))
        .map((agent) => [agent.id, agent])
    ).values()
  );
  window.localStorage.setItem(CUSTOM_AGENTS_STORAGE_KEY, JSON.stringify(uniqueCustomAgents));
}

function removePersistedCustomAgent(agentId) {
  const nextCustomAgents = loadPersistedCustomAgents().filter((agent) => agent.id !== agentId);
  savePersistedCustomAgents(nextCustomAgents);
  rememberDeletedCustomAgentId(agentId);
}

function mergeAgents(...agentLists) {
  const merged = new Map();

  for (const agent of CLIENT_BUILT_IN_AGENTS) {
    merged.set(agent.id, agent);
  }

  for (const list of agentLists) {
    for (const agent of list || []) {
      if (!agent?.id) continue;
      merged.set(agent.id, {
        ...agent,
        type: agent.type || (String(agent.id).startsWith("custom-") ? "custom" : "built-in")
      });
    }
  }

  return Array.from(merged.values());
}

function slugify(value) {
  return String(value || "agent")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "agent";
}

function createLocalCustomAgent(payload) {
  const now = new Date().toISOString();
  const randomId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);

  return {
    id: `custom-${slugify(payload.name)}-${randomId}`,
    type: "custom",
    name: String(payload.name || "Custom Agent").trim(),
    role: String(payload.role || "Custom agent").trim(),
    personality: String(payload.personality || "Helpful").trim(),
    systemPrompt: String(payload.systemPrompt || "Follow your configured role.").trim(),
    description: String(payload.role || "Custom agent").trim(),
    immutable: false,
    builtIn: false,
    phase: "custom",
    createdAt: now,
    updatedAt: now
  };
}

function makeClientStep(agentId) {
  return {
    clientId: `${agentId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    agentId
  };
}

function makeStepsFromIds(agentIds) {
  return agentIds.map((agentId) => makeClientStep(agentId));
}

function createLocalPipelineSteps(selectedSteps, agentsById) {
  const counts = selectedSteps.reduce((map, step) => {
    map.set(step.agentId, (map.get(step.agentId) || 0) + 1);
    return map;
  }, new Map());

  return selectedSteps.map((step, index) => {
    const agent = agentsById.get(step.agentId);
    const duplicateCount = counts.get(step.agentId) || 1;
    const stepId = duplicateCount > 1 ? `${step.agentId}__${index + 1}` : step.agentId;

    return {
      stepId,
      index,
      agentId: step.agentId,
      name: agent?.name || step.agentId,
      type: agent?.type || "custom",
      role: agent?.role || "",
      personality: agent?.personality || "",
      phase: agent?.phase || "agent",
      builtIn: agent?.type === "built-in"
    };
  });
}

function createWaitingStatus(steps) {
  return steps.reduce((status, step) => {
    status[step.stepId] = "waiting";
    return status;
  }, {});
}

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [agents, setAgents] = useState(() => mergeAgents(loadPersistedCustomAgents()));
  const [libraryError, setLibraryError] = useState(null);
  const [pipelineError, setPipelineError] = useState(null);
  const [selectedSteps, setSelectedSteps] = useState(() => makeStepsFromIds(DEFAULT_AGENT_IDS));
  const [activeTemplateId, setActiveTemplateId] = useState("default-rwe");
  const [agentStatus, setAgentStatus] = useState({});

  const pollIntervalRef = useRef(null);
  const runIdRef = useRef(null);

  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const localPipelineSteps = useMemo(
    () => createLocalPipelineSteps(selectedSteps, agentsById),
    [selectedSteps, agentsById]
  );
  const selectedAgentIds = useMemo(
    () => selectedSteps.map((step) => step.agentId),
    [selectedSteps]
  );
  const isDefaultPipeline =
    selectedAgentIds.length === DEFAULT_AGENT_IDS.length &&
    selectedAgentIds.every((agentId, index) => agentId === DEFAULT_AGENT_IDS[index]);

  const refreshAgents = useCallback(async () => {
    const deletedIds = loadDeletedCustomAgentIds();
    const localCustomAgents = loadPersistedCustomAgents();

    try {
      setLibraryError(null);
      const data = await getAgents();

      if (data.success) {
        for (const deletedId of deletedIds) {
          try {
            await deleteAgent(deletedId);
            forgetDeletedCustomAgentId(deletedId);
          } catch (deleteError) {
            console.warn("Could not sync deleted custom agent:", deleteError.message);
          }
        }

        const activeDeletedIds = loadDeletedCustomAgentIds();
        const idsToHideThisRefresh = new Set([...deletedIds, ...activeDeletedIds]);
        const serverAgents = (data.agents || []).filter((agent) => !idsToHideThisRefresh.has(agent.id));
        const serverCustomIds = new Set(serverAgents.filter(isCustomAgent).map((agent) => agent.id));
        const missingLocalAgents = localCustomAgents.filter((agent) => !serverCustomIds.has(agent.id));
        const syncedAgents = [];

        for (const agent of missingLocalAgents) {
          try {
            const syncResult = await createAgent(agent);
            if (syncResult.success && syncResult.agent) {
              syncedAgents.push(syncResult.agent);
              forgetDeletedCustomAgentId(syncResult.agent.id);
            }
          } catch (syncError) {
            console.warn("Could not sync cached custom agent:", syncError.message);
          }
        }

        const mergedAgents = mergeAgents(serverAgents, localCustomAgents, syncedAgents)
          .filter((agent) => !loadDeletedCustomAgentIds().has(agent.id));
        setAgents(mergedAgents);
        savePersistedCustomAgents(mergedAgents.filter(isCustomAgent));
      }
    } catch (error) {
      setAgents(mergeAgents(localCustomAgents));
      setLibraryError("Backend unavailable. Showing cached agents; custom agents will sync when the server is reachable.");
    }
  }, []);

  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  useEffect(() => {
    setAgentStatus(createWaitingStatus(localPipelineSteps));
  }, [localPipelineSteps]);

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const determineCurrentAgent = useCallback((statusObj, pipelineSteps = []) => {
    const runningStepId = Object.entries(statusObj || {}).find(([, status]) => status === "running")?.[0];
    if (!runningStepId) return null;
    return pipelineSteps.find((step) => step.stepId === runningStepId)?.agentId || runningStepId;
  }, []);

  const isPipelineComplete = useCallback((data) => {
    if (["approved", "needs_revision", "completed", "error"].includes(data.status)) {
      return true;
    }

    const statuses = Object.values(data.agentStatus || {});
    return statuses.length > 0 && statuses.every((status) => ["completed", "skipped", "error"].includes(status));
  }, []);

  const handleCreateAgent = async (payload) => {
    try {
      const data = await createAgent(payload);
      if (!data.success) {
        throw new Error(data.message || "Could not create agent.");
      }

      forgetDeletedCustomAgentId(data.agent.id);
      const mergedAgents = mergeAgents(agents, [data.agent]);
      setAgents(mergedAgents);
      savePersistedCustomAgents(mergedAgents.filter(isCustomAgent));
      await refreshAgents();
      return data.agent;
    } catch (error) {
      if (error.response) {
        throw error;
      }

      const localAgent = createLocalCustomAgent(payload);
      forgetDeletedCustomAgentId(localAgent.id);
      const mergedAgents = mergeAgents(agents, [localAgent]);
      setAgents(mergedAgents);
      savePersistedCustomAgents(mergedAgents.filter(isCustomAgent));
      setLibraryError("Backend unavailable. Custom agent saved locally and will sync automatically when the server is reachable.");
      return localAgent;
    }
  };

  const resetDisplayedRun = () => {
    setResult(null);
    setCurrentAgent(null);
    setPipelineError(null);
  };

  const handleAddAgent = (agentId) => {
    resetDisplayedRun();
    setSelectedSteps((prev) => [...prev, makeClientStep(agentId)]);
    setActiveTemplateId(null);
  };

  const handleDeleteAgent = async (agent) => {
    if (!isCustomAgent(agent) || loading) return;

    const confirmed = window.confirm(`Delete custom agent "${agent.name}"? This will also remove it from the current pipeline.`);
    if (!confirmed) return;

    resetDisplayedRun();
    rememberDeletedCustomAgentId(agent.id);

    const nextAgents = agents.filter((existingAgent) => existingAgent.id !== agent.id);
    setAgents(mergeAgents(nextAgents));
    savePersistedCustomAgents(nextAgents.filter(isCustomAgent));
    setSelectedSteps((prev) => prev.filter((step) => step.agentId !== agent.id));
    setActiveTemplateId(null);

    try {
      await deleteAgent(agent.id);
      forgetDeletedCustomAgentId(agent.id);
      setLibraryError(null);
    } catch (error) {
      setLibraryError("Agent deleted locally. Backend delete will sync when the server is reachable.");
    }
  };

  const handleMoveStep = (index, direction) => {
    resetDisplayedRun();
    setSelectedSteps((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setActiveTemplateId(null);
  };

  const handleReorderStep = (sourceIndex, targetIndex) => {
    resetDisplayedRun();
    setSelectedSteps((prev) => {
      if (
        sourceIndex === targetIndex ||
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex >= prev.length ||
        targetIndex >= prev.length
      ) {
        return prev;
      }

      const next = [...prev];
      const [movedStep] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedStep);
      return next;
    });
    setActiveTemplateId(null);
  };

  const handleRemoveStep = (index) => {
    resetDisplayedRun();
    setSelectedSteps((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setActiveTemplateId(null);
  };

  const handleResetDefault = () => {
    resetDisplayedRun();
    setSelectedSteps(makeStepsFromIds(DEFAULT_AGENT_IDS));
    setActiveTemplateId("default-rwe");
  };

  const getSelectedCustomAgents = () => Array.from(new Map(selectedSteps
    .map((step) => agentsById.get(step.agentId))
    .filter(isCustomAgent)
    .map((agent) => [agent.id, agent])).values());

  const validateSelectedPipeline = () => {
    const missingSelectedAgents = selectedSteps.filter((step) => !agentsById.has(step.agentId));

    if (missingSelectedAgents.length > 0) {
      throw new Error(
        "Selected pipeline contains an agent that is no longer in the Agent Library. Remove it from the pipeline and add it again."
      );
    }
  };

  const ensureSelectedCustomAgentsSynced = async () => {
    const selectedCustomAgents = getSelectedCustomAgents();

    if (!selectedCustomAgents.length) return;

    savePersistedCustomAgents(selectedCustomAgents);

    for (const agent of selectedCustomAgents) {
      await createAgent(agent);
    }
  };

  const runPipelineHandler = async (formData) => {
    if (selectedSteps.length === 0) return;

    setLoading(true);
    setResult(null);
    setPipelineError(null);
    setAgentStatus(createWaitingStatus(localPipelineSteps));
    setCurrentAgent(null);
    clearPolling();

    try {
      validateSelectedPipeline();

      const selectedCustomAgents = getSelectedCustomAgents();

      if (!isDefaultPipeline) {
        await ensureSelectedCustomAgentsSynced();
      }

      const pipelinePayload = isDefaultPipeline
        ? { templateId: "default-rwe" }
        : {
            agentIds: selectedAgentIds,
            agentConfigs: selectedCustomAgents
          };

      const startRes = await runPipeline({ ...formData, pipeline: pipelinePayload });

      if (!startRes.success || !startRes.runId) {
        throw new Error(startRes.message || "Failed to start pipeline");
      }

      const runId = startRes.runId;
      runIdRef.current = runId;

      if (startRes.pipeline?.steps) {
        setAgentStatus(createWaitingStatus(startRes.pipeline.steps));
      }

      pollIntervalRef.current = setInterval(async () => {
        try {
          const data = await getPipelineStatus(runId);

          if (data.success) {
            setResult(data);

            const pipelineSteps = data.pipeline?.steps || localPipelineSteps;
            if (data.agentStatus) {
              setAgentStatus(data.agentStatus);
              setCurrentAgent(determineCurrentAgent(data.agentStatus, pipelineSteps));
            }

            if (isPipelineComplete(data)) {
              clearPolling();
              setLoading(false);
              setCurrentAgent(null);
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
          clearPolling();
          setLoading(false);
          setCurrentAgent(null);
        }
      }, 1500);
    } catch (error) {
      console.error("Pipeline error:", error);
      setPipelineError(error.response?.data?.message || error.message || "Pipeline request failed.");
      setLoading(false);
      setCurrentAgent(null);
      setAgentStatus(createWaitingStatus(localPipelineSteps));
    }
  };

  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <TopicInput
          onSubmit={runPipelineHandler}
          disabled={loading || selectedSteps.length === 0}
          selectedCount={selectedSteps.length}
          isDefaultPipeline={isDefaultPipeline}
        />
        {pipelineError && (
          <div className="section run-error-section">
            <div className="builder-message error">{pipelineError}</div>
          </div>
        )}

        <div className="section section-divider">
          <PipelineBuilder
            selectedSteps={selectedSteps}
            agentsById={agentsById}
            onMoveStep={handleMoveStep}
            onReorderStep={handleReorderStep}
            onRemoveStep={handleRemoveStep}
            onResetDefault={handleResetDefault}
            disabled={loading}
            isDefaultPipeline={isDefaultPipeline}
          />
        </div>

        <div className="section section-divider">
          {libraryError && <div className="builder-message error">{libraryError}</div>}
          <AgentLibrary
            agents={agents}
            onAddAgent={handleAddAgent}
            onDeleteAgent={handleDeleteAgent}
            disabled={loading}
          />
        </div>

        <div className="section section-divider">
          <AgentBuilder onCreateAgent={handleCreateAgent} disabled={loading} />
        </div>

        <div className="section section-divider">
          <PipelineStatus
            result={result}
            loading={loading}
            currentAgent={currentAgent}
            agentStatus={agentStatus}
            pipelineSteps={result?.pipeline?.steps || localPipelineSteps}
          />
        </div>

        <div className="section section-divider">
          <PipelineInfo result={result} loading={loading} />
        </div>
      </aside>
      <main className="right-panel">
        <LiveOutput
          result={result}
          loading={loading}
          pipelineSteps={result?.pipeline?.steps || localPipelineSteps}
          agentStatus={agentStatus}
        />
      </main>
    </div>
  );
}
