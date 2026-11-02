/**
 * What the activity row shows beside its label: an icon for the kind of step the agent runs, and,
 * while it only thinks, a few friendly phrases that take turns.
 *
 * The host writes each step's progress line in English and the phone translates it, so the kind is
 * read from the English line the host sent, before translation.
 */
export type ActivityKind =
  | "web"
  | "browser"
  | "memory"
  | "skill"
  | "computer"
  | "reading"
  | "checking"
  | "editing"
  | "teammate"
  | "tool"
  | "waiting";

// The first match wins, so the specific kinds come before the generic words.
const KIND_PATTERNS: readonly (readonly [ActivityKind, RegExp])[] = [
  ["browser", /\bweb page\b/iu],
  ["memory", /\bmemor(y|ies)\b/iu],
  ["skill", /\bskill\b/iu],
  ["computer", /\b(screen|app on this computer|in the app)\b/iu],
  ["web", /\b(searching for current|sources)\b/iu],
  ["reading", /\b(gather|reading|information)\b/iu],
  ["checking", /\b(checking|verification)\b/iu],
  ["editing", /\b(changes|editing)\b/iu],
  ["teammate", /\bagent\b/iu],
  ["tool", /\btool\b/iu],
];

/** The kind of step a progress line from the host describes, or null for a line it does not name. */
export function activityKind(detail: string | null | undefined): ActivityKind | null {
  if (!detail) return null;
  for (const [kind, pattern] of KIND_PATTERNS) if (pattern.test(detail)) return kind;
  return null;
}

/**
 * Said in turn while the agent thinks without a step to name. English only: the other languages keep
 * their one translated line.
 */
export const THINKING_PHRASES = [
  "Turning it over",
  "Connecting the dots",
  "Sorting out the details",
  "Weighing a few options",
  "Lining things up",
  "Working it out",
  "Sketching a plan",
  "Following a thread",
] as const;

/** How long each thinking phrase stays before the next one. */
export const THINKING_PHRASE_MS = 3200;

/** Where an agent's phrases start, so two agents thinking side by side do not say the same thing. */
export function thinkingPhraseStart(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return hash % THINKING_PHRASES.length;
}
