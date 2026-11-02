import type { AvatarMood } from "@openbot/brand/bloub-avatar-motion";

/**
 * How the flat agent face moves on its own, per mood: when it blinks, where its eyes wander, and how
 * its body leans and sways. Everything random comes from the agent's seed, so each agent keeps its
 * own rhythm from one launch to the next, and two agents side by side do not blink together.
 *
 * Distances are in face units: the face is drawn in a 140-unit box with a body about 90 units wide.
 */

/** One blink, open to shut to open, in milliseconds. */
export const BLINK_MS = 260;
/** How long an eye takes to jump to its next spot. */
export const GAZE_JUMP_MS = 120;
/** How long the body takes to settle into the pose of a new mood. */
export const POSE_MS = 350;
/** The body sways on one clock of this length. Each mood plays a whole number of sways per turn. */
export const SWAY_CYCLE_MS = 12_000;
/** Blinks and glances are dealt in rounds of this many, which then repeat. */
const ROUND = 8;
/** The lid stays shut for this part of a blink. */
const BLINK_HOLD = 0.13;
/** The lid is shut at the end of this part of a blink. */
const BLINK_CLOSE_END = (1 - BLINK_HOLD) * 0.42;
const BLINK_OPEN_START = BLINK_CLOSE_END + BLINK_HOLD;
/** The eye opens a little past its size, then settles. */
const BLINK_OVERSHOOT = 1.06;
/** The free space around each eye inside the body, as the half-axes of an ellipse. */
const EYE_ROOM = { x: 7, y: 5 } as const;

type Range = readonly [min: number, max: number];

interface MoodMotion {
  /** The wait between two blinks. Null for moods whose eyes are drawn shut. */
  blink: Range | null;
  /** Where the eyes may look, relative to their resting place (negative y is up). */
  gaze: { x: Range; y: Range; every: Range };
  pose: FacePose;
  /** Sways per {@link SWAY_CYCLE_MS}. */
  sways: number;
}

/**
 * The body's lean and sway, in face units and degrees. A sway value is an amplitude. `hop` lifts the
 * body off its seat in small bounces.
 */
export interface FacePose {
  rot: number;
  tx: number;
  ty: number;
  squash: number;
  swayRot: number;
  swayTx: number;
  swayTy: number;
  swaySquash: number;
  hop: number;
}

const STILL: FacePose = { rot: 0, tx: 0, ty: 0, squash: 1, swayRot: 0, swayTx: 0, swayTy: 0, swaySquash: 0, hop: 0 };

// Calm moods sway slowly and busy ones quickly. A low mood sits lower and squashes a little; a
// glad one lifts and stretches.
const MOODS: Readonly<Record<AvatarMood, MoodMotion>> = {
  idle: {
    blink: [6000, 14_000],
    gaze: { x: [-3.5, 3.5], y: [-2, 2], every: [2500, 5500] },
    pose: { ...STILL, swayRot: 1.5, swayTx: 0.8, swayTy: 1.2, swaySquash: 0.008 },
    sways: 2,
  },
  // Thinking: the eyes look up and away, and the body rocks from side to side.
  working: {
    blink: [2800, 5500],
    gaze: { x: [-6, 6], y: [-4, 1], every: [1500, 2800] },
    pose: { ...STILL, rot: -4, swayRot: 5, swayTx: 4, swayTy: 2.5 },
    sways: 4,
  },
  // Searching for its host: quick scanning.
  connecting: {
    blink: [1600, 4000],
    gaze: { x: [-7, 7], y: [-3, 3], every: [550, 1150] },
    pose: { ...STILL, swayRot: 7, swayTx: 4, swayTy: 2 },
    sways: 6,
  },
  // Listening for the reader's answer: a small tilt, leaning in.
  waiting: {
    blink: [3000, 7000],
    gaze: { x: [-3, 3], y: [-2, 0.5], every: [2200, 4200] },
    pose: { ...STILL, rot: 6, tx: 1.5, ty: -2, squash: 1.015, swayRot: 1.5, swayTy: 0.8 },
    sways: 2,
  },
  failed: {
    blink: [4000, 8000],
    gaze: { x: [-2.5, 2.5], y: [0.5, 2.5], every: [3000, 6000] },
    pose: { ...STILL, rot: 3, ty: 5, squash: 0.97, swayRot: 2, swayTx: 1.2, swayTy: 1 },
    sways: 1,
  },
  // A fresh reply: happy closed eyes and a few small hops.
  responded: {
    blink: null,
    gaze: { x: [0, 0], y: [0, 0], every: [4000, 8000] },
    pose: { ...STILL, ty: -1, squash: 1.02, swayRot: 3, swayTx: 2, swaySquash: 0.02, hop: 4 },
    sways: 5,
  },
  asleep: {
    blink: null,
    gaze: { x: [0, 0], y: [0, 0], every: [4000, 8000] },
    pose: { ...STILL, rot: 4, tx: -1.5, ty: 5, swayRot: 2, swayTy: 2, swaySquash: 0.016 },
    sways: 1,
  },
};

/** FNV-1a: a stable number for a seed. */
function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** A small seeded generator (mulberry32): the same seed always deals the same numbers. */
function seededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function between(random: () => number, [min, max]: Range) {
  return min + (max - min) * random();
}

/** Pulls a glance back inside the eye's room, so the eyes never leave the body. */
function clampToRoom(x: number, y: number): [number, number] {
  const reach = Math.hypot(x / EYE_ROOM.x, y / EYE_ROOM.y);
  return reach <= 1 ? [x, y] : [x / reach, y / reach];
}

export interface FaceRhythm {
  /** The wait before each blink of a round, in milliseconds. Empty when the eyes do not blink. */
  blinkWaits: number[];
  /**
   * The eye positions of a round, as flat x, y pairs. The round starts and ends at the centre, so it
   * repeats without a jump.
   */
  gazePoints: number[];
  /** How long the eyes hold each position of the round before they jump to the next one. */
  gazeHolds: number[];
  pose: FacePose;
  sways: number;
}

/** The blink and glance rhythm of one agent in one mood. */
export function faceRhythm(seed: string, mood: AvatarMood): FaceRhythm {
  const motion = MOODS[mood];
  const random = seededRandom(`${seed}:${mood}`);
  const blinkWaits = motion.blink
    ? Array.from({ length: ROUND }, () => Math.round(between(random, motion.blink ?? [0, 0])))
    : [];
  const gazePoints = [0, 0];
  const gazeHolds: number[] = [];
  const still = motion.gaze.x[0] === motion.gaze.x[1] && motion.gaze.y[0] === motion.gaze.y[1];
  if (!still) {
    for (let index = 1; index < ROUND; index += 1) {
      gazePoints.push(...clampToRoom(between(random, motion.gaze.x), between(random, motion.gaze.y)));
      gazeHolds.push(Math.round(between(random, motion.gaze.every)));
    }
    gazePoints.push(0, 0);
    gazeHolds.push(Math.round(between(random, motion.gaze.every)));
  }
  return { blinkWaits, gazePoints, gazeHolds, pose: motion.pose, sways: motion.sways };
}

export function stillPose(mood: AvatarMood): FacePose {
  return MOODS[mood].pose;
}

function smoothstep(t: number) {
  "worklet";
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * How open an eye is during a blink, from 1 (open) to 0 (shut). `progress` counts blinks: each whole
 * number is one blink, so a round of blinks animates one value from 0 up. The lid shuts over the
 * first 42% or so, holds, then opens with a small overshoot that settles over the last 30%.
 */
export function blinkOpenness(progress: number) {
  "worklet";
  const t = progress - Math.floor(progress);
  if (t <= 0) return 1;
  if (t < BLINK_CLOSE_END) return 1 - smoothstep(t / BLINK_CLOSE_END);
  if (t < BLINK_OPEN_START) return 0;
  const opening = (t - BLINK_OPEN_START) / (1 - BLINK_OPEN_START);
  if (opening < 0.7) return BLINK_OVERSHOOT * smoothstep(opening / 0.7);
  return BLINK_OVERSHOOT - (BLINK_OVERSHOOT - 1) * smoothstep((opening - 0.7) / 0.3);
}
