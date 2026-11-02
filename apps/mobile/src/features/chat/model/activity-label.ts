import { type MobileTextKey, mobileHasTranslation, type TranslatedLocale } from "@openbot/i18n/mobile";

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
 * Said in turn while the agent thinks without a step to name. The words live in the mobile catalog
 * (`mobile.chat.thinking.phrase.*`); a language that has not translated them keeps its one line.
 */
export const THINKING_PHRASE_KEYS = [
  "mobile.chat.thinking.phrase.turningOver",
  "mobile.chat.thinking.phrase.connectingDots",
  "mobile.chat.thinking.phrase.sortingDetails",
  "mobile.chat.thinking.phrase.weighingOptions",
  "mobile.chat.thinking.phrase.liningUp",
  "mobile.chat.thinking.phrase.workingOut",
  "mobile.chat.thinking.phrase.sketchingPlan",
  "mobile.chat.thinking.phrase.followingThread",
] as const satisfies readonly MobileTextKey[];

/** The phrases take turns only in a language that says all of them in its own words. */
export function thinkingPhrasesAvailable(locale: TranslatedLocale): boolean {
  return THINKING_PHRASE_KEYS.every((key) => mobileHasTranslation(locale, key));
}

/** The key of the phrase shown `step` turns after the agent's own starting phrase. */
export function thinkingPhraseKey(agentKey: string, step: number): (typeof THINKING_PHRASE_KEYS)[number] {
  const index = (thinkingPhraseStart(agentKey) + Math.max(0, Math.floor(step))) % THINKING_PHRASE_KEYS.length;
  return THINKING_PHRASE_KEYS[index] ?? THINKING_PHRASE_KEYS[0];
}

/** How long each thinking phrase stays before the next one. */
export const THINKING_PHRASE_MS = 3200;

/** Where an agent's phrases start, so two agents thinking side by side do not say the same thing. */
export function thinkingPhraseStart(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return hash % THINKING_PHRASE_KEYS.length;
}
