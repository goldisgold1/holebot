import type { AppFormat, AppTranslate } from "@openbot/i18n";
import { prefersReducedMotion } from "@openbot/ui/utils";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { avatarHeadColor } from "../../bloub-avatar";
import type { AgentProfile } from "../../data";
import { useText } from "../../text";
import { AgentAvatar } from "../agents/AgentAvatar";
import {
  AgentActivityBody,
  type AgentActivityLabel,
  agentActivityLabelKey,
  nextAgentActivityLabel,
} from "../conversation/AgentActivity";
import type { AgentStep } from "../conversation/AgentSteps";

/** One agent the channel is waiting on. The profile is missing while the agent list has no such id. */
export interface ChannelWorker {
  id: string;
  name: string;
  agent?: AgentProfile | undefined;
}

/** How long the working face shows one worker before it passes to the next. */
const WORKER_CYCLE_MS = 2_000;
/** Past this many workers, the line names the first two and counts the rest. */
const NAMED_WORKERS_MAX = 3;
const NAMED_WORKERS_SHORT = 2;
/** The reader faces are 18px wide and sit one 22px step apart. */
const READER_STEP_PX = 22;
/** Readers that arrive together pop in one after another, this far apart. */
const READER_ENTER_STAGGER_MS = 45;
/** Each idle reader breathes this far ahead of the one before it, so the stack never pulses as one. */
const READER_BREATH_OFFSET_MS = 400;

/**
 * Who the channel is waiting on, for the announcement only.
 *
 * A channel runs several agents at once, and a row for each would push the transcript off the
 * screen every time work started. The names read as a list, so the listener counts the workers in
 * one line. It takes the subject of the agent chat's announcement - `<name> is working` - so both
 * chats announce work the same way. Past three workers it names the first two and counts the rest.
 */
export function channelActivitySentence(names: string[], t: AppTranslate): string {
  if (names.length === 0) return "";
  if (names.length === 1) return t("channel.activity.one", { name: names[0] ?? "" });
  if (names.length > NAMED_WORKERS_MAX) {
    return t("channel.activity.others", {
      names: names.slice(0, NAMED_WORKERS_SHORT).join(", "),
      count: names.length - NAMED_WORKERS_SHORT,
    });
  }
  const last = names[names.length - 1] ?? "";
  return t("channel.activity.many", { names: names.slice(0, -1).join(", "), last });
}

/** One part of the visible list of names: a worker, or the words between two names. */
type ChannelWorkerNamePart = { worker: ChannelWorker } | { text: string };

const NAME_MARKER = /(\u{E000}\d+\u{E001})/u;

/**
 * The names of the workers as one list in the interface language ("Chief and Research"), cut into
 * parts so that each name can take its agent's colour. The list is written with a marker for each
 * name, so the words and their order stay those of the locale. Past three workers the list names
 * the first two and ends in `others`, the count of the rest ("Chief, Research and 2 others").
 */
function channelWorkerNameParts(
  workers: ChannelWorker[],
  list: AppFormat["list"],
  others: (count: number) => string,
): ChannelWorkerNamePart[] {
  const named = workers.length > NAMED_WORKERS_MAX ? workers.slice(0, NAMED_WORKERS_SHORT) : workers;
  const markers = named.map((_, index) => `\u{E000}${index}\u{E001}`);
  const rest = workers.length - named.length;
  return list(rest > 0 ? [...markers, others(rest)] : markers)
    .split(NAME_MARKER)
    .flatMap((part): ChannelWorkerNamePart[] => {
      const index = markers.indexOf(part);
      const worker = named[index];
      if (worker) return [{ worker }];
      return part ? [{ text: part }] : [];
    });
}

/** The colour of the worker's name on its messages, so the name here matches its face and its replies. */
function workerNameStyle(worker: ChannelWorker) {
  return `--channel-activity-name-color: ${avatarHeadColor(worker.agent?.avatarSeed ?? worker.id, worker.agent?.avatarHue ?? null)}`;
}

/** A member in the reader stack. A departing one stays until its exit animation ends. */
interface ReaderSlot {
  member: ChannelWorker;
  departing: boolean;
  /** Its place among the members that arrived together, which staggers their entrance. */
  enterRank: number;
}

/**
 * The next reader stack for the members now present. A member who left is marked departing rather
 * than dropped, and one who comes back before its exit ends is kept in its seat. New members join at
 * the end, so the newest sits on top. The same array comes back when nothing changed.
 */
function nextReaderSlots(slots: ReaderSlot[], members: readonly ChannelWorker[]): ReaderSlot[] {
  const present = new Map(members.map((member) => [member.id, member]));
  let changed = false;
  const next: ReaderSlot[] = [];
  for (const slot of slots) {
    const member = present.get(slot.member.id);
    if (member === undefined) {
      changed ||= !slot.departing;
      next.push(slot.departing ? slot : { ...slot, departing: true });
    } else {
      present.delete(member.id);
      changed ||= slot.departing || slot.member !== member;
      next.push(slot.departing || slot.member !== member ? { ...slot, member, departing: false } : slot);
    }
  }
  let enterRank = 0;
  for (const member of present.values()) {
    changed = true;
    next.push({ member, departing: false, enterRank });
    enterRank += 1;
  }
  return changed ? next : slots;
}

/**
 * The members present in the channel but not working, as a row of small faces after the working
 * one. A face pops in when its member arrives and shrinks away when it leaves; at rest the faces
 * breathe, each a step ahead of the last.
 */
function ChannelReaderStack(props: { readers: readonly ChannelWorker[] }) {
  const [slots, setSlots] = createSignal<ReaderSlot[]>([]);
  createEffect(
    () => props.readers,
    (readers) => {
      setSlots((previous) => {
        const next = nextReaderSlots(previous, readers);
        // With reduced motion there is no exit animation to wait for.
        return prefersReducedMotion() ? next.filter((slot) => !slot.departing) : next;
      });
    },
  );
  const depart = (id: string) => setSlots((previous) => previous.filter((slot) => slot.member.id !== id));
  const seated = () => slots().filter((slot) => !slot.departing).length;
  const offset = (index: number) =>
    slots()
      .slice(0, index)
      .filter((slot) => !slot.departing).length * READER_STEP_PX;
  return (
    <span
      class="channel-activity-readers"
      aria-hidden="true"
      data-reading-count={seated()}
      style={{ "--channel-activity-readers": String(seated()) }}
    >
      <For each={slots()} keyed={(slot) => slot.member.id}>
        {(slot, index) => (
          <span
            class="channel-activity-reader"
            data-departing={slot().departing ? "true" : undefined}
            style={{
              "--channel-activity-reader-x": `${offset(index())}px`,
              "--channel-activity-reader-z": String(index() + 1),
            }}
          >
            <span
              class="channel-activity-reader-disc"
              style={{ "--channel-activity-reader-delay": `${slot().enterRank * READER_ENTER_STAGGER_MS}ms` }}
              onAnimationEnd={(event) => {
                if (slot().departing && event.target === event.currentTarget) depart(slot().member.id);
              }}
            >
              <span
                class="channel-activity-reader-breath"
                style={{ "--channel-activity-reader-breath-delay": `${-index() * READER_BREATH_OFFSET_MS}ms` }}
              >
                <AgentAvatar
                  agent={slot().member.agent}
                  seed={slot().member.agent ? undefined : slot().member.id}
                  class="channel-activity-reader-face"
                />
              </span>
            </span>
          </span>
        )}
      </For>
    </span>
  );
}

/**
 * The activity row of a channel shows one working face, the names of the working agents and the
 * members who are only reading.
 *
 * It uses the `agent-activity-*` rules and the same shifting label as the agent chat, so a reader
 * who moves between a channel and an agent chat meets one indicator. The working face passes from
 * one worker to the next every two seconds, so one animating avatar stands for the whole team -
 * each one costs the renderer a style recalculation and a paint per frame. The names say who works,
 * since the face shows one at a time. Members that are present but idle sit after it as a stack of
 * small resting faces. The steps of the turns that have no answer yet open under the line, as in
 * the agent chat.
 */
export function ChannelActivityIndicator(props: {
  workers: ChannelWorker[];
  /** Members present in the channel that are not working. A worker listed here shows once, as a worker. */
  readers?: readonly ChannelWorker[] | undefined;
  steps?: readonly AgentStep[] | undefined;
  /** The "Show agent steps" setting: the steps are open when the work starts. */
  stepsOpenByDefault?: boolean | undefined;
}) {
  const { t, format } = useText();
  const key = createMemo(() =>
    props.workers
      .map((worker) => worker.id)
      .sort()
      .join(","),
  );
  let previous: AgentActivityLabel | undefined;
  // A new set of workers is a new turn of the channel, so it gets a label of its own. The same set
  // keeps what it had, and the row does not flicker as messages arrive.
  const label = createMemo<AgentActivityLabel>(() => {
    key();
    previous = nextAgentActivityLabel(previous);
    return previous;
  });
  const [tick, setTick] = createSignal(0);
  createEffect(
    () => props.workers.length > 1 && !prefersReducedMotion(),
    (cycling) => {
      if (!cycling) return;
      const clock = window.setInterval(() => setTick((value) => value + 1), WORKER_CYCLE_MS);
      return () => window.clearInterval(clock);
    },
  );
  const shownWorker = createMemo(() => {
    const workers = props.workers;
    if (workers.length === 0) return [];
    const worker = workers[tick() % workers.length];
    return worker ? [worker] : [];
  });
  const readers = createMemo(() => {
    const working = new Set(props.workers.map((worker) => worker.id));
    return (props.readers ?? []).filter((reader) => !working.has(reader.id));
  });
  const sentence = () =>
    channelActivitySentence(
      props.workers.map((worker) => worker.name),
      t,
    );
  return (
    <div class="agent-activity-entry" data-state={props.workers.length > 0 ? "active" : "idle"}>
      <span
        hidden={props.workers.length === 0}
        class="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={t("channel.activity.status", { sentence: sentence(), label: t(agentActivityLabelKey(label())) })}
      />
      <AgentActivityBody
        class="channel-activity-content"
        steps={props.steps}
        stepsOpenByDefault={props.stepsOpenByDefault}
        live
      >
        <div class="channel-activity-faces">
          <For each={shownWorker()} keyed={(worker) => worker.id}>
            {(worker) => (
              <AgentAvatar
                agent={worker().agent}
                seed={worker().agent ? undefined : worker().id}
                mood="working"
                class="agent-activity-avatar channel-activity-face"
              />
            )}
          </For>
          <ChannelReaderStack readers={readers()} />
        </div>
        {/* With nobody working, the row is only the faces of the members here. */}
        <Show when={props.workers.length > 0}>
          <span class="channel-activity-names">
            <For
              each={channelWorkerNameParts(props.workers, format.list, (count) =>
                t("channel.activity.othersCount", { count }),
              )}
            >
              {(part) =>
                "worker" in part ? (
                  <span class="channel-activity-name" style={workerNameStyle(part.worker)}>
                    {part.worker.name}
                  </span>
                ) : (
                  part.text
                )
              }
            </For>
          </span>
          <span class="agent-activity-label">{t(agentActivityLabelKey(label()))}</span>
        </Show>
      </AgentActivityBody>
    </div>
  );
}
