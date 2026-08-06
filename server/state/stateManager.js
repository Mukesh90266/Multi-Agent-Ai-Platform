const activeRuns = new Map();

/**
 * Enhanced state manager with phase tracking for the pipeline
 */
export const stateManager = {
  set: (id, data) => {
    // Add timestamp and phase tracking
    const state = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    activeRuns.set(id, state);
  },
  get: (id) => activeRuns.get(id),
  clear: (id) => activeRuns.delete(id),
  
  // Get the current phase of execution
  getPhase: (id) => {
    const state = activeRuns.get(id);
    if (!state) return null;
    return {
      status: state.status,
      iteration: state.iteration,
      maxIterations: state.maxIterations,
      currentAgent: state.agentStatus?.researcher === 'running' ? 'researcher' :
                    state.agentStatus?.writer === 'running' ? 'writer' :
                    state.agentStatus?.editor === 'running' ? 'editor' : 'idle'
    };
  }
};
