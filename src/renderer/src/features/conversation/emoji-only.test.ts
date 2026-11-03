import type { AgentMessage } from "@openbot/ui/data";
import { isEmojiOnlyMessage } from "@openbot/ui/features/conversation/ChatMessageRow";
import { describe, expect, it } from "vitest";

const message = (body: string, extra: Partial<AgentMessage> = {}): AgentMessage => ({
  id: "m",
  author: "you",
  body,
  time: "",
  ...extra,
});

describe("isEmojiOnlyMessage", () => {
  it("is true for one or two emoji alone", () => {
    expect(isEmojiOnlyMessage(message("🔥"))).toBe(true);
    expect(isEmojiOnlyMessage(message(" 👍🏽 ❤️ "))).toBe(true);
    expect(isEmojiOnlyMessage(message("🇺🇸"))).toBe(true);
  });
  it("is false for text, three emoji or a reply", () => {
    expect(isEmojiOnlyMessage(message("ok 👍"))).toBe(false);
    expect(isEmojiOnlyMessage(message("🔥🔥🔥"))).toBe(false);
    expect(isEmojiOnlyMessage(message("🔥", { replyToMessageId: "x" }))).toBe(false);
    expect(isEmojiOnlyMessage(message(""))).toBe(false);
  });
});
