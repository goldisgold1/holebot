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
 * What the row says while the agent thinks without a step to name: one phrase for the whole turn, drawn from a
 * small pool, as the bot app does ("Thinking it through…"). The words live in the mobile catalog
 * (`mobile.chat.thinking.phrase.*`); a language that has not translated them keeps its one line.
 */
export const THINKING_PHRASE_KEYS = [
  "mobile.chat.thinking.phrase.thinkingThrough",
  "mobile.chat.thinking.phrase.mullingOver",
  "mobile.chat.thinking.phrase.puttingTogether",
] as const satisfies readonly MobileTextKey[];

/** The phrases show only in a language that says all of them in its own words. */
export function thinkingPhrasesAvailable(locale: TranslatedLocale): boolean {
  return THINKING_PHRASE_KEYS.every((key) => mobileHasTranslation(locale, key));
}

/**
 * The phrase of one turn. `draw` is a number from 0 up to 1 that the turn keeps, so the phrase does not change
 * while the turn runs, and the next turn may say another one.
 */
export function thinkingPhraseKey(draw: number): (typeof THINKING_PHRASE_KEYS)[number] {
  const count = THINKING_PHRASE_KEYS.length;
  const index = Math.min(count - 1, Math.max(0, Math.floor((Number.isFinite(draw) ? draw : 0) * count)));
  return THINKING_PHRASE_KEYS[index] ?? THINKING_PHRASE_KEYS[0];
}

/** A stable draw for a turn, from 0 up to 1: the same agent and turn always say the same phrase. */
export function turnPhraseDraw(key: string): number {
  // FNV-1a, as the agent face seeds its rhythm.
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  // FNV-1a barely moves its top bits when only the end of the key changes (turn 1, turn 2...), and the draw reads
  // the top bits, so mix them in (the murmur3 finaliser).
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
