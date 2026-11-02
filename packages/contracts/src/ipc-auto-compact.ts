// When OpenBot compacts a chat on its own: at a share of the model's context window, or never.

/**
 * The share of the context window (0.01-1) at which a chat compacts without a request. Null is Off:
 * nothing compacts the chat until the user asks.
 */
export type AutoCompactThreshold = number | null;

/** The share every chat compacted at before the setting existed. */
export const DEFAULT_AUTO_COMPACT_THRESHOLD = 0.8;

/** The quick choices the composer and Settings offer. Settings also takes any whole percent. */
export const AUTO_COMPACT_PRESETS = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95] as const;

export function isAutoCompactThreshold(value: unknown): value is AutoCompactThreshold {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0.01 && value <= 1);
}

export interface AutoCompactPreference {
  threshold: AutoCompactThreshold;
}
