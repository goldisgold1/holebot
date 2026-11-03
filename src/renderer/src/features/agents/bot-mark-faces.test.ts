import { activityBotState } from "@openbot/ui/features/agents/bot-mark/activity-state";
import {
  finishedAt,
  holdSettlePose,
  SETTLE_POSE_MS,
  settlePose,
} from "@openbot/ui/features/agents/bot-mark/settle-pose";
import { describe, expect, it, vi } from "vitest";

describe("activityBotState", () => {
  it.each([
    ["Reading the file…", "reading"],
    ["Searching the web", "searching"],
    ["Running the tests", "running"],
    ["Generating image", "progress"],
    ["Using the keyboard", "controlling"],
    ["Messaging Producer", "sending"],
    ["Editing notes.md", "writing"],
    [null, "working"],
  ])("reads %s as %s", (detail, state) => {
    expect(activityBotState(detail)).toBe(state);
  });
});

describe("holdSettlePose", () => {
  it("shows the outcome for a moment, then rests", () => {
    vi.useFakeTimers();
    holdSettlePose("seed-a", "finished");
    expect(settlePose("seed-a")).toBe("finished");
    expect(finishedAt("seed-a")).toBeTypeOf("number");
    vi.advanceTimersByTime(SETTLE_POSE_MS);
    expect(settlePose("seed-a")).toBeUndefined();
    holdSettlePose("seed-a", "failed");
    holdSettlePose("seed-a", null);
    expect(settlePose("seed-a")).toBeUndefined();
    vi.useRealTimers();
  });
});
