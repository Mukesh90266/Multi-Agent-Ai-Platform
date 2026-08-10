import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import TopicInput from "../components/TopicInput/TopicInput";
import PipelineStatus from "../components/PipelineStatus/PipelineStatus";
import PipelineInfo from "../components/PipelineInfo/PipelineInfo";
import LiveOutput from "../components/LiveOutput/LiveOutput";
import AgentBuilder from "../components/Agents/AgentBuilder";
import AgentLibrary from "../components/Agents/AgentLibrary";
import PipelineBuilder from "../components/Agents/PipelineBuilder";
import { createAgent, getAgents, getPipelineStatus, runPipeline } from "../services/api.js";

const DEFAULT_AGENT_IDS = ["researcher", "writer", "editor"];

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
  const [agents, setAgents] = useState([]);
  const [libraryError, setLibraryError] = useState(null);
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
  const isDefaultPipeline =
    activeTemplateId === "default-rwe" &&
    selectedSteps.length === DEFAULT_AGENT_IDS.length &&
    selectedSteps.every((step, index) => step.agentId === DEFAULT_AGENT_IDS[index]);

  const refreshAgents = useCallback(async () => {
    try {
      setLibraryError(null);
      const data = await getAgents();
      if (data.success) {
        setAgents(data.agents || []);
      }
    } catch (error) {
      setLibraryError(error.message || "Could not load agents.");
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
    const data = await createAgent(payload);
    if (!data.success) {
      throw new Error(data.message || "Could not create agent.");
    }
    await refreshAgents();
    return data.agent;
  };

  const handleAddAgent = (agentId) => {
    setSelectedSteps((prev) => [...prev, makeClientStep(agentId)]);
    setActiveTemplateId(null);
  };

  const handleMoveStep = (index, direction) => {
    setSelectedSteps((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setActiveTemplateId(null);
  };

  const handleRemoveStep = (index) => {
    setSelectedSteps((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setActiveTemplateId(null);
  };

  const handleResetDefault = () => {
    setSelectedSteps(makeStepsFromIds(DEFAULT_AGENT_IDS));
    setActiveTemplateId("default-rwe");
  };

  const runPipelineHandler = async (formData) => {
    if (selectedSteps.length === 0) return;

    setLoading(true);
    setResult(null);
    setAgentStatus(createWaitingStatus(localPipelineSteps));
    setCurrentAgent(null);
    clearPolling();

    try {
      const pipelinePayload = {
        agentIds: selectedSteps.map((step) => step.agentId),
        templateId: isDefaultPipeline ? "default-rwe" : undefined
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

        <div className="section section-divider">
          <PipelineBuilder
            selectedSteps={selectedSteps}
            agentsById={agentsById}
            onMoveStep={handleMoveStep}
            onRemoveStep={handleRemoveStep}
            onResetDefault={handleResetDefault}
            disabled={loading}
            isDefaultPipeline={isDefaultPipeline}
          />
        </div>

        <div className="section section-divider">
          {libraryError && <div className="builder-message error">{libraryError}</div>}
          <AgentLibrary agents={agents} onAddAgent={handleAddAgent} disabled={loading} />
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
        <LiveOutput result={result} loading={loading} />
      </main>
    </div>
  );
}
