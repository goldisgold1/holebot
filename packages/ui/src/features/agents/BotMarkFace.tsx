import type { AvatarFaceMood } from "@openbot/brand/bloub-avatar-motion";
import { createEffect, onSettled } from "solid-js";
import { BOT_MARK_SHAPES, type BotMarkHandle, type BotMarkState, mountBotMark } from "./bot-mark/engine";

/**
 * HoleA.I (Vincent, Nov 3 2026): the agent face is the bot app's avatar engine (bot-mark/engine.js, from
 * Vincent's bot app): a seeded body shape in the agent's colour whose eyes and body play the engine's own
 * clips for each state. This bridges an agent's mood to an engine state and keeps the engine in step.
 */
const MOOD_STATES: Readonly<Record<AvatarFaceMood, BotMarkState>> = {
  idle: "idle",
  working: "working",
  connecting: "thinking",
  waiting: "waiting",
  responded: "finished",
  failed: "failed",
  asleep: "sleeping",
  listening: "listening",
  speaking: "streaming",
};

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
  /** Receives the engine handle, for pokes. */
  handle?: (handle: BotMarkHandle | undefined) => void;
}) {
  let host: HTMLSpanElement | undefined;
  let mark: BotMarkHandle | undefined;
  onSettled(() => {
    if (!host) return;
    mark = mountBotMark(host, {
      shape: seededShape(props.seed),
      color: props.color,
      state: MOOD_STATES[props.mood] ?? "idle",
      seed: props.seed,
      followPointer: props.followPointer,
      playing: props.playing,
      maxFrameRate: 30,
    });
    props.handle?.(mark);
    return () => {
      props.handle?.(undefined);
      mark?.destroy();
      mark = undefined;
    };
  });
  createEffect(
    () => MOOD_STATES[props.mood] ?? "idle",
    (state) => mark?.setState(state),
  );
  createEffect(
    () => props.color,
    (color) => mark?.setColor(color),
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
