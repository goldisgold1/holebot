import { AnalyticsInputError } from "./ipc-agent-analytics";
import { isDynamicRecord, isString } from "./runtime-values";

/** HoleA.I: one plan window of a provider, such as Claude's 5-hour window, from the time it started. */
export interface QuotaShareWindow {
  provider: string;
  /** ISO time the window started. */
  since: string;
}
export interface QuotaShareInput {
  windows: QuotaShareWindow[];
}
/** What one agent spent in a window: its estimated cost, or its tokens when the window has no cost. */
export interface QuotaShareAgent {
  agentId: string;
  amount: number;
}
/**
 * How the usage of one window splits between the agents, largest first. A plan does not say what it
 * counts, so the split is by estimated cost, the closest to it, and by tokens only when nothing in the
 * window was priced.
 */
export interface QuotaShare extends QuotaShareWindow {
  basis: "cost" | "tokens";
  total: number;
  agents: QuotaShareAgent[];
}

const MAX_WINDOWS = 32;

function parseWindow(value: unknown): QuotaShareWindow {
  if (
    !isDynamicRecord(value) ||
    !isString(value.provider) ||
    !value.provider ||
    value.provider.length > 64 ||
    !isString(value.since) ||
    Number.isNaN(Date.parse(value.since))
  )
    throw new AnalyticsInputError("Invalid quota share window.");
  return { provider: value.provider, since: new Date(value.since).toISOString() };
}

export function parseQuotaShareInput(value: unknown): QuotaShareInput {
  if (!isDynamicRecord(value) || !Array.isArray(value.windows) || value.windows.length > MAX_WINDOWS)
    throw new AnalyticsInputError("Invalid quota share request.");
  return { windows: value.windows.map(parseWindow) };
}

function amountOf(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Invalid quota share.");
  return value;
}

export function decodeQuotaShares(value: unknown): QuotaShare[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) throw new Error("Invalid quota shares.");
  return value.map((item: unknown) => {
    if (!isDynamicRecord(item) || !Array.isArray(item.agents) || (item.basis !== "cost" && item.basis !== "tokens"))
      throw new Error("Invalid quota share.");
    return {
      ...parseWindow(item),
      basis: item.basis,
      total: amountOf(item.total),
      agents: item.agents.map((agent: unknown) => {
        if (!isDynamicRecord(agent) || !isString(agent.agentId)) throw new Error("Invalid quota share agent.");
        return { agentId: agent.agentId, amount: amountOf(agent.amount) };
      }),
    };
  });
}
