const activeRuns = new Map();
export const stateManager = { set: (id, data) => activeRuns.set(id, data), get: id => activeRuns.get(id), clear: id => activeRuns.delete(id) };
