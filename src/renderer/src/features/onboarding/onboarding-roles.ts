import type { AppTextKey } from "@openbot/i18n";
import {
  createFirstAgentDraft,
  FIRST_AGENT_SUGGESTIONS,
  type FirstAgentDraft,
  type FirstAgentSuggestion,
} from "@openbot/ui/features/agents/FirstAgentSetup";
import { currentText } from "@openbot/ui/text";

/** What the user works on most, from the first-run question. */
export type OnboardingRoleId = "work" | "writing" | "study" | "home" | "travel" | "mix";

export interface OnboardingRole {
  id: OnboardingRoleId;
  labelKey: AppTextKey;
  /** The starter agents this answer chooses, 2 to 4 of them, most useful first. */
  starters: readonly string[];
}

/**
 * The answers to "What will you work on most?". Each one chooses a few of the starter agents that
 * the first-agent form offers ({@link FIRST_AGENT_SUGGESTIONS}); the user can add or remove any.
 */
export const ONBOARDING_ROLES: readonly OnboardingRole[] = [
  {
    id: "work",
    labelKey: "onboarding.role.option.work",
    starters: ["inbox-helper", "personal-organizer", "writing-partner"],
  },
  {
    id: "writing",
    labelKey: "onboarding.role.option.writing",
    starters: ["writing-partner", "learning-coach", "inbox-helper"],
  },
  {
    id: "study",
    labelKey: "onboarding.role.option.study",
    starters: ["learning-coach", "writing-partner", "personal-organizer"],
  },
  {
    id: "home",
    labelKey: "onboarding.role.option.home",
    starters: ["personal-organizer", "shopping-scout", "trip-planner"],
  },
  { id: "travel", labelKey: "onboarding.role.option.travel", starters: ["trip-planner", "shopping-scout"] },
  {
    id: "mix",
    labelKey: "onboarding.role.option.mix",
    starters: ["inbox-helper", "personal-organizer", "writing-partner", "trip-planner"],
  },
];

/** The starter agents a role chooses, limited to the ones that exist. */
export function roleStarters(role: OnboardingRoleId | null): string[] {
  const starters = ONBOARDING_ROLES.find((candidate) => candidate.id === role)?.starters ?? [];
  return starters.filter((id) => FIRST_AGENT_SUGGESTIONS.some((suggestion) => suggestion.id === id));
}

/** The starter agents with the chosen ones first, in the order they were chosen. The rest keep their order. */
export function orderStarterSuggestions(
  chosen: readonly string[],
  suggestions: readonly FirstAgentSuggestion[] = FIRST_AGENT_SUGGESTIONS,
): FirstAgentSuggestion[] {
  const rank = (suggestion: FirstAgentSuggestion) => {
    const index = chosen.indexOf(suggestion.id);
    return index === -1 ? chosen.length : index;
  };
  return [...suggestions].sort((left, right) => rank(left) - rank(right));
}

export const STARTER_AGENTS_STORAGE_KEY = "openbot:onboarding-starters:v1";

type StarterStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Keeps the starter agents chosen in first run on this computer, so the first-agent form opens on
 * them. Storage can be blocked, so a failure keeps nothing and first run goes on.
 */
export function rememberStarterAgents(ids: readonly string[], storage?: StarterStorage): void {
  try {
    (storage ?? window.localStorage).setItem(STARTER_AGENTS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Without storage, the form opens on its usual default.
  }
}

/** The starter agents chosen in first run, or none. Unknown ids are dropped. */
export function rememberedStarterAgents(storage?: StarterStorage): string[] {
  try {
    const value = (storage ?? window.localStorage).getItem(STARTER_AGENTS_STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is string =>
        typeof id === "string" && FIRST_AGENT_SUGGESTIONS.some((suggestion) => suggestion.id === id),
    );
  } catch {
    return [];
  }
}

/**
 * A new first-agent draft, filled in from the first starter agent chosen in first run, as if the
 * user had picked that suggestion in the form. With none chosen it is the usual new draft.
 */
export function createStarterAgentDraft(storage?: StarterStorage): FirstAgentDraft {
  const draft = createFirstAgentDraft();
  const [first] = rememberedStarterAgents(storage);
  const suggestion = FIRST_AGENT_SUGGESTIONS.find((candidate) => candidate.id === first);
  if (!suggestion) return draft;
  const { t } = currentText();
  return {
    ...draft,
    name: t(suggestion.nameKey),
    purpose: t(suggestion.purposeKey),
    avatarSeed: suggestion.avatarSeed,
    avatarHue: suggestion.avatarHue,
    suggestionId: suggestion.id,
  };
}
