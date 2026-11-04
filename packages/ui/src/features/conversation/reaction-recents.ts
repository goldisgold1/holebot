import { MESSAGE_REACTIONS, type MessageReaction, MORE_MESSAGE_REACTIONS } from "@openbot/contracts/ipc";
import { createSignal } from "solid-js";

/*
 * HoleA.I (from Vincent's bot app): the quick reaction row holds five emoji, the ones the reader used last
 * first, then the defaults. Everything else stays one tap away under "More emoji".
 */
const QUICK_REACTION_COUNT = 5;
const RECENT_LIMIT = QUICK_REACTION_COUNT;
const STORAGE_KEY = "holeai.chat.recentReactions";
const ALL_REACTIONS: readonly MessageReaction[] = [...MESSAGE_REACTIONS, ...MORE_MESSAGE_REACTIONS];

function readRecents(): MessageReaction[] {
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((emoji): emoji is string => ALL_REACTIONS.includes(emoji)) : [];
  } catch {
    return [];
  }
}

const [recentReactions, setRecentReactions] = createSignal<readonly MessageReaction[]>(readRecents());

/** The five emoji of the quick row: recent ones first, then the defaults in their order. */
export function quickReactions(): MessageReaction[] {
  return [...new Set([...recentReactions(), ...MESSAGE_REACTIONS])].slice(0, QUICK_REACTION_COUNT);
}

/** Every other reaction, in the default order, for the expanded row. */
export function moreReactions(): MessageReaction[] {
  const quick = new Set(quickReactions());
  return ALL_REACTIONS.filter((emoji) => !quick.has(emoji));
}

/** Records a reaction the reader picked, so it leads the quick row next time. */
export function rememberReaction(emoji: MessageReaction | null): void {
  if (!emoji || !ALL_REACTIONS.includes(emoji)) return;
  const next = [emoji, ...recentReactions().filter((recent) => recent !== emoji)].slice(0, RECENT_LIMIT);
  setRecentReactions(next);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be off; the order then lasts for this session only.
  }
}
