import type { BotMarkPoke } from "@openbot/brand/bot-mark-engine";

/**
 * HoleA.I (from Vincent's bot app): the shared stage of the bot marks on screen. A poke or a hover on one
 * copy of an agent's face reaches every copy of it, as in the bot app, where poking the activity line also
 * spins the agent in the sidebar. Keyed by the avatar seed, which is what draws the face.
 */
export interface MarkStageMember {
  poke(kind: BotMarkPoke): void;
  emphasize(on: boolean): void;
}

/** The bot app's poke order: each click plays the next one. */
export const POKE_ORDER: readonly BotMarkPoke[] = ["spin", "bounce", "nod"];

const members = new Map<string, Set<MarkStageMember>>();
const pokeCounts = new Map<string, number>();
const emphasisHolds = new Map<string, number>();

/** Adds a mounted face to the stage. The returned function takes it off again. */
export function joinMarkStage(seed: string, member: MarkStageMember): () => void {
  let set = members.get(seed);
  if (!set) {
    set = new Set();
    members.set(seed, set);
  }
  set.add(member);
  if ((emphasisHolds.get(seed) ?? 0) > 0) member.emphasize(true);
  return () => {
    const current = members.get(seed);
    if (!current) return;
    current.delete(member);
    if (current.size === 0) members.delete(seed);
  };
}

/** The next poke in the bot app's order for this face. */
export function nextMarkPoke(seed: string): BotMarkPoke {
  const count = pokeCounts.get(seed) ?? 0;
  pokeCounts.set(seed, count + 1);
  return POKE_ORDER[count % POKE_ORDER.length] ?? "spin";
}

/** Pokes every copy of the face with the next poke in order, and returns it. */
export function pokeMark(seed: string): BotMarkPoke {
  const kind = nextMarkPoke(seed);
  for (const member of members.get(seed) ?? []) member.poke(kind);
  return kind;
}

/**
 * Holds or releases the hover emphasis (the surprised face) on every copy of the face. Holds are
 * counted, so a hover on the line and one on the avatar do not end each other.
 */
export function setMarkEmphasis(seed: string, on: boolean): void {
  const before = emphasisHolds.get(seed) ?? 0;
  const after = Math.max(0, before + (on ? 1 : -1));
  if (after === 0) emphasisHolds.delete(seed);
  else emphasisHolds.set(seed, after);
  if (before > 0 === after > 0) return;
  for (const member of members.get(seed) ?? []) member.emphasize(after > 0);
}
