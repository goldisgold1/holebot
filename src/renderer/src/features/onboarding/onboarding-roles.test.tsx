import { FIRST_AGENT_SUGGESTIONS } from "@openbot/ui/features/agents/FirstAgentSetup";
import { describe, expect, it } from "vitest";
import {
  createStarterAgentDraft,
  ONBOARDING_ROLES,
  orderStarterSuggestions,
  rememberedStarterAgents,
  rememberStarterAgents,
  roleStarters,
} from "./onboarding-roles";

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("onboarding roles", () => {
  it("chooses two to four starter agents that exist for every answer", () => {
    for (const role of ONBOARDING_ROLES) {
      const starters = roleStarters(role.id);
      expect(starters.length).toBeGreaterThanOrEqual(2);
      expect(starters.length).toBeLessThanOrEqual(4);
      expect(starters).toEqual(role.starters);
    }
    expect(roleStarters(null)).toEqual([]);
  });

  it("puts the chosen starters first, in the order chosen", () => {
    const ordered = orderStarterSuggestions(["trip-planner", "inbox-helper"]).map((suggestion) => suggestion.id);
    expect(ordered.slice(0, 2)).toEqual(["trip-planner", "inbox-helper"]);
    expect(ordered).toHaveLength(FIRST_AGENT_SUGGESTIONS.length);
  });

  it("remembers the chosen starters and drops unknown ones", () => {
    const storage = memoryStorage();
    expect(rememberedStarterAgents(storage)).toEqual([]);
    rememberStarterAgents(["writing-partner", "not-a-starter"], storage);
    expect(rememberedStarterAgents(storage)).toEqual(["writing-partner"]);
  });

  it("opens the first agent on the first chosen starter", () => {
    const storage = memoryStorage();
    rememberStarterAgents(["trip-planner"], storage);
    const draft = createStarterAgentDraft(storage);
    const trip = FIRST_AGENT_SUGGESTIONS.find((suggestion) => suggestion.id === "trip-planner");
    expect(draft.suggestionId).toBe("trip-planner");
    expect(draft.avatarHue).toBe(trip?.avatarHue);
    expect(draft.name.length).toBeGreaterThan(0);
    expect(createStarterAgentDraft(memoryStorage()).suggestionId).toBeNull();
  });
});
