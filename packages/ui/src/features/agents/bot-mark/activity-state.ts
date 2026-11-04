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
  | "on-its-computer"
  | "messaging"
  | "sending"
  | "waiting"
  | "working";

/**
 * HoleA.I (from Vincent's bot app): the kind of step, which picks the line's wording ("Digging around" for a
 * web search). One kind per entry of the bot app's phrase table.
 */
export type ActivityTextKind =
  | "thinking"
  | "working"
  | "searching_web"
  | "reading_web"
  | "reading_file"
  | "drafting_file"
  | "on_your_computer"
  | "running_commands"
  | "organizing_files"
  | "waiting_on_command"
  | "generating_photo"
  | "generating_video"
  | "coding"
  | "waiting_for_you"
  | "on_its_computer"
  | "messaging_assistant"
  | "messaging"
  | "connecting_app"
  | "browsing_web"
  | "checking_usage";

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
  "on-its-computer": "computing",
  messaging: "sending",
  sending: "sending",
  waiting: "waiting",
  working: "working",
};

/** The bot app's kind → verb table. */
const KIND_VERBS: Readonly<Record<ActivityTextKind, ActivityVerb>> = {
  thinking: "thinking",
  working: "working",
  searching_web: "searching",
  reading_web: "browsing",
  reading_file: "reading",
  drafting_file: "writing",
  on_your_computer: "on-your-computer",
  running_commands: "running-commands",
  organizing_files: "on-your-computer",
  waiting_on_command: "waiting",
  generating_photo: "generating",
  generating_video: "generating",
  coding: "coding",
  waiting_for_you: "waiting",
  on_its_computer: "on-its-computer",
  messaging_assistant: "sending",
  messaging: "messaging",
  connecting_app: "connecting",
  browsing_web: "browsing",
  checking_usage: "working",
};

// First match wins, so the narrower words come first. A "Reviewing…" line is the model reading a tool's
// result and choosing the next step, which the bot app shows as thinking.
const KIND_WORDS: readonly (readonly [RegExp, ActivityTextKind])[] = [
  [/^(a tool step failed|reviewing)\b|\bdecid|\bthink|\bmull|\bponder|\bplan(ning)?\b/i, "thinking"],
  [/\bwaiting for (you|your)\b|\bneeds? your\b/i, "waiting_for_you"],
  [/\bwait(ing)?\b|\bpaused?\b/i, "waiting_on_command"],
  [/\busage\b/i, "checking_usage"],
  [/\b(generat|render|film|mak)\w*\b.*\b(video|clip)s?\b/i, "generating_video"],
  [/\bgenerat|\brender|\bupscal|\bmaking (an? )?(image|photo|picture)/i, "generating_photo"],
  [/\bread\w*\s+(the\s+|a\s+)?web\b|\bfetch/i, "reading_web"],
  [/\bweb page|\bbrows|\bwebsite|\bnavigat/i, "browsing_web"],
  [/\bsearch|\blook(ing)? up\b|\bfind(ing)?\b/i, "searching_web"],
  [/\bkeyboard|\bmouse|\bclick|\bscreen|\bapp on this computer|\bcomputer\b/i, "on_your_computer"],
  [/\banother agent|\bcoordinat|\bhand(ing)? off|\bdelegat/i, "messaging_assistant"],
  [/\bmessag|\bsend|\breply(ing)? to|\bpost(ing)?\b/i, "messaging"],
  [/\bconnect|\bcalling\b|\bmcp\b|\busing the (connector|tool)/i, "connecting_app"],
  [/\bcod(e|ing)\b|\brefactor|\bcompil|\bbuild(ing)?\b/i, "coding"],
  [/\b(mov|copy|copi|renam)\w*\b.*\bfiles?\b|\borganiz/i, "organizing_files"],
  [/\bwrit|\bedit|\bdraft|\bsav(e|ing)\b|\bupdat|\bchang/i, "drafting_file"],
  [/\brun|\btest|\bcommand|\broutine|\bexecut|\binstall|\bchecking the work\b/i, "running_commands"],
  [/\bread|\bview|\bopen|\blook(ing)? at|\bcheck|\bgather|\bskill|\bmemor/i, "reading_file"],
];

/** The kind of step a progress line describes. With no line, the agent is thinking about its next step. */
export function activityTextKind(detail: string | null | undefined): ActivityTextKind {
  if (!detail) return "thinking";
  for (const [words, kind] of KIND_WORDS) if (words.test(detail)) return kind;
  return "working";
}

export function activityKindVerb(kind: ActivityTextKind): ActivityVerb {
  return KIND_VERBS[kind];
}

export function activityVerb(detail: string | null | undefined): ActivityVerb {
  if (!detail) return "working";
  return KIND_VERBS[activityTextKind(detail)];
}

export function activityKindBotState(kind: ActivityTextKind): BotMarkState {
  return VERB_STATES[KIND_VERBS[kind]];
}

export function activityBotState(detail: string | null | undefined): BotMarkState {
  return VERB_STATES[activityVerb(detail)];
}
