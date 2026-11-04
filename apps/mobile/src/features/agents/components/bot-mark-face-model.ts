import type { AvatarFaceMood } from "@openbot/brand/bloub-avatar-motion";
import { BOT_MARK_SHAPES, type BotMarkShape, type BotMarkState } from "@openbot/brand/bot-mark-engine";

/*
 * HoleA.I (Vincent, Nov 4 2026): the phone draws the same agent face as the desktop: the bot app's avatar
 * engine (@openbot/brand/bot-mark-engine), with the body shape seeded from the agent and its mood mapped
 * to an engine state exactly as the desktop's BotMarkFace does.
 */
export const MOOD_STATES: Readonly<Record<AvatarFaceMood, BotMarkState>> = {
  idle: "idle",
  working: "working",
  connecting: "thinking",
  waiting: "blocked",
  responded: "idle",
  failed: "idle",
  asleep: "sleeping",
  listening: "listening",
  speaking: "streaming",
};

/** The desktop's seeded shape: the same agent has the same body on both. */
export function seededShape(seed: string): BotMarkShape {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return BOT_MARK_SHAPES[(hash >>> 0) % BOT_MARK_SHAPES.length] ?? "blob";
}

export interface BotMarkFaceProps {
  seed: string;
  color: string;
  mood: AvatarFaceMood;
  size: number;
  /** Off: one still frame. */
  playing: boolean;
}
