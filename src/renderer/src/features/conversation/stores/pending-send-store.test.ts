import { describe, expect, it } from "vitest";
import { type HostDrawnIds, type PendingSend, pendingSendDrawn, pendingSendShownInChat } from "./pending-send-store";

function send(extra: Partial<PendingSend> = {}): PendingSend {
  const base: PendingSend = {
    clientMessageId: "client-1",
    draft: { text: "hi", attachments: [], replyToMessageId: null },
    text: "hi",
    createdAt: "2026-11-04T00:00:00.000Z",
    state: "sending",
    messageId: null,
    error: null,
    retrySafe: true,
    voiceRecordingDraftId: null,
    queued: false,
    starting: false,
    steered: false,
  };
  return { ...base, ...extra };
}

const ids = (input: Partial<Record<keyof HostDrawnIds, string[]>> = {}): HostDrawnIds => ({
  transcriptIds: new Set(input.transcriptIds ?? []),
  panelIds: new Set(input.panelIds ?? []),
  endedIds: new Set(input.endedIds ?? []),
});

describe("a message sent while the agent works", () => {
  it("shows in the chat at once when it steers the running turn", () => {
    expect(pendingSendShownInChat(send({ queued: true, steered: true }), ids(), false)).toBe(true);
  });

  it("stays in the chat while the host shows its delivery as steering, and goes when the transcript has it", () => {
    const sent = send({ queued: true, steered: true, state: "sent", messageId: "d1" });
    expect(pendingSendShownInChat(sent, ids({ panelIds: ["d1"] }), false)).toBe(true);
    expect(pendingSendDrawn(sent, ids({ panelIds: ["d1"] }))).toBe(false);
    expect(pendingSendShownInChat(sent, ids({ transcriptIds: ["d1"] }), false)).toBe(false);
    expect(pendingSendDrawn(sent, ids({ transcriptIds: ["d1"] }))).toBe(true);
  });

  it("goes when its delivery ends with no row of its own", () => {
    const sent = send({ queued: true, steered: true, state: "sent", messageId: "d1" });
    expect(pendingSendDrawn(sent, ids({ endedIds: ["d1"] }))).toBe(true);
  });

  it("still waits in the queue panel when it is queued, not steered", () => {
    const queued = send({ queued: true });
    expect(pendingSendShownInChat(queued, ids(), false)).toBe(false);
    expect(pendingSendShownInChat(queued, ids(), true)).toBe(true);
    const sent = send({ queued: true, state: "sent", messageId: "d2" });
    expect(pendingSendDrawn(sent, ids({ panelIds: ["d2"] }))).toBe(true);
  });
});
