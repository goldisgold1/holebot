/**
 * HoleA.I (Vincent, Nov 3 2026): the tray face of the bot app, ported from its menubar tray. A
 * sprite strip holds 29 frames side by side; a scheduler plays a blink or a glance forever, with
 * the bot app's own timings. This module is pure: the tray gives it the frames, a clock and a
 * random source.
 */

type Motion = "rest" | "blink-close" | "blink-open" | `${Glance}-${"in" | "hold" | "out"}`;
type Glance = "glance-left" | "glance-right" | "glance-up";

const GLANCES: readonly Glance[] = ["glance-left", "glance-right", "glance-up"];

/**
 * The frame order of a strip: rest, 4 blink-closing frames (the last is fully closed), 3
 * blink-opening frames (the last overshoots), then each glance as 3 in, 1 hold and 3 out.
 */
export const FACE_FRAME_MOTIONS: readonly Motion[] = [
  "rest",
  "blink-close",
  "blink-close",
  "blink-close",
  "blink-close",
  "blink-open",
  "blink-open",
  "blink-open",
  ...GLANCES.flatMap((glance): Motion[] => [
    `${glance}-in`,
    `${glance}-in`,
    `${glance}-in`,
    `${glance}-hold`,
    `${glance}-out`,
    `${glance}-out`,
    `${glance}-out`,
  ]),
];

export const FACE_FRAME_COUNT = FACE_FRAME_MOTIONS.length;

const REST_FRAME = 0;
const BLINK_CLOSED_FRAME = 4;

const BLINK_REST_MS = { min: 2800, max: 5500 };
const GLANCE_REST_MS = { min: 1800, max: 3200 };
const GLANCE_HOLD_MS = { min: 500, max: 900 };
const BLINK_CLOSING_FRAME_MS = 18;
const BLINK_CLOSED_FRAME_MS = 35;
const BLINK_OPENING_FRAME_MS = 75;
const GLANCE_FRAME_MS = 45;
const SETTLE_MS = 50;
const BLINK_SHARE = 0.5;
const DOUBLE_BLINK_SHARE = 0.14;

export interface FaceStep {
  frame: number;
  holdMs: number;
}

function framesOf(motion: Motion): number[] {
  const frames: number[] = [];
  for (const [index, candidate] of FACE_FRAME_MOTIONS.entries()) if (candidate === motion) frames.push(index);
  return frames;
}

function between(random: () => number, range: { min: number; max: number }): number {
  return Math.round(range.min + (range.max - range.min) * random());
}

function blink(): FaceStep[] {
  const steps: FaceStep[] = [];
  for (const frame of framesOf("blink-close"))
    steps.push({ frame, holdMs: frame === BLINK_CLOSED_FRAME ? BLINK_CLOSED_FRAME_MS : BLINK_CLOSING_FRAME_MS });
  for (const frame of framesOf("blink-open")) steps.push({ frame, holdMs: BLINK_OPENING_FRAME_MS });
  steps.push({ frame: REST_FRAME, holdMs: SETTLE_MS });
  return steps;
}

function glance(direction: Glance, random: () => number): FaceStep[] {
  const steps: FaceStep[] = [{ frame: REST_FRAME, holdMs: between(random, GLANCE_REST_MS) }];
  for (const frame of framesOf(`${direction}-in`)) steps.push({ frame, holdMs: GLANCE_FRAME_MS });
  const hold = framesOf(`${direction}-hold`)[0] ?? REST_FRAME;
  steps.push({ frame: hold, holdMs: between(random, GLANCE_HOLD_MS) });
  for (const frame of framesOf(`${direction}-out`)) steps.push({ frame, holdMs: GLANCE_FRAME_MS });
  steps.push({ frame: REST_FRAME, holdMs: SETTLE_MS });
  return steps;
}

/** One cycle: half the time a rest and a blink (sometimes a double blink), else a rest and a glance. */
export function faceCycle(random: () => number): FaceStep[] {
  if (random() < BLINK_SHARE) {
    const steps: FaceStep[] = [{ frame: REST_FRAME, holdMs: between(random, BLINK_REST_MS) }, ...blink()];
    if (random() < DOUBLE_BLINK_SHARE) steps.push(...blink());
    return steps;
  }
  const direction = GLANCES[Math.min(GLANCES.length - 1, Math.floor(random() * GLANCES.length))] ?? "glance-left";
  return glance(direction, random);
}

export interface FaceClock {
  schedule(delayMs: number, run: () => void): { dispose(): void };
}

export const realFaceClock: FaceClock = {
  schedule(delayMs, run) {
    const handle = setTimeout(run, delayMs);
    return { dispose: () => clearTimeout(handle) };
  },
};

/** Plays the cycles until stopped. `show` gets a frame index. */
export function playFace(options: { show: (frame: number) => void; random?: () => number; clock?: FaceClock }): {
  stop(): void;
} {
  const random = options.random ?? Math.random;
  const clock = options.clock ?? realFaceClock;
  let stopped = false;
  let pending: { dispose(): void } | null = null;
  let queue: FaceStep[] = [];
  const next = () => {
    if (stopped) return;
    if (queue.length === 0) queue = faceCycle(random);
    const step = queue.shift();
    if (!step) return;
    options.show(step.frame);
    pending = clock.schedule(step.holdMs, next);
  };
  next();
  return {
    stop() {
      stopped = true;
      pending?.dispose();
      pending = null;
    },
  };
}
