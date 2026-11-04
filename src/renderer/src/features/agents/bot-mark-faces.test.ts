import { activityBotState, activityTextKind } from "@openbot/ui/features/agents/bot-mark/activity-state";
import { joinMarkStage, pokeMark, setMarkEmphasis } from "@openbot/ui/features/agents/bot-mark/mark-stage";
import {
  finishedAt,
  holdSettlePose,
  SETTLE_POSE_MS,
  settlePose,
} from "@openbot/ui/features/agents/bot-mark/settle-pose";
import {
  ACTIVITY_LABEL_QUEUE_MS,
  agentActivityStepKey,
  clipActivityText,
  queueAgentActivityStep,
} from "@openbot/ui/features/conversation/AgentActivity";
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

describe("activityTextKind", () => {
  it.each([
    [null, "thinking"],
    ["Reviewing the latest tool result…", "thinking"],
    ["Searching for current information…", "searching_web"],
    ["Reading the web page…", "reading_web"],
    ["Opening a web page…", "browsing_web"],
    ["Gathering the relevant information…", "reading_file"],
    ["Running commands…", "running_commands"],
    ["Checking the work…", "running_commands"],
    ["Making the requested changes…", "drafting_file"],
    ["Coordinating with another agent…", "messaging_assistant"],
    ["Using an app on this computer…", "on_your_computer"],
    ["Working through the next tool-assisted step…", "working"],
  ])("reads %s as %s", (detail, kind) => {
    expect(activityTextKind(detail)).toBe(kind);
  });

  it("words each kind as the bot app does", () => {
    expect(agentActivityStepKey("searching_web", 0)).toBe("chat.activity.step.searchingWeb");
    expect(agentActivityStepKey("thinking", 0)).toBe("chat.activity.thinking");
    expect(agentActivityStepKey("working", 0.99)).toBe("chat.activity.tinyGears");
  });

  it("cuts the agent's own words at 60 characters", () => {
    expect(clipActivityText("  a   b ")).toBe("a b");
    const clipped = clipActivityText("x".repeat(80));
    expect(clipped).toHaveLength(60);
    expect(clipped.endsWith("…")).toBe(true);
  });
});

describe("queueAgentActivityStep", () => {
  const searching = { key: "kind:searching_web", kind: "searching_web" as const };
  const reading = { key: "kind:reading_file", kind: "reading_file" as const };

  it("merges a step of the same kind and keeps its phrase", () => {
    const shown = { step: searching, shownAt: 0, draw: 0.3 };
    const next = queueAgentActivityStep(shown, { ...searching }, 10);
    expect(next.queued).toBeNull();
    expect(next.shown.draw).toBe(0.3);
    expect(next.shown.shownAt).toBe(0);
  });

  it("queues a new step until the shown one has held for 800 ms", () => {
    const shown = { step: searching, shownAt: 0, draw: 0.3 };
    expect(queueAgentActivityStep(shown, reading, ACTIVITY_LABEL_QUEUE_MS - 1).queued).toBe(reading);
    const swapped = queueAgentActivityStep(shown, reading, ACTIVITY_LABEL_QUEUE_MS, () => 0.7);
    expect(swapped.shown).toEqual({ step: reading, shownAt: ACTIVITY_LABEL_QUEUE_MS, draw: 0.7 });
  });
});

describe("mark stage", () => {
  it("pokes every copy of a face in the bot app's order", () => {
    const first = { poke: vi.fn(), emphasize: vi.fn() };
    const second = { poke: vi.fn(), emphasize: vi.fn() };
    const leaveFirst = joinMarkStage("stage-seed", first);
    const leaveSecond = joinMarkStage("stage-seed", second);
    expect([pokeMark("stage-seed"), pokeMark("stage-seed"), pokeMark("stage-seed"), pokeMark("stage-seed")]).toEqual([
      "spin",
      "bounce",
      "nod",
      "spin",
    ]);
    expect(second.poke).toHaveBeenCalledTimes(4);
    leaveSecond();
    pokeMark("stage-seed");
    expect(first.poke).toHaveBeenCalledTimes(5);
    expect(second.poke).toHaveBeenCalledTimes(4);
    leaveFirst();
  });

  it("holds the hover emphasis until every hover ends", () => {
    const member = { poke: vi.fn(), emphasize: vi.fn() };
    const leave = joinMarkStage("hover-seed", member);
    setMarkEmphasis("hover-seed", true);
    setMarkEmphasis("hover-seed", true);
    setMarkEmphasis("hover-seed", false);
    expect(member.emphasize.mock.calls).toEqual([[true]]);
    setMarkEmphasis("hover-seed", false);
    expect(member.emphasize.mock.calls).toEqual([[true], [false]]);
    leave();
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
