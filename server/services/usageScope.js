import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-step LLM usage scope.
 *
 * Every agent step runs inside its own async scope that carries a dedicated
 * `records` array. llmService pushes each provider response's usage into the
 * CURRENT scope only. Because AsyncLocalStorage isolates async branches,
 * parallel agents (Promise.allSettled levels) never overwrite each other's
 * usage — there is no shared mutable state involved.
 */

const usageStorage = new AsyncLocalStorage();

/**
 * Run `fn` inside an isolated usage scope.
 * Returns { result, records } — records = every LLM call made inside fn.
 * On failure, the partial records are attached to the thrown error
 * (error.usageRecords) so usage from earlier successful calls in the step
 * still survives.
 */
export async function runWithUsageScope(meta, fn) {
  const scope = { meta, records: [] };
  try {
    const result = await usageStorage.run(scope, fn);
    return { result, records: scope.records };
  } catch (error) {
    // eslint-disable-next-line no-param-reassign
    error.usageRecords = scope.records;
    throw error;
  }
}

/**
 * Push one usage record into the active scope.
 * Called only from llmService. When there is no active scope (e.g. the
 * dependency planner or any one-off LLM call outside a pipeline step)
 * this is a no-op by design — platform-level calls are not agent cost.
 */
export function recordUsage(entry) {
  const scope = usageStorage.getStore();
  if (!scope) return;
  scope.records.push({
    ...scope.meta, // runId, stepId, agentId, agentName, iteration
    ...entry,
    recordedAt: new Date().toISOString()
  });
}
