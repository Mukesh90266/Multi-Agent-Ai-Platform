/**
 * Formatting helpers for LLM cost analytics.
 * Shared by the Run page CostPanel and the History cost section.
 */

/** USD — null means "pricing unknown" (never show $0 for unknown). */
export function formatUsd(value) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return "$0.00";
  if (value < 0.000001) return "<$0.000001";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

/** Token counts with thousands separators. */
export function formatTokens(value) {
  return (value ?? 0).toLocaleString();
}
