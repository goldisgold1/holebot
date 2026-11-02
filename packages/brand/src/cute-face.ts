import type { AvatarFaceMood } from "./bloub-avatar-motion";
import softShapes from "./bot-shapes.json";

/**
 * HoleA.I: the agent face, shared by the desktop (`CuteFace.tsx`) and the phone. Each agent is a little
 * object (a mug, a bulb, a chat bubble...) with two dark pill eyes, in one flat colour. It is drawn as a
 * thick token turned a little in 3D: the outline is stacked a few times along a slant, and the eyes sit
 * on the front copy, so the face reads as solid and looking off to one side.
 *
 * A shape is the bot shape file format (`version`, `id`, `name`, `body.path`, `eyes`) in a 0..100 box,
 * so a face made in a bot avatar maker can be added here as it is.
 */
export interface BotShape {
  version: 1;
  id: string;
  name: string;
  body: { path: string };
  /** The point between the eyes, the distance from one eye's centre to the other, and a size factor. */
  eyes: { x: number; y: number; spacing: number; scale: number };
}

/** One open eye at scale 1, in the 0..100 box. */
const EYE = { width: 5.8, height: 16 } as const;

function shape(id: string, name: string, path: string, x: number, y: number, spacing = 16, scale = 1): BotShape {
  return { version: 1, id, name, body: { path }, eyes: { x, y, spacing, scale } };
}

/** Our own objects, then the soft bodies. Every outline fills most of the box, so they read as one size in a list. */
export const BOT_SHAPES: readonly [BotShape, ...BotShape[]] = [
  shape(
    "controller",
    "Controller",
    "M28 22C38 20 44 23 50 23C56 23 62 20 72 22C84 24 90 34 91 48C92 62 91 76 82 80C75 83 69 78 66 72C63 67 58 66 50 66C42 66 37 67 34 72C31 78 25 83 18 80C9 76 8 62 9 48C10 34 16 24 28 22Z",
    50,
    42,
    16,
    1.05,
  ),
  shape(
    "bubble",
    "Chat",
    "M24 20H76C84 20 88 25 88 33V61C88 69 84 73 76 73H42L27 85C25 86 24 85 24 83L26 73H24C16 73 12 69 12 61V33C12 25 16 20 24 20Z",
    50,
    46,
  ),
  shape(
    "mug",
    "Mug",
    "M23 22H67C70 22 72 24 72 27V34H76C84 34 90 41 90 50C90 59 84 66 76 66H71C69 75 62 81 53 81H37C26 81 18 74 18 63V27C18 24 20 22 23 22ZM72 43V57H75C79 57 81 54 81 50C81 46 79 43 75 43Z",
    44,
    45,
  ),
  shape(
    "bulb",
    "Bulb",
    "M50 11C69 11 84 25 84 43C84 55 77 62 71 68C68 71 66 74 66 77V80C66 84 63 87 59 87H41C37 87 34 84 34 80V77C34 74 32 71 29 68C23 62 16 55 16 43C16 25 31 11 50 11Z",
    50,
    42,
  ),
  shape(
    "pot",
    "Sprout",
    "M47 44V31C38 37 24 34 18 23C29 16 42 19 47 28V25C49 13 62 7 80 11C78 25 66 33 53 31V44H74C77 44 79 46 78 49L73 80C72 84 69 87 65 87H35C31 87 28 84 27 80L22 49C21 46 23 44 26 44Z",
    50,
    62,
    15,
  ),
  shape(
    "camera",
    "Camera",
    "M22 31H33L38 24C39 23 40 22 42 22H58C60 22 61 23 62 24L67 31H78C84 31 88 35 88 41V71C88 77 84 81 78 81H22C16 81 12 77 12 71V41C12 35 16 31 22 31Z",
    50,
    53,
  ),
  shape(
    "rocket",
    "Rocket",
    "M50 9C63 18 70 33 70 50V62L81 72C82 73 83 75 83 77V85C83 87 81 88 79 87L67 81H33L21 87C19 88 17 87 17 85V77C17 75 18 73 19 72L30 62V50C30 33 37 18 50 9Z",
    50,
    44,
    14,
    0.95,
  ),
  shape(
    "ghost",
    "Ghost",
    "M50 13C70 13 83 27 83 47V82C83 85 80 86 78 85L71 80L62 86C61 87 59 87 58 86L50 80L42 86C41 87 39 87 38 86L29 80L22 85C20 86 17 85 17 82V47C17 27 30 13 50 13Z",
    50,
    43,
  ),
  shape(
    "heart",
    "Heart",
    "M50 85C39 77 11 61 11 38C11 24 21 15 33 15C41 15 47 19 50 26C53 19 59 15 67 15C79 15 89 24 89 38C89 61 61 77 50 85Z",
    50,
    43,
  ),
  shape(
    "crown",
    "Crown",
    "M14 31C14 28 17 27 19 29L32 41L46 21C48 18 52 18 54 21L68 41L81 29C83 27 86 28 86 31L81 76C80 80 77 83 73 83H27C23 83 20 80 19 76Z",
    50,
    60,
    15,
  ),
  shape(
    "magnifier",
    "Search",
    "M43 11C61 11 75 25 75 43C75 50 73 56 69 61L85 77C88 80 88 85 85 88C82 91 77 91 74 88L58 72C54 74 49 75 43 75C25 75 11 61 11 43C11 25 25 11 43 11Z",
    43,
    41,
  ),
  shape(
    "cloud",
    "Cloud",
    "M27 79C17 79 9 71 9 61C9 52 15 45 24 43C26 31 36 21 49 21C60 21 69 28 72 38C82 39 91 47 91 58C91 70 82 79 70 79Z",
    50,
    55,
  ),
  shape(
    "screen",
    "Screen",
    "M20 18H80C85 18 88 21 88 26V63C88 68 85 71 80 71H58L61 80H67C69 80 70 81 70 83C70 85 69 86 67 86H33C31 86 30 85 30 83C30 81 31 80 33 80H39L42 71H20C15 71 12 68 12 63V26C12 21 15 18 20 18Z",
    50,
    44,
  ),
  shape(
    "house",
    "House",
    "M46 14C48 12 52 12 54 14L86 42C89 45 87 50 83 50H80V80C80 84 77 87 73 87H27C23 87 20 84 20 80V50H17C13 50 11 45 14 42Z",
    50,
    62,
    15,
  ),
  shape(
    "star",
    "Star",
    "M46 12C48 9 52 9 54 12L63 30L83 33C87 34 88 38 85 41L71 55L74 75C75 79 71 82 68 80L50 70L32 80C29 82 25 79 26 75L29 55L15 41C12 38 13 34 17 33L37 30Z",
    50,
    49,
    13,
    0.9,
  ),
  shape("pebble", "Pebble", "M50 17C74 15 89 30 89 52C89 72 73 85 50 85C27 85 11 72 11 52C11 30 26 19 50 17Z", 50, 45),
  // Soft bodies (round, puff, clover, capsule...), kept as BotShape JSON like the avatar maker exports.
  ...softShapes.map(({ id, name, body, eyes }) => shape(id, name, body.path, eyes.x, eyes.y, eyes.spacing, eyes.scale)),
];

/**
 * How the token is turned, in radians: `yaw` turns it to its right (negative: left), `pitch` tips its face
 * up. Each slice steps `yaw * TURN_STEP.x` sideways and `pitch * TURN_STEP.y` up toward the front, and the
 * whole token skews `yaw * TURN_SKEW` degrees, so a turn reads as 3D. The desktop animates the same numbers
 * in CSS (holeai-clean.css), so these factors must match it.
 */
export const TURN_STEP = { x: 1.5, y: 1.6 } as const;
export const TURN_SKEW = 15;

interface BotPose {
  yaw: number;
  pitch: number;
}

const POSES: readonly [BotPose, ...BotPose[]] = [
  { yaw: 0.23, pitch: 0.25 },
  { yaw: -0.23, pitch: 0.25 },
  { yaw: 0.28, pitch: 0.15 },
  { yaw: -0.28, pitch: 0.15 },
];

const SLICES = 12;

export interface BotSlice {
  /** Steps from the middle of the token; negative is behind it. */
  depth: number;
  /** How much this slice shrinks about the middle of the box, which rounds the rim. */
  inset: number;
  /** The whole resting transform, in the 0..100 box, for renderers that do not animate the turn. */
  transform: string;
}

export interface BotEye {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Everything a renderer needs for one agent: the outline, its stacked slices and the two eyes on the front. */
export interface BotToken {
  shape: BotShape;
  pose: BotPose;
  slices: readonly BotSlice[];
  /** The depth of the front face, which the eyes ride on (a touch in front of the last slice). */
  frontDepth: number;
  /** The resting transform of the front face. */
  front: string;
  eyes: readonly [BotEye, BotEye];
}

function seedHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly [T, ...T[]], seed: string, salt: string): T {
  return items[seedHash(`${seed}:${salt}`) % items.length] ?? items[0];
}

const round = (value: number) => Math.round(value * 100) / 100;

function sliceTransform(pose: BotPose, depth: number, inset: number) {
  // Skew about the middle of the box, step along the slant, and shrink the rim slices about the middle.
  const skew = Math.tan((pose.yaw * TURN_SKEW * Math.PI) / 180);
  const scale = 1 - inset;
  const tx = round(pose.yaw * TURN_STEP.x * depth + 50 * inset);
  const ty = round(-pose.pitch * TURN_STEP.y * depth - 50 * skew * scale + 50 * inset);
  return `matrix(${round(scale)} ${round(skew * scale)} 0 ${round(scale)} ${tx} ${ty})`;
}

export function botShapeFor(seed: string): BotShape {
  return pick(BOT_SHAPES, seed, "shape");
}

export function botToken(seed: string, shape: BotShape = botShapeFor(seed)): BotToken {
  const pose = pick(POSES, seed, "pose");
  const middle = (SLICES - 1) / 2;
  const slices = Array.from({ length: SLICES }, (_, index) => {
    const rim = Math.min(index, SLICES - 1 - index);
    const inset = rim === 0 ? 0.025 : rim === 1 ? 0.01 : 0;
    const depth = index - middle;
    return { depth, inset, transform: sliceTransform(pose, depth, inset) };
  });
  const frontDepth = middle + 1.4;
  const width = round(EYE.width * shape.eyes.scale);
  const height = round(EYE.height * shape.eyes.scale);
  const half = shape.eyes.spacing / 2;
  const eye = (cx: number): BotEye => ({
    x: round(cx - width / 2),
    y: round(shape.eyes.y - height / 2),
    width,
    height,
  });
  return {
    shape,
    pose,
    slices,
    frontDepth,
    front: sliceTransform(pose, frontDepth, 0),
    eyes: [eye(shape.eyes.x - half), eye(shape.eyes.x + half)],
  };
}

/** Shrinks a slice about the middle of the 0..100 box, without the turn. */
export function botInset(inset: number) {
  const scale = 1 - inset;
  return `matrix(${round(scale)} 0 0 ${round(scale)} ${round(50 * inset)} ${round(50 * inset)})`;
}

/** Closed eyes as one stroked path in the 0..100 box, for moods that shut them; null keeps them open. */
export function botClosedEyes(token: BotToken, mood: AvatarFaceMood) {
  if (mood !== "responded" && mood !== "asleep") return null;
  const happy = mood === "responded";
  const y = token.shape.eyes.y + (happy ? 2 : 0);
  const lift = happy ? -7 : 5;
  const w = 4.5 * token.shape.eyes.scale;
  return token.eyes
    .map((eye) => {
      const cx = round(eye.x + eye.width / 2);
      return `M ${round(cx - w)} ${y} Q ${cx} ${y + lift} ${round(cx + w)} ${y}`;
    })
    .join(" ");
}
