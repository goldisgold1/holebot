// Copyright 2021-2025 Signal Messenger, LLC
// Copyright 2026 HoleA.I
// SPDX-License-Identifier: AGPL-3.0-only
//
// Group chat reactions, after Signal Desktop:
// - ts/reactions/util.std.ts and ts/messageModifiers/Reactions.preload.ts: one reaction per person
//   on a message; a new one replaces theirs, and none removes it.
// - ts/util/groupAndOrderReactions.std.ts: reactions grouped by emoji, the largest group first, then
//   the newest; inside a group, your own first, then the newest.
// - ts/components/conversation/Message.dom.tsx: the bubble shows the first three groups, and a
//   "+N" for the rest.

import { isMessageReaction } from "../ipc-conversation-messages";
import { isDynamicRecord, isString } from "../runtime-values";

/** One person's reaction to a group chat message. */
export interface ChannelReaction {
  emoji: string;
  memberId: string;
  name: string;
  /** When it was set, in milliseconds. */
  at: number;
}

/** The reactions with one emoji, in the order the bubble shows them. */
export interface ChannelReactionGroup {
  emoji: string;
  count: number;
  /** Whether the viewer is one of them. */
  mine: boolean;
  /** Who reacted, the viewer first. */
  names: string[];
}

/** The groups the bubble draws itself; the rest fold into "+N". */
export const CHANNEL_REACTION_GROUPS_SHOWN = 3;

export function isChannelReaction(value: unknown): value is ChannelReaction {
  return (
    isDynamicRecord(value) &&
    isMessageReaction(value.emoji) &&
    isString(value.memberId) &&
    value.memberId.length > 0 &&
    isString(value.name) &&
    typeof value.at === "number" &&
    Number.isFinite(value.at)
  );
}

/** Sets or removes one person's reaction: a person has at most one on a message. */
export function applyChannelReaction(
  reactions: readonly ChannelReaction[] | undefined,
  member: { id: string; name: string },
  emoji: string | null,
  at: number,
): ChannelReaction[] {
  const others = (reactions ?? []).filter((reaction) => reaction.memberId !== member.id);
  return emoji === null ? others : [...others, { emoji, memberId: member.id, name: member.name, at }];
}

/** Groups by emoji, largest and then newest first; the viewer leads the names of each group. */
export function groupChannelReactions(
  reactions: readonly ChannelReaction[] | undefined,
  viewerId: string | null,
): ChannelReactionGroup[] {
  const byEmoji = new Map<string, ChannelReaction[]>();
  for (const reaction of reactions ?? [])
    byEmoji.set(reaction.emoji, [...(byEmoji.get(reaction.emoji) ?? []), reaction]);
  const groups = [...byEmoji.values()].map((group) =>
    [...group].sort((left, right) => {
      const leftMine = left.memberId === viewerId ? 1 : 0;
      const rightMine = right.memberId === viewerId ? 1 : 0;
      return rightMine - leftMine || right.at - left.at;
    }),
  );
  groups.sort((left, right) => right.length - left.length || (right[0]?.at ?? 0) - (left[0]?.at ?? 0));
  return groups.map((group) => ({
    emoji: group[0]?.emoji ?? "",
    count: group.length,
    mine: group.some((reaction) => reaction.memberId === viewerId),
    names: group.map((reaction) => reaction.name),
  }));
}
