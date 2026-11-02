import { mobileTranslateFor } from "@openbot/i18n/mobile";
import { describe, expect, it } from "vitest";
import {
  activityKind,
  THINKING_PHRASE_KEYS,
  thinkingPhraseKey,
  thinkingPhraseStart,
  thinkingPhrasesAvailable,
} from "./activity-label";
import { agentBubbleFill } from "./bubble-colors";

describe("thinking phrases", () => {
  it("says every phrase in English from the catalog", () => {
    const t = mobileTranslateFor("en");
    const phrases = THINKING_PHRASE_KEYS.map((key) => t(key));
    for (const [index, phrase] of phrases.entries()) {
      expect(phrase).not.toBe(THINKING_PHRASE_KEYS[index]);
      expect(phrase.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(phrases).size).toBe(phrases.length);
  });

  it("takes turns from each agent's own start and wraps around", () => {
    const start = thinkingPhraseStart("agent-a");
    expect(thinkingPhraseKey("agent-a", 0)).toBe(THINKING_PHRASE_KEYS[start]);
    expect(thinkingPhraseKey("agent-a", THINKING_PHRASE_KEYS.length)).toBe(THINKING_PHRASE_KEYS[start]);
    expect(thinkingPhraseKey("agent-a", 1)).toBe(THINKING_PHRASE_KEYS[(start + 1) % THINKING_PHRASE_KEYS.length]);
  });

  it("shows in English, and not in a language that has not translated them", () => {
    expect(thinkingPhrasesAvailable("en")).toBe(true);
    expect(thinkingPhrasesAvailable("de")).toBe(false);
  });

  it("still names the kind of a step", () => {
    expect(activityKind("Reading the web page")).toBe("browser");
    expect(activityKind(null)).toBeNull();
  });
});

describe("agent bubble fill", () => {
  it("washes the agent color over the base at the token strength", () => {
    expect(agentBubbleFill("#ff0000", "#ffffff", 0.1)).toBe("#ffe6e6");
    expect(agentBubbleFill("#ff0000", "#000000", 0)).toBe("#000000");
  });

  it("keeps the neutral bubble for a color it cannot read", () => {
    expect(agentBubbleFill("red", "#ffffff", 0.1)).toBeNull();
    expect(agentBubbleFill("#ff0000", "#ffffff", Number.NaN)).toBeNull();
  });
});
