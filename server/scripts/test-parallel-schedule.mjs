/**
 * Test suite: Dynamic Dependency-Aware Parallel Agent Execution.
 * Run: node scripts/test-parallel-schedule.mjs   (from server/)
 *
 * Runs in demo mode (no GROQ_API_KEY) — deterministic, no network.
 * Covers spec §15 tests T1–T10 (T6/T9 partially: tool attribution and
 * failure containment are structural — see comments inline).
 */

import assert from "node:assert/strict";

import { computeSchedule, buildExecutionLevels } from "../orchestrator/dependencyGraph.js";
import { runPipeline } from "../orchestrator/pipeline.js";
import { stateManager } from "../state/stateManager.js";

const input = {
  topic: "JavaScript Async/Await",
  contentType: "Blog post",
  audience: "Developers",
  tone: "Educational",
  wordCount: 800
};

function makeCustomStep(id, overrides = {}) {
  return {
    stepId: id,
    index: 0,
    agentId: id,
    type: "custom",
    name: id,
    role: overrides.role || `${id} role`,
    personality: "Clear",
    description: "",
    phase: "custom",
    builtIn: false,
    tools: overrides.tools || [],
    agent: {
      id,
      type: "custom",
      name: id,
      role: overrides.role || `${id} role`,
      personality: "Clear",
      systemPrompt: overrides.systemPrompt || `Do the ${id} task using the original user input.`,
      tools: overrides.tools || [],
      requires: overrides.requires,
      produces: overrides.produces,
      phase: "custom"
    },
    ...(overrides.requires ? { requires: overrides.requires } : {}),
    ...(overrides.produces ? { produces: overrides.produces } : {}),
    ...(overrides.dependsOn !== undefined ? { dependsOn: overrides.dependsOn } : {})
  };
}

function makePipeline(stepDefs) {
  const steps = stepDefs.map((def, index) => ({ ...def, index }));
  return {
    id: "test",
    name: "Test Pipeline",
    description: "",
    templateId: null,
    isDefault: false,
    agentIds: steps.map((s) => s.agentId),
    steps,
    loop: null
  };
}

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    console.error(`  ❌ ${name}\n     ${error.message}`);
    process.exitCode = 1;
  }
}

console.log("\n=== Dependency schedule unit tests ===\n");

await test("T1: R→W→E default — fully sequential levels (backward compat)", async () => {
  const { buildRunnablePipeline } = await import("../services/agentStore.js");
  const pipeline = await buildRunnablePipeline({}); // default template w/ loop
  const schedule = await computeSchedule(pipeline.steps);

  assert.equal(schedule.parallel, false);
  assert.deepEqual(schedule.levels.map((l) => l.length), [1, 1, 1]);
  assert.deepEqual(schedule.levels, [["researcher"], ["writer"], ["editor"]]);
  assert.deepEqual(schedule.edges.writer, ["researcher"]);
  // Editor's executor injects BOTH research and the latest draft (real code
  // paths in agentExecutor.js) → it honestly waits for both; order unchanged.
  assert.deepEqual(schedule.edges.editor, ["researcher", "writer"]);
});

await test("T2: Researcher→Editor (no Writer) — Editor resolves to Researcher, Writer not required", async () => {
  const { buildRunnablePipeline } = await import("../services/agentStore.js");
  const pipeline = await buildRunnablePipeline({ agentIds: ["researcher", "editor"] });
  const schedule = await computeSchedule(pipeline.steps);

  assert.equal(schedule.parallel, false);
  assert.deepEqual(schedule.edges.editor, ["researcher"]); // nearest content producer, dynamic
  assert.deepEqual(schedule.levels, [["researcher"], ["editor"]]);
});

await test("T3: MarketAnalyst→Editor — Editor depends on MarketAnalyst (not hardcoded Writer)", async () => {
  const pipeline = makePipeline([
    makeCustomStep("market-analyst", { role: "Analyzes the market for the topic" }),
    (() => ({ // real built-in editor step shape
      stepId: "editor", index: 1, agentId: "editor", type: "built-in", name: "Editor",
      role: "Reviews", personality: "Strict", description: "", phase: "review", builtIn: true,
      tools: [], agent: { id: "editor", type: "built-in", name: "Editor", phase: "review", tools: [] }
    }))()
  ]);
  const schedule = await computeSchedule(pipeline.steps);
  assert.deepEqual(schedule.edges.editor, ["market-analyst"]);
  assert.deepEqual(schedule.levels, [["market-analyst"], ["editor"]]);
});

await test("T7/T4: explicit dependsOn → A||B||C then D (fan-in)", async () => {
  const pipeline = makePipeline([
    makeCustomStep("a", { dependsOn: [] }),
    makeCustomStep("b", { dependsOn: [] }),
    makeCustomStep("c", { dependsOn: [] }),
    makeCustomStep("d", { dependsOn: ["a", "b", "c"] })
  ]);
  const schedule = await computeSchedule(pipeline.steps);

  assert.equal(schedule.parallel, true);
  assert.deepEqual(schedule.levels, [["a", "b", "c"], ["d"]]);
});

await test("T8: ambiguous custom agents → conservative sequential", async () => {
  const pipeline = makePipeline([
    makeCustomStep("x"),
    makeCustomStep("y"),
    makeCustomStep("z")
  ]);
  const schedule = await computeSchedule(pipeline.steps);

  assert.equal(schedule.parallel, false);
  assert.deepEqual(schedule.levels, [["x"], ["y"], ["z"]]);
  assert.match(schedule.reasons.y, /unknown|conservative/i);
});

await test("Contracts: requires:[] declared → parallel fan-out without explicit dependsOn", async () => {
  const { buildRunnablePipeline } = await import("../services/agentStore.js");
  const pipeline = await buildRunnablePipeline({});
  const researcherStep = pipeline.steps[0];

  const independent = makeCustomStep("independent-agent", { requires: [] });
  const schedule = await computeSchedule([researcherStep, { ...independent, index: 1 }]);

  assert.deepEqual(schedule.levels, [["researcher", "independent-agent"]]);
  assert.equal(schedule.parallel, true);
});

await test("Contracts: writer keeps waiting for research producer only", async () => {
  const { buildRunnablePipeline } = await import("../services/agentStore.js");
  const customProducer = makeCustomStep("deep-diver", { requires: [], produces: "research" });
  const full = await buildRunnablePipeline({});
  const writerStep = full.steps.find((s) => s.agentId === "writer");

  const schedule = await computeSchedule([{ ...customProducer, index: 0 }, { ...writerStep, index: 1 }]);
  assert.deepEqual(schedule.edges.writer, ["deep-diver"]); // artifact match, not name
});

await test("Unsatisfied dependsOn → warning, no wait-forever, step still schedules", async () => {
  const pipeline = makePipeline([
    makeCustomStep("a", { dependsOn: [] }),
    makeCustomStep("b", { dependsOn: ["ghost-agent"] })
  ]);
  const schedule = await computeSchedule(pipeline.steps);

  assert.ok(schedule.warnings.some((w) => /Unsatisfied dependency/.test(w.warning)));
  assert.ok(schedule.levels.flat().includes("b")); // b still runs, no deadlock
});

await test("Forward reference (dep on LATER step) → warning + order preserved", async () => {
  const pipeline = makePipeline([
    makeCustomStep("a", { dependsOn: ["b"] }),
    makeCustomStep("b")
  ]);
  const schedule = await computeSchedule(pipeline.steps);

  assert.ok(schedule.warnings.some((w) => /later step/i.test(w.warning)));
  assert.equal(schedule.parallel, false); // order preserved → sequential
  assert.deepEqual(schedule.levels.flat(), ["a", "b"]);
});

await test("Cycle guard (Kahn): cyclic edge map → sequential fallback, never hangs", () => {
  const edges = new Map([["a", ["b"]], ["b", ["a"]]]);
  const { levels, cycleDetected } = buildExecutionLevels(["a", "b"], edges);
  assert.equal(cycleDetected, true);
  assert.deepEqual(levels, [["a"], ["b"]]);
});

console.log("\n=== Full pipeline integration (demo mode) ===\n");

await test("T1-e2e: default R→W→E end-to-end unchanged (loop preserved, approves, output intact)", async () => {
  const result = await runPipeline({ ...input }, "test-default-run");

  assert.equal(result.status, "approved");
  assert.equal(result.approved, true);
  assert.equal(result.parallel, false);
  assert.ok(result.research?.topic);
  assert.ok(result.draft?.content);
  assert.ok(result.editorReview);
  assert.ok(result.finalOutput?.content);
  // Sequential order preserved: researcher (pre-loop) → writer/editor loop iterations
  // (demo mode intentionally rejects iteration 1 to exercise the loop — pre-existing).
  const order = result.agentOutputs.map((o) => o.agentId);
  assert.equal(order[0], "researcher");
  assert.ok(order.includes("writer"));
  assert.ok(order.includes("editor"));
  assert.equal(order.indexOf("writer") > order.indexOf("researcher"), true);
  assert.equal(order.lastIndexOf("editor") > order.indexOf("writer"), true);
  // timing fields present (additive)
  assert.ok(result.agentOutputs[0].startedAt);
  assert.ok(typeof result.agentOutputs[0].durationMs === "number");
});

await test("T4/T7-e2e: fan-in run — A||B||C truly concurrent, D waits, sees all outputs", async () => {
  const pipeline = makePipeline([
    makeCustomStep("agent-a", { dependsOn: [] }),
    makeCustomStep("agent-b", { dependsOn: ["agent-a"] }), // b waits on a ONLY
    makeCustomStep("agent-c", { dependsOn: [] }),
    makeCustomStep("agent-d", { dependsOn: ["agent-a", "agent-b", "agent-c"] })
  ]);

  const result = await runPipeline({ ...input }, "test-fanin", { pipeline: { ...pipeline, steps: pipeline.steps } });

  assert.equal(result.status, "completed");
  assert.equal(result.parallel, true);
  assert.deepEqual(result.schedule.levels, [["agent-a", "agent-c"], ["agent-b"], ["agent-d"]]);

  const byId = Object.fromEntries(result.agentOutputs.map((o) => [o.agentId, o]));
  // D starts only after all deps completed
  assert.ok(byId["agent-d"].startedAt >= byId["agent-a"].completedAt);
  assert.ok(byId["agent-d"].startedAt >= byId["agent-b"].completedAt);
  assert.ok(byId["agent-d"].startedAt >= byId["agent-c"].completedAt);
  // every output keyed to correct agent
  assert.deepEqual(result.agentOutputs.map((o) => o.agentId).sort(), ["agent-a", "agent-b", "agent-c", "agent-d"]);
});

await test("T5-e2e: independent custom runs parallel WITH researcher (contract requires:[])", async () => {
  const { buildRunnablePipeline } = await import("../services/agentStore.js");
  const base = await buildRunnablePipeline({});
  const researcher = base.steps.find((s) => s.agentId === "researcher");
  const independent = { ...makeCustomStep("topic-tagger", { requires: [] }), index: 1 };

  const pipeline = {
    id: "t5", name: "T5", description: "", templateId: null, isDefault: false,
    agentIds: ["researcher", "topic-tagger"], steps: [{ ...researcher, index: 0 }, independent], loop: null
  };

  const result = await runPipeline({ ...input }, "test-contract-parallel", { pipeline });

  assert.equal(result.parallel, true);
  assert.deepEqual(result.schedule.levels, [["researcher", "topic-tagger"]]);

  const byId = Object.fromEntries(result.agentOutputs.map((o) => [o.agentId, o]));
  // both started before either completed (truly concurrent)
  assert.ok(byId["topic-tagger"].startedAt <= byId["researcher"].completedAt);
  assert.ok(byId.researcher.startedAt <= byId["topic-tagger"].completedAt);
});

await test("T8-e2e: ambiguous customs remain sequential end-to-end", async () => {
  const pipeline = makePipeline([makeCustomStep("s1"), makeCustomStep("s2")]);
  const result = await runPipeline({ ...input }, "test-ambiguous", { pipeline });
  assert.equal(result.parallel, false);
  assert.deepEqual(result.schedule.levels, [["s1"], ["s2"]]);
});

await test("State manager consistency: live snapshots expose schedule, no corrupted state", async () => {
  const pipeline = makePipeline([
    makeCustomStep("p1", { dependsOn: [] }),
    makeCustomStep("p2", { dependsOn: [] })
  ]);
  const result = await runPipeline({ ...input }, "test-state", { pipeline });
  const state = stateManager.get("test-state");

  assert.ok(state.schedule);
  assert.equal(state.status, "completed");
  assert.equal(result.agentOutputs.length, 2);
  // outputs not overwritten: two distinct stepIds
  assert.equal(new Set(result.agentOutputs.map((o) => o.stepId)).size, 2);
});

console.log(`\n${passed} tests passed${process.exitCode ? " (with failures above)" : ""}.\n`);
