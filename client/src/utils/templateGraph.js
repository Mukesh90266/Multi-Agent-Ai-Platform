/**
 * Pure helpers that translate between a saved template's `dependencies`
 * map and the pipeline builder's client-side edge list.
 *
 * A template stores dependencies exactly as the run API accepts them:
 *   { "<agentId|stepId>": ["<agentId|stepId>", ...] }   — [] = independent root
 * The builder renders them as edges between node clientIds.
 *
 * Kept free of React/JSX so the round-trip logic can be unit-tested in Node.
 */

export const DEFAULT_PIPELINE_AGENT_IDS = ["researcher", "writer", "editor"];

/** Agent ids stored in a template — explicit list, or the default trio. */
export function templateAgentIds(template) {
  const pipeline = template?.pipeline || {};
  if (Array.isArray(pipeline.agentIds) && pipeline.agentIds.length) {
    return pipeline.agentIds;
  }
  if (pipeline.templateId === "default-rwe") return [...DEFAULT_PIPELINE_AGENT_IDS];
  return [];
}

/**
 * Build the run/template `dependencies` payload from the graph edges.
 * Keys/values are agent ids (server resolves agentId, then stepId).
 */
export function buildDependenciesPayload(steps, edges) {
  const agentByClientId = new Map(steps.map((step) => [step.clientId, step.agentId]));
  const dependencies = {};

  for (const edge of edges) {
    const toAgent = agentByClientId.get(edge.to);
    const fromAgent = agentByClientId.get(edge.from);
    if (!toAgent || !fromAgent) continue;
    if (!dependencies[toAgent]) dependencies[toAgent] = [];
    if (!dependencies[toAgent].includes(fromAgent)) dependencies[toAgent].push(fromAgent);
  }

  return dependencies;
}

/**
 * Nodes with no incoming connections are roots. In template-loaded graphs
 * they are explicitly marked independent (dependencies: { agent: [] }) so
 * the server's conservative scheduler keeps the saved parallel structure.
 */
export function markIndependentRoots(steps, edges, dependencies = {}) {
  const next = { ...dependencies };
  const indegree = new Map(steps.map((step) => [step.clientId, 0]));

  for (const edge of edges) {
    if (indegree.has(edge.to)) indegree.set(edge.to, indegree.get(edge.to) + 1);
  }

  const agentByClientId = new Map(steps.map((step) => [step.clientId, step.agentId]));
  for (const [clientId, degree] of indegree) {
    if (degree !== 0) continue;
    const agentId = agentByClientId.get(clientId);
    if (agentId && next[agentId] === undefined) {
      next[agentId] = [];
    }
  }

  return next;
}

/**
 * Rebuild graph edges from a template's saved `dependencies` map.
 * References resolve the same way the server does: an exact stepId
 * ("agentId__2" for duplicates) first, then the first step with that
 * agent id. Entries like { agent: [] } (independent roots) produce no
 * edges — their parallel freedom is restored at payload build time.
 * Unresolvable references are skipped gracefully.
 */
export function restoreEdgesFromDependencies(steps, dependencies) {
  if (!dependencies || typeof dependencies !== "object") return [];

  const counts = steps.reduce((map, step) => {
    map.set(step.agentId, (map.get(step.agentId) || 0) + 1);
    return map;
  }, new Map());

  const stepIdByIndex = steps.map((step, index) =>
    (counts.get(step.agentId) || 1) > 1 ? `${step.agentId}__${index + 1}` : step.agentId
  );

  const stepByRef = new Map();
  steps.forEach((step, index) => {
    const stepId = stepIdByIndex[index];
    if (!stepByRef.has(stepId)) stepByRef.set(stepId, step);
    if (!stepByRef.has(step.agentId)) stepByRef.set(step.agentId, step);
  });

  const edges = [];
  for (const [toRef, fromRefs] of Object.entries(dependencies)) {
    const toStep = stepByRef.get(toRef);
    if (!toStep || !Array.isArray(fromRefs)) continue;
    for (const fromRef of fromRefs) {
      const fromStep = stepByRef.get(fromRef);
      if (!fromStep || fromStep.clientId === toStep.clientId) continue;
      edges.push({
        id: `${fromStep.clientId}->${toStep.clientId}`,
        from: fromStep.clientId,
        to: toStep.clientId
      });
    }
  }

  return edges;
}

/**
 * Canonical connections of the built-in default pipeline:
 * Researcher → Writer → Editor (with the Writer ↔ Editor review loop).
 */
export function buildDefaultRweEdges(steps) {
  const byAgent = new Map(steps.map((step) => [step.agentId, step]));
  const researcher = byAgent.get("researcher");
  const writer = byAgent.get("writer");
  const editor = byAgent.get("editor");
  if (!researcher || !writer || !editor) return [];

  return [
    {
      id: `${researcher.clientId}->${writer.clientId}`,
      from: researcher.clientId,
      to: writer.clientId
    },
    {
      id: `${writer.clientId}->${editor.clientId}`,
      from: writer.clientId,
      to: editor.clientId
    }
  ];
}

/**
 * Edges to display when a saved template is loaded.
 *
 * Stored dependencies always win. A default (templateId: "default-rwe")
 * template saved without explicit dependencies — e.g. templates saved
 * before connections were persisted for the default pipeline — falls back
 * to the canonical Researcher → Writer → Editor connections, because that
 * IS the default pipeline's structure.
 */
export function resolveTemplateEdges(template, steps) {
  const pipeline = template?.pipeline || {};
  const edges = restoreEdgesFromDependencies(steps, pipeline.dependencies);
  if (!edges.length && pipeline.templateId === "default-rwe") {
    return buildDefaultRweEdges(steps);
  }
  return edges;
}
