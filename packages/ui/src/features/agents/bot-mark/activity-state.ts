import type { BotMarkState } from "./engine";

/**
 * HoleA.I (Vincent, Nov 3 2026): what the agent is doing, as the bot app reads it: each step of a turn has a
 * verb, and each verb has its own avatar state, so a face searching the web moves unlike one running
 * commands. The bot app reads the tool call; HoleBot only has the progress line ("Reading the file…",
 * "Running the tests", "Generating image"), so the verb is read from its words.
 */
export type ActivityVerb =
  | "thinking"
  | "searching"
  | "browsing"
  | "reading"
  | "connecting"
  | "writing"
  | "coding"
  | "generating"
  | "running-commands"
  | "on-your-computer"
  | "messaging"
  | "waiting"
  | "working";

/** The bot app's verb → state table. */
const VERB_STATES: Readonly<Record<ActivityVerb, BotMarkState>> = {
  thinking: "thinking",
  searching: "searching",
  browsing: "reading",
  reading: "reading",
  connecting: "orbit",
  writing: "writing",
  coding: "coding",
  generating: "progress",
  "running-commands": "running",
  "on-your-computer": "controlling",
  messaging: "sending",
  waiting: "waiting",
  working: "working",
};

// First match wins, so the narrower words come first.
const VERB_WORDS: readonly (readonly [RegExp, ActivityVerb])[] = [
  [/\bwait(ing)?\b|\bpaused?\b/i, "waiting"],
  [/\bthink|\bmull|\bponder|\bplan(ning)?\b/i, "thinking"],
  [/\bgenerat|\brender|\bupscal|\bmaking (an? )?(image|video|photo)/i, "generating"],
  [/\bsearch|\blook(ing)? up\b|\bfind(ing)?\b/i, "searching"],
  [/\bweb page|\bbrows|\bwebsite|\bfetch/i, "browsing"],
  [/\bkeyboard|\bclick|\bscreen|\bapp on this computer|\bcomputer\b/i, "on-your-computer"],
  [/\bmessag|\bsend|\breply(ing)? to|\bhand(ing)? off|\bpost(ing)?\b/i, "messaging"],
  [/\bconnect|\bcalling\b|\bmcp\b|\busing the (skill|connector|tool)/i, "connecting"],
  [/\bcod(e|ing)\b|\brefactor|\bcompil|\bbuild(ing)?\b/i, "coding"],
  [/\bwrit|\bedit|\bdraft|\bsav(e|ing)\b|\bupdat/i, "writing"],
  [/\brun|\btest|\bcommand|\broutine|\bexecut|\binstall/i, "running-commands"],
  [/\bread|\bview|\bopen|\blook(ing)? at|\bcheck/i, "reading"],
];

export function activityVerb(detail: string | null | undefined): ActivityVerb {
  if (!detail) return "working";
  for (const [words, verb] of VERB_WORDS) if (words.test(detail)) return verb;
  return "working";
}

export function activityBotState(detail: string | null | undefined): BotMarkState {
  return VERB_STATES[activityVerb(detail)];
}
