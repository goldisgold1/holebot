import type { AvatarFaceMood } from "@openbot/brand/bloub-avatar-motion";

/**
 * HoleA.I: how each agent face moves. A clip is a few seconds of keyframes on the token's turn (yaw), nod
 * (pitch), how much it faces the front, and the body's roll, lift and squash. Every state has a set of clips,
 * and each agent plays them in its own seeded order, at its own tempo and strength, with one thinking clip
 * it favours - so two agents thinking side by side never move alike. (Grok Bot does the same: one clip set
 * per state, a seeded playlist and phase per bot.)
 *
 * One shared loop drives every face that is moving and on screen, at 30 fps, and stops when none are. It
 * writes a handful of plain custom properties and one transform per face, where CSS keyframes on registered
 * inherited properties used to restyle every slice of every busy face on each frame, on screen or not.
 */

type Track = readonly (readonly [time: number, value: number])[];
interface Clip {
  duration: number;
  turn?: Track;
  nod?: Track;
  front?: Track;
  roll?: Track;
  lift?: Track;
  squash?: Track;
}
type MotionState = "idle" | "thinking" | "happy";

const IDLE: readonly Clip[] = [
  {
    duration: 4.8,
    turn: [
      [0, 0],
      [1.3, -0.12],
      [1.9, -0.12],
      [2.9, 0.1],
      [3.6, 0.1],
      [4.8, 0],
    ],
    nod: [
      [0, 0],
      [1.3, 0.02],
      [2.9, -0.03],
      [4.8, 0],
    ],
    roll: [
      [0, 0],
      [1.3, -2],
      [2.9, 2],
      [4.8, 0],
    ],
  },
  {
    duration: 4.2,
    lift: [
      [0, 0],
      [1.4, -0.7],
      [2.8, 0.3],
      [4.2, 0],
    ],
    squash: [
      [0, 0],
      [1.4, 0.015],
      [2.8, -0.02],
      [4.2, 0],
    ],
    nod: [
      [0, 0],
      [2.1, -0.06],
      [4.2, 0],
    ],
  },
  {
    duration: 5.4,
    nod: [
      [0, 0],
      [1.2, 0.08],
      [2.4, 0.08],
      [3.6, -0.04],
      [5.4, 0],
    ],
    roll: [
      [0, 0],
      [1.2, 4],
      [2.4, 4],
      [3.6, -1],
      [5.4, 0],
    ],
    turn: [
      [0, 0],
      [2.4, 0.05],
      [5.4, 0],
    ],
  },
];

// Thinking: the face turns toward you and looks up a little, then each clip is its own habit.
const THINKING: readonly Clip[] = [
  // Ponder: holds a tilt and sways around its spot.
  {
    duration: 3.2,
    front: [
      [0, 0.45],
      [3.2, 0.45],
    ],
    nod: [
      [0, 0.08],
      [1.6, 0.1],
      [3.2, 0.08],
    ],
    turn: [
      [0, -0.03],
      [1.6, 0.04],
      [3.2, -0.03],
    ],
    roll: [
      [0, -5],
      [1.6, -3],
      [3.2, -5],
    ],
    lift: [
      [0, -1],
      [1.6, -2],
      [3.2, -1],
    ],
  },
  // Tap: little bounces in a rhythm, like counting.
  {
    duration: 2.4,
    front: [
      [0, 0.5],
      [2.4, 0.5],
    ],
    nod: [
      [0, 0.04],
      [2.4, 0.04],
    ],
    lift: [
      [0, 0],
      [0.3, -1.6],
      [0.6, 0],
      [0.9, -1.6],
      [1.2, 0],
      [1.5, -1.6],
      [1.8, 0],
      [2.4, 0],
    ],
    squash: [
      [0, 0],
      [0.3, 0.03],
      [0.6, -0.02],
      [0.9, 0.03],
      [1.2, -0.02],
      [1.5, 0.03],
      [1.8, -0.02],
      [2.4, 0],
    ],
  },
  // Look up: eyes to the ceiling, a slow scan from side to side.
  {
    duration: 4,
    front: [
      [0, 0.35],
      [4, 0.35],
    ],
    nod: [
      [0, 0.12],
      [2, 0.15],
      [4, 0.12],
    ],
    turn: [
      [0, -0.09],
      [2, 0.09],
      [4, -0.09],
    ],
    roll: [
      [0, -6],
      [2, 6],
      [4, -6],
    ],
  },
  // Sway: a pendulum, side to side.
  {
    duration: 2.6,
    front: [
      [0, 0.4],
      [2.6, 0.4],
    ],
    roll: [
      [0, -7],
      [1.3, 7],
      [2.6, -7],
    ],
    lift: [
      [0, 0],
      [0.65, -1.2],
      [1.3, 0],
      [1.95, -1.2],
      [2.6, 0],
    ],
    nod: [
      [0, 0.05],
      [2.6, 0.05],
    ],
  },
  // Peek: turns away to look round one side, then the other.
  {
    duration: 3.6,
    front: [
      [0, 0.3],
      [3.6, 0.3],
    ],
    turn: [
      [0, 0],
      [0.5, -0.24],
      [1.4, -0.24],
      [1.9, 0.22],
      [2.8, 0.22],
      [3.6, 0],
    ],
    nod: [
      [0, 0.04],
      [1, 0.08],
      [2.4, 0.08],
      [3.6, 0.04],
    ],
  },
  // Hum: a slow squash and stretch, as if it is breathing through the problem.
  {
    duration: 2.8,
    front: [
      [0, 0.55],
      [2.8, 0.55],
    ],
    squash: [
      [0, 0],
      [0.7, 0.045],
      [1.4, -0.035],
      [2.1, 0.045],
      [2.8, 0],
    ],
    nod: [
      [0, 0.06],
      [1.4, 0.1],
      [2.8, 0.06],
    ],
    lift: [
      [0, 0],
      [1.4, -1],
      [2.8, 0],
    ],
  },
];

// Happy, once, when a reply lands: a wiggle with a hop, or a turn and a hop.
const HAPPY: readonly Clip[] = [
  {
    duration: 1.5,
    turn: [
      [0, 0],
      [0.12, 0.14],
      [0.37, -0.14],
      [0.62, 0.14],
      [0.87, -0.14],
      [1.12, 0.1],
      [1.5, 0],
    ],
    lift: [
      [0, 0],
      [0.2, -7],
      [0.4, 0.5],
      [0.7, -5],
      [0.9, 0.5],
      [1.2, -2],
      [1.5, 0],
    ],
    squash: [
      [0, 0],
      [0.2, -0.04],
      [0.4, 0.05],
      [0.7, -0.03],
      [0.9, 0.04],
      [1.5, 0],
    ],
  },
  {
    duration: 1.4,
    turn: [
      [0, 0],
      [0.35, 0.3],
      [0.7, -0.3],
      [1.05, 0.08],
      [1.4, 0],
    ],
    lift: [
      [0, 0],
      [0.3, -8],
      [0.6, 0.5],
      [0.9, -3],
      [1.4, 0],
    ],
    roll: [
      [0, 0],
      [0.3, 8],
      [0.6, -4],
      [1.4, 0],
    ],
  },
];

const CLIPS: Record<MotionState, readonly Clip[]> = { idle: IDLE, thinking: THINKING, happy: HAPPY };

/** A clip switch blends from the last pose over this long. */
const BLEND_S = 0.35;
const FRAME_MS = 1000 / 30;

/** 32-bit FNV-1a, as the seeded colour and shape picks use. */
function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

/** A small seeded random source (mulberry32). */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Each agent's own way of moving, fixed by its seed. */
export interface FacePersonality {
  tempo: number;
  strength: number;
  /** The thinking clip it falls back to most. */
  habit: number;
}

export function facePersonality(seed: string): FacePersonality {
  const next = random(hash(seed));
  return {
    tempo: 0.82 + next() * 0.36,
    strength: 0.78 + next() * 0.44,
    habit: Math.floor(next() * THINKING.length),
  };
}

const ease = (t: number) => t * t * (3 - 2 * t);

function sample(track: Track | undefined, time: number): number {
  if (!track || track.length === 0) return 0;
  const first = track[0];
  if (!first || time <= first[0]) return first?.[1] ?? 0;
  for (let index = 1; index < track.length; index += 1) {
    const to = track[index];
    const from = track[index - 1];
    if (!to || !from) break;
    if (time <= to[0]) {
      const span = to[0] - from[0];
      return from[1] + (to[1] - from[1]) * ease(span > 0 ? (time - from[0]) / span : 1);
    }
  }
  return track[track.length - 1]?.[1] ?? 0;
}

interface Pose {
  turn: number;
  nod: number;
  front: number;
  roll: number;
  lift: number;
  squash: number;
}
const REST: Pose = { turn: 0, nod: 0, front: 0, roll: 0, lift: 0, squash: 0 };
const POSE_KEYS = ["turn", "nod", "front", "roll", "lift", "squash"] as const;

function clipPose(clip: Clip, time: number, strength: number): Pose {
  return {
    turn: sample(clip.turn, time) * strength,
    nod: sample(clip.nod, time) * strength,
    // How much it faces you is a stance, not a motion: the strength does not scale it.
    front: sample(clip.front, time),
    roll: sample(clip.roll, time) * strength,
    lift: sample(clip.lift, time) * strength,
    squash: sample(clip.squash, time) * strength,
  };
}

function motionState(mood: AvatarFaceMood): MotionState {
  if (mood === "working" || mood === "connecting") return "thinking";
  if (mood === "responded") return "happy";
  return "idle";
}

interface Face {
  svg: SVGSVGElement;
  bob: SVGGElement;
  personality: FacePersonality;
  next: () => number;
  state: MotionState;
  clip: Clip;
  clipIndex: number;
  /** Seconds into the clip. */
  time: number;
  /** The pose a switch blends from, and how far into the blend it is. */
  from: Pose;
  blend: number;
  last: Pose;
  onScreen: boolean;
  written: string;
  /** A face that moves only for its happy hop: it rests again once the hop ends. */
  restAfterHappy: boolean;
}

const faces = new Set<Face>();
let frame: number | undefined;
let lastTick = 0;

function pickClip(face: Face): void {
  const clips = CLIPS[face.state];
  let index: number;
  if (face.state === "thinking") {
    // Its habit half of the time, any other clip otherwise; never the same clip twice running.
    const roll = face.next();
    index = roll < 0.5 ? face.personality.habit : Math.floor(face.next() * clips.length);
    if (index === face.clipIndex && clips.length > 1) index = (index + 1) % clips.length;
  } else {
    index = Math.floor(face.next() * clips.length);
    if (index === face.clipIndex && clips.length > 1) index = (index + 1) % clips.length;
  }
  face.from = face.last;
  face.blend = 0;
  face.clipIndex = index;
  face.clip = clips[index] ?? IDLE[0] ?? { duration: 1 };
  face.time = 0;
}

function write(face: Face, pose: Pose): void {
  face.last = pose;
  const r = (value: number, digits = 3) => value.toFixed(digits);
  const key = `${r(pose.turn)}|${r(pose.nod)}|${r(pose.front, 2)}|${r(pose.roll, 1)}|${r(pose.lift, 1)}|${r(pose.squash)}`;
  if (key === face.written) return;
  face.written = key;
  const style = face.svg.style;
  style.setProperty("--face-turn", r(pose.turn));
  style.setProperty("--face-nod", r(pose.nod));
  style.setProperty("--face-front", r(pose.front, 2));
  face.bob.style.transform = `translateY(${r(pose.lift, 1)}px) rotate(${r(pose.roll, 1)}deg) scale(${r(1 + pose.squash)}, ${r(1 - pose.squash)})`;
}

function step(face: Face, seconds: number): void {
  // The pointer has the face: it eases back to its resting turn while the eyes follow the pointer.
  const looking = face.svg.closest("[data-looking]") !== null;
  face.time += seconds * face.personality.tempo;
  if (face.time >= face.clip.duration) {
    // Happy plays once, then the face idles until the mood changes, or rests if it only moved to hop.
    if (face.state === "happy") {
      if (face.restAfterHappy) {
        rest(face);
        return;
      }
      face.state = "idle";
    }
    pickClip(face);
  }
  face.blend = Math.min(1, face.blend + seconds / BLEND_S);
  const target = looking ? REST : clipPose(face.clip, face.time, face.personality.strength);
  const mix = ease(face.blend);
  const pose = { ...REST };
  for (const key of POSE_KEYS) pose[key] = face.from[key] + (target[key] - face.from[key]) * mix;
  write(face, pose);
}

function rest(face: Face): void {
  faces.delete(face);
  visibility?.unobserve(face.svg);
  face.svg.style.removeProperty("--face-turn");
  face.svg.style.removeProperty("--face-nod");
  face.svg.style.removeProperty("--face-front");
  face.bob.style.removeProperty("transform");
}

function tick(now: number): void {
  frame = undefined;
  if (!hasWork()) return;
  frame = requestAnimationFrame(tick);
  // A hidden window does not move its faces, and time does not pile up while it is hidden.
  if (document.hidden) {
    lastTick = now;
    return;
  }
  if (now - lastTick < FRAME_MS) return;
  const seconds = Math.min(0.1, (now - lastTick) / 1000);
  lastTick = now;
  for (const face of faces) if (face.onScreen) step(face, seconds);
}

function hasWork(): boolean {
  for (const face of faces) if (face.onScreen) return true;
  return false;
}

function wake(): void {
  if (frame !== undefined || !hasWork()) return;
  lastTick = performance.now();
  frame = requestAnimationFrame(tick);
}

const visibility =
  typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries) => {
        for (const entry of entries)
          for (const face of faces)
            if (face.svg === entry.target) {
              face.onScreen = entry.isIntersecting;
            }
        wake();
      })
    : undefined;

/**
 * Starts the moving of one face and returns its stop. `mood` is read again by `setMood`. A face that stops
 * keeps the pose CSS gives it at rest.
 */
export function startFaceMotion(svg: SVGSVGElement, seed: string, mood: AvatarFaceMood, restAfterHappy = false) {
  const bob = svg.querySelector<SVGGElement>(".cute-face-bob");
  if (!bob) return { setMood: () => undefined, stop: () => undefined };
  const personality = facePersonality(seed);
  const next = random(hash(`${seed}:clips`));
  const face: Face = {
    svg,
    bob,
    personality,
    next,
    state: motionState(mood),
    clip: IDLE[0] ?? { duration: 1 },
    clipIndex: -1,
    time: 0,
    from: REST,
    blend: 1,
    last: REST,
    onScreen: visibility === undefined,
    written: "",
    restAfterHappy,
  };
  pickClip(face);
  // Its own place in the first clip, so faces that start together are not in step.
  face.time = next() * face.clip.duration * 0.8;
  faces.add(face);
  visibility?.observe(svg);
  wake();
  return {
    setMood(mood: AvatarFaceMood) {
      const state = motionState(mood);
      if (state === face.state) return;
      face.state = state;
      pickClip(face);
    },
    stop() {
      rest(face);
    },
  };
}
