import type { AppTextKey } from "@openbot/i18n";
import type { JSX } from "@solidjs/web";
import { createEffect, createMemo, createSignal, createUniqueId, onCleanup, Show } from "solid-js";
import { Button } from "../../button";
import type { AgentProfile } from "../../data";
import { ChevronDown } from "../../icons";
import { useText } from "../../text";
import { prefersReducedMotion } from "../../utils";
import { AgentAvatar } from "../agents/AgentAvatar";
import { type ActivityTextKind, activityBotState, activityKindBotState } from "../agents/bot-mark/activity-state";
import { setMarkEmphasis } from "../agents/bot-mark/mark-stage";
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

export type AgentActivityLabel = (typeof AGENT_ACTIVITY_LABELS)[number];

// HoleA.I (from Vincent's bot app): two pools, as in the bot app: what a thinking agent says, and what a
// working one says. The last two labels above are kept for old callers only.
const THINKING_ACTIVITY_LABELS: readonly AgentActivityLabel[] = [
  "Thinking it through…",
  "Mulling it over…",
  "Putting it together…",
];
const WORKING_ACTIVITY_LABELS: readonly AgentActivityLabel[] = [
  "Getting it done…",
  "Making progress…",
  "Working on it…",
  "Handling it…",
  "Chipping away…",
];

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

/** HoleA.I (from Vincent's bot app): the one phrase of each kind of step, such as "Digging around" for a search. */
const ACTIVITY_STEP_KEYS = {
  searching_web: "chat.activity.step.searchingWeb",
  reading_web: "chat.activity.step.readingWeb",
  reading_file: "chat.activity.step.readingFile",
  drafting_file: "chat.activity.step.draftingFile",
  on_your_computer: "chat.activity.step.onYourComputer",
  running_commands: "chat.activity.step.runningCommands",
  organizing_files: "chat.activity.step.organizingFiles",
  waiting_on_command: "chat.activity.step.waitingOnCommand",
  generating_photo: "chat.activity.step.generatingPhoto",
  generating_video: "chat.activity.step.generatingVideo",
  coding: "chat.activity.step.coding",
  waiting_for_you: "chat.activity.step.waitingForYou",
  on_its_computer: "chat.activity.step.onItsComputer",
  messaging_assistant: "chat.activity.step.messagingAssistant",
  messaging: "chat.activity.step.messaging",
  connecting_app: "chat.activity.step.connectingApp",
  browsing_web: "chat.activity.step.browsingWeb",
  checking_usage: "chat.activity.step.checkingUsage",
} as const satisfies Record<Exclude<ActivityTextKind, "thinking" | "working">, AppTextKey>;

function drawFrom<T>(items: readonly T[], draw: number): T {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(draw * items.length)));
  const item = items[index];
  if (item === undefined) throw new Error("Agent activity options are empty.");
  return item;
}

/**
 * The words of a kind of step. A thinking or working step takes one phrase of its pool by `draw`, a
 * number in [0, 1) drawn when the step first shows, so the phrase holds while the step does.
 */
export function agentActivityStepKey(kind: ActivityTextKind, draw: number): AppTextKey {
  if (kind === "thinking") return agentActivityLabelKey(drawFrom(THINKING_ACTIVITY_LABELS, draw));
  if (kind === "working") return agentActivityLabelKey(drawFrom(WORKING_ACTIVITY_LABELS, draw));
  return ACTIVITY_STEP_KEYS[kind];
}

/** HoleA.I (from Vincent's bot app): a line of the agent's own words is one line, cut at 60 characters. */
const ACTIVITY_TEXT_LIMIT = 60;

export function clipActivityText(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length <= ACTIVITY_TEXT_LIMIT ? line : `${line.slice(0, ACTIVITY_TEXT_LIMIT - 1).trimEnd()}…`;
}

/**
 * The line the indicator shows while an agent works, when nothing says what the step is: one of the
 * bot app's working phrases.
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
  return pickDifferent(WORKING_ACTIVITY_LABELS, previous, random);
}

/**
 * A step shorter than this shows no time. Most steps end sooner, and a counter that appears and
 * goes away at once is only noise.
 */
const ELAPSED_VISIBLE_AFTER_MS = 60_000;

/**
 * HoleA.I (from Vincent's bot app): a new step replaces the shown one only after the shown one has been up
 * this long; a step that comes sooner waits, and only the newest waiting step shows. Steps of the same
 * kind merge, so a run of searches reads as one "Digging around".
 */
export const ACTIVITY_LABEL_QUEUE_MS = 800;
const LABEL_SWAP_MS = 300;
const LABEL_SWAP_EASE = "cubic-bezier(0.1, 0.9, 0.2, 1)";
const LABEL_SWAP_RISE_PX = 4;
const LABEL_SWAP_REDUCED_MS = 120;

/** One step of the line: what it is, and the key that says when two steps are the same. */
export interface AgentActivityStep {
  key: string;
  kind?: ActivityTextKind | undefined;
  /** Text shown as it is: the agent's own words, or a wait. */
  text?: string | undefined;
  label?: AgentActivityLabel | undefined;
}

export interface ShownAgentActivityStep {
  step: AgentActivityStep;
  shownAt: number;
  /** The phrase draw of the step, in [0, 1). */
  draw: number;
}

/**
 * The bot app's label queue, as a pure step: the shown step after `next` arrives at `now`, and the step
 * that waits for its turn, if any.
 */
export function queueAgentActivityStep(
  shown: ShownAgentActivityStep,
  next: AgentActivityStep,
  now: number,
  random: () => number = Math.random,
): { shown: ShownAgentActivityStep; queued: AgentActivityStep | null } {
  if (next.key === shown.step.key) return { shown: { ...shown, step: next }, queued: null };
  if (now - shown.shownAt >= ACTIVITY_LABEL_QUEUE_MS)
    return { shown: { step: next, shownAt: now, draw: random() }, queued: null };
  return { shown, queued: next };
}

function createQueuedStep(step: () => AgentActivityStep): {
  shown: () => ShownAgentActivityStep;
  ref: (element: HTMLElement) => void;
} {
  const [shown, setShown] = createSignal<ShownAgentActivityStep>({
    step: step(),
    shownAt: Date.now(),
    draw: Math.random(),
  });
  let element: HTMLElement | undefined;
  let queued: AgentActivityStep | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const animateSwap = () => {
    if (!element) return;
    // A new line rises 4px into place as it fades in; with reduced motion it only fades.
    const reduced = prefersReducedMotion();
    element.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translateY(${LABEL_SWAP_RISE_PX}px)` },
            { opacity: 1, transform: "none" },
          ],
      reduced
        ? { duration: LABEL_SWAP_REDUCED_MS, easing: "linear" }
        : { duration: LABEL_SWAP_MS, easing: LABEL_SWAP_EASE },
    );
  };
  const apply = (next: AgentActivityStep) => {
    const current = shown();
    const result = queueAgentActivityStep(current, next, Date.now());
    queued = result.queued;
    clearTimeout(timer);
    timer = undefined;
    if (result.shown !== current) {
      setShown(result.shown);
      if (result.shown.step.key !== current.step.key) animateSwap();
    }
    if (queued) {
      const waiting = queued;
      timer = setTimeout(() => apply(waiting), Math.max(0, current.shownAt + ACTIVITY_LABEL_QUEUE_MS - Date.now()));
    }
  };
  createEffect(step, (next) => apply(next));
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
  /**
   * What kind of step `detail` describes, when it is the host's progress line. The line then shows the bot
   * app's phrase of that kind. Without a kind, `detail` is the agent's own words and shows as it is.
   */
  kind?: ActivityTextKind | null | undefined;
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
  const step = (): AgentActivityStep => {
    const provider = props.waitingFor;
    if (provider) return { key: `wait:${provider}`, text: t("chat.activity.waitingFor", { provider }) };
    if (props.kind) return { key: `kind:${props.kind}`, kind: props.kind };
    const detail = props.detail?.trim();
    if (detail) return { key: `text:${detail}`, text: clipActivityText(detail) };
    return { key: `label:${props.label}`, label: props.label };
  };
  const held = createQueuedStep(step);
  const label = () => {
    const { step: shown, draw } = held.shown();
    if (shown.text !== undefined) return shown.text;
    if (shown.kind) return t(agentActivityStepKey(shown.kind, draw));
    return t(agentActivityLabelKey(shown.label ?? props.label));
  };
  const statusLabel = () => {
    const name = props.agent?.name ?? t("chat.activity.agentFallback");
    const provider = props.waitingFor;
    return provider
      ? t("chat.activity.waitingStatus", { name, provider })
      : t("chat.activity.status", { name, label: label() });
  };
  const waiting = () => (props.waitingFor ? "true" : undefined);
  // The face moves for the step the agent is on: searching, reading, running commands, generating...
  const faceState = () => {
    if (props.waitingFor) return "waiting";
    const kind = held.shown().step.kind;
    return kind ? activityKindBotState(kind) : activityBotState(props.detail);
  };
  // HoleA.I (from Vincent's bot app): pointing at the line gives every copy of the agent's face the
  // surprised look. A press on the line pokes them through the face, whose hover group the line is.
  const seed = () => props.agent?.avatarSeed;
  let emphasized: string | undefined;
  const emphasize = (on: boolean) => {
    const current = seed();
    if (on && current && emphasized !== current) {
      if (emphasized) setMarkEmphasis(emphasized, false);
      emphasized = current;
      setMarkEmphasis(current, true);
    } else if (!on && emphasized) {
      setMarkEmphasis(emphasized, false);
      emphasized = undefined;
    }
  };
  onCleanup(() => emphasize(false));
  const elapsedMs = createElapsed(() => (props.phase === "exiting" ? undefined : props.since));
  // HoleA.I (from Vincent's bot app): a calm clock that appears after a minute and counts whole minutes.
  const elapsed = createMemo(() => {
    const ms = elapsedMs();
    if (ms < ELAPSED_VISIBLE_AFTER_MS) return null;
    const minutes = Math.floor(ms / 60_000);
    const hours = Math.floor(minutes / 60);
    const unit = (value: number, kind: "minute" | "hour") =>
      format.number(value, { style: "unit", unit: kind, unitDisplay: "narrow" });
    const time =
      hours === 0
        ? unit(minutes, "minute")
        : minutes % 60 === 0
          ? unit(hours, "hour")
          : `${unit(hours, "hour")} ${unit(minutes % 60, "minute")}`;
    return t("chat.activity.elapsed", { time });
  });
  return (
    <div class="agent-activity-entry" data-state={props.phase ?? "active"} data-waiting={waiting()}>
      <span class="sr-only" role="status" aria-live="polite" aria-atomic="true" aria-label={statusLabel()} />
      <AgentActivityBody
        steps={props.steps}
        stepsOpenByDefault={props.stepsOpenByDefault}
        live={props.phase !== "exiting"}
      >
        {/* The face's own hover and press reach the whole line through `data-avatar-hover`. */}
        <span
          class="agent-activity-line"
          data-avatar-hover=""
          onPointerEnter={() => emphasize(true)}
          onPointerLeave={() => emphasize(false)}
        >
          <Show
            when={props.agent}
            fallback={<ThinkingMark class="agent-activity-mark" still={Boolean(props.waitingFor)} />}
          >
            {(agent) => (
              <AgentAvatar
                agent={agent()}
                mood="working"
                state={faceState()}
                eyeColor="var(--holeai-activity-mark-eye)"
                class="agent-activity-mark"
              />
            )}
          </Show>
          <span class="agent-activity-label" ref={held.ref}>
            {label()}
          </span>
          <Show when={elapsed()}>{(time) => <span class="agent-activity-elapsed">{time()}</span>}</Show>
        </span>
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

/**
 * Milliseconds since `since`, and 0 when there is none. HoleA.I (from Vincent's bot app): it ticks on
 * the minute boundaries of the step, which is all the clock shows.
 */
function createElapsed(since: () => number | undefined) {
  const [now, setNow] = createSignal(Date.now());
  createEffect(
    () => since(),
    (from) => {
      if (from === undefined) return;
      setNow(Date.now());
      let clock: number | undefined;
      const tick = () => {
        const current = Date.now();
        setNow(current);
        clock = window.setTimeout(tick, 60_000 - ((current - from) % 60_000) + 1);
      };
      clock = window.setTimeout(tick, 60_000 - ((Date.now() - from) % 60_000) + 1);
      return () => window.clearTimeout(clock);
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
