import type { AvatarFaceMood } from "@openbot/brand/bloub-avatar-motion";
import { BOT_MARK_SHAPES, type BotMarkHandle, type BotMarkState, mountBotMark } from "@openbot/brand/bot-mark-engine";
import { createEffect, createSignal, onSettled } from "solid-js";
import { settlePose } from "./bot-mark/settle-pose";

/**
 * HoleA.I (Vincent, Nov 3 2026): the agent face is the bot app's avatar engine (bot-mark/engine.js, from
 * Vincent's bot app): a seeded body shape in the agent's colour whose eyes and body play the engine's own
 * clips for each state. This bridges an agent's mood to an engine state and keeps the engine in step.
 */
const MOOD_STATES: Readonly<Record<AvatarFaceMood, BotMarkState>> = {
  idle: "idle",
  working: "working",
  connecting: "thinking",
  // HoleA.I (from Vincent's bot app): an agent that waits for the user is blocked, and drowses after a while.
  waiting: "blocked",
  // The outcome of a turn shows only for the settle pose's moment; after it the face rests.
  responded: "idle",
  failed: "idle",
  asleep: "sleeping",
  listening: "listening",
  speaking: "streaming",
};

/** The bot app's blocked hold: a face left waiting this long turns drowsy. */
export const BLOCKED_DROWSY_MS = 120_000;

function seededShape(seed: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return BOT_MARK_SHAPES[(hash >>> 0) % BOT_MARK_SHAPES.length] ?? "blob";
}

export function BotMarkFace(props: {
  seed: string;
  color: string;
  mood: AvatarFaceMood;
  /** Off: one still frame, so a resting row costs nothing. */
  playing: boolean;
  followPointer: boolean;
  /** Overrides the mood's state, such as the step a working agent is on. */
  state?: BotMarkState | undefined;
  /** The eye colour; omitted, the eyes are cut out of the body. */
  eyeColor?: string | undefined;
  /** Receives the engine handle, for pokes. */
  handle?: (handle: BotMarkHandle | undefined) => void;
}) {
  let host: HTMLSpanElement | undefined;
  let mark: BotMarkHandle | undefined;
  // The engine only drifts from blocked to drowsy while it plays, and a waiting sidebar row rests on a
  // still frame to save the GPU, so the drift is timed here: the next frame it draws is drowsy.
  const [drowsy, setDrowsy] = createSignal(false);
  createEffect(
    () => props.mood === "waiting" && !props.state,
    (waiting) => {
      setDrowsy(false);
      if (!waiting) return;
      const timer = setTimeout(() => setDrowsy(true), BLOCKED_DROWSY_MS);
      return () => clearTimeout(timer);
    },
  );
  const state = (): BotMarkState => {
    if (props.state) return props.state;
    if (props.mood === "waiting" && drowsy()) return "drowsy";
    const resting = props.mood === "idle" || props.mood === "responded" || props.mood === "failed";
    return (resting ? settlePose(props.seed) : undefined) ?? MOOD_STATES[props.mood] ?? "idle";
  };
  onSettled(() => {
    if (!host) return;
    mark = mountBotMark(host, {
      shape: seededShape(props.seed),
      color: props.color,
      state: state(),
      seed: props.seed,
      followPointer: props.followPointer,
      playing: props.playing,
      maxFrameRate: 30,
      // .bot-mark-face is position: relative in CSS.
      hostPositioned: true,
      ...(props.eyeColor ? { eyeColor: props.eyeColor } : {}),
    });
    props.handle?.(mark);
    return () => {
      props.handle?.(undefined);
      mark?.destroy();
      mark = undefined;
    };
  });
  createEffect(state, (next) => mark?.setState(next));
  createEffect(
    () => [props.color, props.eyeColor] as const,
    ([color, eyeColor]) => mark?.setColor(color, eyeColor ?? null),
  );
  createEffect(
    () => seededShape(props.seed),
    (shape) => mark?.setShape(shape),
  );
  createEffect(
    () => props.playing,
    (playing) => mark?.setPlaying(playing),
  );
  createEffect(
    () => props.followPointer,
    (follow) => mark?.setFollowingPointer(follow),
  );
  return <span ref={host} class="bot-mark-face" aria-hidden="true" />;
}
