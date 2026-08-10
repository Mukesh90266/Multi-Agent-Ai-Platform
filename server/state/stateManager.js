const activeRuns = new Map();

/**
 * Shared in-memory state for live pipeline runs.
 */
export const stateManager = {
  set: (id, data) => {
    const state = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    activeRuns.set(id, state);
  },

  get: (id) => activeRuns.get(id),

  clear: (id) => activeRuns.delete(id),

  getPhase: (id) => {
    const state = activeRuns.get(id);
    if (!state) return null;

    const runningStepId = Object.entries(state.agentStatus || {})
      .find(([, status]) => status === "running")?.[0];
    const currentStep = state.currentStep ||
      state.pipeline?.steps?.find((step) => step.stepId === runningStepId) ||
      null;

    return {
      status: state.status,
      iteration: state.iteration,
      maxIterations: state.maxIterations,
      currentAgent: currentStep?.agentId || runningStepId || "idle",
      currentStep
    };
  }
};
