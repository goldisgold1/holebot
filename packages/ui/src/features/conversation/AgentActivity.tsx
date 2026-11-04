import type { AppTextKey } from "@openbot/i18n";
import type { JSX } from "@solidjs/web";
import { createEffect, createMemo, createSignal, createUniqueId, onCleanup, Show } from "solid-js";
import { Button } from "../../button";
import type { AgentProfile } from "../../data";
import { ChevronDown } from "../../icons";
import { useText } from "../../text";
import { AgentAvatar } from "../agents/AgentAvatar";
import { activityBotState } from "../agents/bot-mark/activity-state";
import { ThinkingMark } from "../agents/ThinkingMark";
import { type AgentStep, AgentStepList } from "./AgentSteps";

/**
 * The English source of each label. A label is an identifier here: render it with
 * `t(agentActivityLabelKey(label))`.
 */
export const AGENT_ACTIVITY_LABELS = [
  "Working on it…",
  "Thinking it through…",
  "Mulling it over…",
  "Putting it together…",
  "Getting it done…",
  "Making progress…",
  "Handling it…",
  "Chipping away…",
  "Consulting the inner council…",
  "Cooking up something useful…",
] as const;

// HoleA.I (from Vincent's bot app): the plain working phrases only; the last two are kept for old callers.
const FACTUAL_ACTIVITY_LABELS = AGENT_ACTIVITY_LABELS.slice(0, 8);

export type AgentActivityLabel = (typeof AGENT_ACTIVITY_LABELS)[number];

const AGENT_ACTIVITY_LABEL_KEYS = {
  "Working on it…": "chat.activity.workingOnIt",
  "Thinking it through…": "chat.activity.thinking",
  "Mulling it over…": "chat.activity.connectingDots",
  "Putting it together…": "chat.activity.checkingDetails",
  "Getting it done…": "chat.activity.puttingTogether",
  "Making progress…": "chat.activity.makingSense",
  "Handling it…": "chat.activity.oneStep",
  "Chipping away…": "chat.activity.tinyGears",
  "Consulting the inner council…": "chat.activity.innerCouncil",
  "Cooking up something useful…": "chat.activity.cookingUp",
} as const satisfies Record<AgentActivityLabel, AppTextKey>;

/** The catalog key that renders `label` in the interface language. */
export function agentActivityLabelKey(label: AgentActivityLabel): AppTextKey {
  return AGENT_ACTIVITY_LABEL_KEYS[label];
}

/**
 * The line the indicator shows while an agent works.
 *
 * Only the wording is drawn. The avatar used to draw an animation from here too, which is how a
 * turn could turn the agent into a comet and the next one into a burst of particles: a silhouette
 * is identity, so it is not something to shuffle. The face now follows the `working` mood like
 * every other avatar in the app.
 */
export function nextAgentActivityLabel(
  previous?: AgentActivityLabel,
  random: () => number = Math.random,
): AgentActivityLabel {
  return pickActivityLabel(previous, random);
}

/**
 * A step shorter than this shows no time. Most steps end sooner, and a counter that appears and
 * goes away at once is only noise.
 */
const ELAPSED_VISIBLE_AFTER_MS = 60_000;

/**
 * HoleA.I (from Vincent's bot app): a line stays up at least this long, and the next one fades in, so a run of
 * quick steps reads as steps instead of a flicker.
 */
const LABEL_MIN_HOLD_MS = 1_200;
const LABEL_ROLL_MS = 300;
const LABEL_ROLL_EASE = "cubic-bezier(0.165, 0.84, 0.44, 1)";

function createHeldLabel(label: () => string): {
  shown: () => string;
  ref: (element: HTMLElement) => void;
} {
  const [shown, setShown] = createSignal(label());
  let element: HTMLElement | undefined;
  let since = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const swap = (next: string) => {
    since = Date.now();
    setShown(next);
    if (element && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      // The new line rolls up from below by its own height, as the old one leaves.
      const rise = element.offsetHeight + 6;
      element.animate(
        [
          { opacity: 0, transform: `translateY(${rise}px)` },
          { opacity: 1, transform: "none" },
        ],
        { duration: LABEL_ROLL_MS, easing: LABEL_ROLL_EASE },
      );
    }
  };
  createEffect(label, (next) => {
    clearTimeout(timer);
    if (next === shown()) return;
    const wait = LABEL_MIN_HOLD_MS - (Date.now() - since);
    if (wait <= 0) swap(next);
    else timer = setTimeout(() => swap(next), wait);
  });
  onCleanup(() => clearTimeout(timer));
  return {
    shown,
    ref: (next) => {
      element = next;
    },
  };
}

export function AgentActivityIndicator(props: {
  agent: AgentProfile | undefined;
  detail?: string | null;
  label: AgentActivityLabel;
  phase?: "active" | "exiting";
  /**
   * When the current line started, from `Date.now()`. A long step then shows how long it has run,
   * so a working agent reads differently from a stalled one.
   */
  since?: number;
  /** The steps of the running turn. With steps, a chevron opens them under the line. */
  steps?: readonly AgentStep[] | undefined;
  /** The "Show agent steps" setting: the steps are open when the turn starts. */
  stepsOpenByDefault?: boolean | undefined;
  /**
   * The provider name, when nothing has come from the provider for a while or the computer has no
   * network. The line then says that it waits, with no shine, because a silent provider is not visible work.
   */
  waitingFor?: string | null | undefined;
}) {
  const { t, format } = useText();
  const label = () => {
    const provider = props.waitingFor;
    if (provider) return t("chat.activity.waitingFor", { provider });
    // HoleA.I (from Vincent's bot app): the step the agent is on, else this turn's phrase, such as "Thinking it through…".
    return props.detail ?? t(agentActivityLabelKey(props.label));
  };
  const statusLabel = () => {
    const name = props.agent?.name ?? t("chat.activity.agentFallback");
    const provider = props.waitingFor;
    return provider
      ? t("chat.activity.waitingStatus", { name, provider })
      : t("chat.activity.status", { name, label: label() });
  };
  const waiting = () => (props.waitingFor ? "true" : undefined);
  const held = createHeldLabel(label);
  // The face moves for the step the agent is on: searching, reading, running commands, generating...
  const faceState = () => (props.waitingFor ? "waiting" : activityBotState(props.detail));
  const elapsedMs = createElapsed(() => (props.phase === "exiting" ? undefined : props.since));
  // HoleA.I (from Vincent's bot app): a calm clock that appears after a minute and counts whole minutes.
  const elapsed = createMemo(() => {
    const ms = elapsedMs();
    if (ms < ELAPSED_VISIBLE_AFTER_MS) return null;
    const minutes = Math.floor(ms / 60_000);
    const hours = Math.floor(minutes / 60);
    const unit = (value: number, kind: "minute" | "hour") =>
      format.number(value, { style: "unit", unit: kind, unitDisplay: "narrow" });
    if (hours === 0) return unit(minutes, "minute");
    return minutes % 60 === 0 ? unit(hours, "hour") : `${unit(hours, "hour")} ${unit(minutes % 60, "minute")}`;
  });
  return (
    <div class="agent-activity-entry" data-state={props.phase ?? "active"} data-waiting={waiting()}>
      <span class="sr-only" role="status" aria-live="polite" aria-atomic="true" aria-label={statusLabel()} />
      <AgentActivityBody
        steps={props.steps}
        stepsOpenByDefault={props.stepsOpenByDefault}
        live={props.phase !== "exiting"}
      >
        <Show
          when={props.agent}
          fallback={<ThinkingMark class="agent-activity-mark" still={Boolean(props.waitingFor)} />}
        >
          {(agent) => <AgentAvatar agent={agent()} mood="working" state={faceState()} class="agent-activity-mark" />}
        </Show>
        <span class="agent-activity-label" ref={held.ref}>
          {held.shown()}
        </span>
        <Show when={elapsed()}>{(time) => <span class="agent-activity-elapsed">{time()}</span>}</Show>
      </AgentActivityBody>
    </div>
  );
}

/**
 * The activity line, with a chevron that opens the steps of the running work under it. The agent
 * chat and the channel give the faces and the label as children, so both have one steps toggle.
 */
export function AgentActivityBody(props: {
  /** A class for the line besides `agent-activity-content`. */
  class?: string;
  steps?: readonly AgentStep[] | undefined;
  /** The "Show agent steps" setting: the steps are open when the work starts. */
  stepsOpenByDefault?: boolean | undefined;
  live: boolean;
  children: JSX.Element;
}) {
  const { t } = useText();
  const stepsId = createUniqueId();
  const [stepsChoice, setStepsChoice] = createSignal<boolean>();
  const hasSteps = () => (props.steps?.length ?? 0) > 0;
  const stepsOpen = () => hasSteps() && (stepsChoice() ?? props.stepsOpenByDefault === true);
  // A new turn starts with no steps, and with the setting again.
  createEffect(hasSteps, (has) => {
    if (!has) setStepsChoice(undefined);
  });
  return (
    <div class="agent-activity-body">
      <section
        class={props.class ? `agent-activity-content ${props.class}` : "agent-activity-content"}
        aria-label={t("chat.activity.current")}
      >
        {props.children}
        <Show when={hasSteps()}>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            class="agent-steps-toggle"
            aria-expanded={stepsOpen() ? "true" : "false"}
            aria-controls={stepsOpen() ? stepsId : undefined}
            aria-label={stepsOpen() ? t("chat.steps.hide") : t("chat.steps.show")}
            onClick={() => setStepsChoice(!stepsOpen())}
          >
            <ChevronDown class="agent-steps-chevron" aria-hidden="true" />
          </Button>
        </Show>
      </section>
      <Show when={stepsOpen()}>
        <div class="agent-activity-steps">
          <AgentStepList id={stepsId} steps={props.steps ?? []} live={props.live} />
        </div>
      </Show>
    </div>
  );
}

/** Milliseconds since `since`, ticking each second while there is one, and 0 when there is not. */
function createElapsed(since: () => number | undefined) {
  const [now, setNow] = createSignal(Date.now());
  createEffect(
    () => since(),
    (from) => {
      if (from === undefined) return;
      setNow(Date.now());
      const clock = window.setInterval(() => setNow(Date.now()), 15_000);
      return () => window.clearInterval(clock);
    },
  );
  return createMemo(() => {
    const from = since();
    return from === undefined ? 0 : Math.max(0, now() - from);
  });
}

function pickDifferent<T>(items: readonly T[], previous: T | undefined, random: () => number): T {
  const choices = previous === undefined ? items : items.filter((item) => item !== previous);
  const value = random();
  const normalized = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999_999) : 0;
  const selected = choices[Math.floor(normalized * choices.length)];
  if (selected === undefined) throw new Error("Agent activity options are empty.");
  return selected;
}

function pickActivityLabel(previous: AgentActivityLabel | undefined, random: () => number): AgentActivityLabel {
  return pickDifferent(FACTUAL_ACTIVITY_LABELS, previous, random);
}
