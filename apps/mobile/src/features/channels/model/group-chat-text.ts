/**
 * HoleA.I: the words of the group chat features ported from the desktop (reactions, typing, people
 * mentions, mute, the "Group chats" list). The desktop keeps them in `@openbot/i18n`; the phone
 * catalogs there are shared with other work, so the phone keeps the English text here until they
 * move into `packages/i18n/src/messages/en/mobile`.
 */
export const groupChatText = {
  typing(names: readonly string[]): string {
    const [first, second, third] = names;
    if (!first) return "";
    if (names.length === 1) return `${first} is typing…`;
    if (names.length <= 3) return `${[first, second, third].filter(Boolean).join(", ")} are typing…`;
    return `${first}, ${second}, ${third} and ${names.length - 3} more are typing…`;
  },
  reactionPill(emoji: string, count: number, names: readonly string[]): string {
    return `${emoji} ${count}: ${names.join(", ")}`;
  },
  reactionMore(count: number): string {
    return `${count} more reactions`;
  },
  removeReaction(emoji: string): string {
    return `Remove your ${emoji} reaction`;
  },
  addSameReaction(emoji: string): string {
    return `React with ${emoji}`;
  },
  mentionPerson(name: string): string {
    return `Mention ${name}`;
  },
  people: "People",
  groupChats: "Group chats",
  mentionBadge: "Mentions you",
  nextMention: "Jump to the next mention of you",
  mute: "Mute notifications",
  mute1h: "For 1 hour",
  mute8h: "For 8 hours",
  mute1d: "For 1 day",
  mute7d: "For 7 days",
  muteAlways: "Until I unmute it",
  unmute: "Unmute",
  muted: "Muted",
  personInChat(person: string, chat: string): string {
    return `${person} in ${chat}`;
  },
  mentionedYou(person: string, chat: string): string {
    return `${person} mentioned you in ${chat}`;
  },
  sentMessage: "Sent a message.",
};
