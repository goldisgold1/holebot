import { Button, Check } from "@openbot/ui";
import { AgentAvatar } from "@openbot/ui/features/agents/AgentAvatar";
import { useText } from "@openbot/ui/text";
import { createUniqueId, For, Show } from "solid-js";
import { ONBOARDING_ROLES, type OnboardingRoleId, orderStarterSuggestions, roleStarters } from "./onboarding-roles";

export interface FirstRunRoleStepProps {
  role: OnboardingRoleId | null;
  /** The starter agents chosen now, in the order they were chosen. */
  starters: readonly string[];
  disabled: boolean;
  onRoleChange: (role: OnboardingRoleId) => void;
  onToggleStarter: (id: string) => void;
}

/**
 * "What will you work on most?" The answer chooses a few starter agents, which show under it as
 * cards the user can add or remove. Both lists arrive one card just after another
 * (`.first-run-card` in `onboarding.css`).
 */
export function FirstRunRoleStep(props: FirstRunRoleStepProps) {
  const { t } = useText();
  const startersTitleId = createUniqueId();
  const startersHintId = createUniqueId();
  // The chosen starters lead, so the cards the answer picked sit first. The order is fixed per answer,
  // so a card the user adds or removes stays where it is.
  const suggestions = () => orderStarterSuggestions(roleStarters(props.role));

  return (
    <section class="onboarding-panel first-run-role" aria-labelledby="onboarding-title">
      <h1 id="onboarding-title">{t("onboarding.role.title")}</h1>
      <p class="onboarding-description">{t("onboarding.role.description")}</p>
      <fieldset class="first-run-role-options" aria-label={t("onboarding.role.label")}>
        <For each={ONBOARDING_ROLES}>
          {(role, index) => (
            <Button
              type="button"
              variant="ghost"
              class="first-run-role-option first-run-card"
              style={{ "--first-run-card-index": String(index()) }}
              aria-pressed={props.role === role.id ? "true" : "false"}
              disabled={props.disabled}
              onClick={() => props.onRoleChange(role.id)}
            >
              {t(role.labelKey)}
            </Button>
          )}
        </For>
      </fieldset>
      <Show when={props.role}>
        <h2 class="first-run-role-starters-title" id={startersTitleId}>
          {t("onboarding.role.startersTitle")}
        </h2>
        <p class="first-run-role-starters-hint" id={startersHintId}>
          {t("onboarding.role.startersHint")}
        </p>
        <fieldset class="first-run-role-starters" aria-labelledby={startersTitleId} aria-describedby={startersHintId}>
          <For each={suggestions()}>
            {(suggestion, index) => (
              <Button
                type="button"
                variant="ghost"
                class="first-run-role-starter first-run-card"
                // The answers arrived first, so the starters follow them.
                style={{ "--first-run-card-index": String(index() + ONBOARDING_ROLES.length) }}
                aria-pressed={props.starters.includes(suggestion.id) ? "true" : "false"}
                aria-label={t("agent.setup.suggestion.label", {
                  name: t(suggestion.nameKey),
                  description: t(suggestion.descriptionKey),
                })}
                disabled={props.disabled}
                onClick={() => props.onToggleStarter(suggestion.id)}
              >
                <AgentAvatar
                  seed={suggestion.avatarSeed}
                  hue={suggestion.avatarHue}
                  motion="idle"
                  cycleOffset={suggestion.animationCycleOffset}
                  animationOffset={suggestion.animationOffset}
                  class="first-run-role-starter-avatar"
                />
                <span class="first-run-role-starter-text">
                  <strong>{t(suggestion.nameKey)}</strong>
                  <span>{t(suggestion.descriptionKey)}</span>
                </span>
                <span class="first-run-role-starter-check" aria-hidden="true">
                  <Show when={props.starters.includes(suggestion.id)}>
                    <Check />
                  </Show>
                </span>
              </Button>
            )}
          </For>
        </fieldset>
      </Show>
    </section>
  );
}
