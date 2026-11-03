// Types for the vendored bot mark engine (engine.js, from Vincent's bot app).

export type BotMarkShape =
  | "blob"
  | "pebble"
  | "bean"
  | "egg"
  | "squircle"
  | "tablet"
  | "capsule"
  | "cylinder"
  | "hex"
  | "gem"
  | "crystal"
  | "wedge"
  | "shield"
  | "dome"
  | "arch"
  | "cloud"
  | "teardrop"
  | "leaf"
  | "square"
  | "sparkle"
  | "clover"
  | "flower"
  | "heart"
  | "house"
  | "star";

/** Seasonal shapes the engine can draw but the picker hides. */
export type BotMarkSeasonalShape = "pumpkin";

export type BotMarkLifecycleState =
  | "idle"
  | "listening"
  | "thinking"
  | "streaming"
  | "searching"
  | "reading"
  | "working"
  | "coding"
  | "running"
  | "computing"
  | "controlling"
  | "waiting"
  | "blocked"
  | "finished"
  | "failed"
  | "sleeping"
  | "waking";

export type BotMarkReactionState =
  | "happy"
  | "excited"
  | "laughing"
  | "proud"
  | "curious"
  | "playful"
  | "shy"
  | "surprised"
  | "suspicious"
  | "angry"
  | "confused"
  | "sad"
  | "drowsy"
  | "bored"
  | "scared"
  | "celebrate"
  | "approving";

export type BotMarkMorphState =
  | "orbit"
  | "radar"
  | "progress"
  | "spawning"
  | "loading"
  | "dictating"
  | "sending"
  | "receiving"
  | "uploading"
  | "writing"
  | "alerting"
  | "bouncing"
  | "powering-down";

export type BotMarkProductState = "humming" | "notifying" | "dragging";

export type BotMarkBrandState = "logo" | "showcase" | "turntable";

export type BotMarkState =
  | BotMarkLifecycleState
  | BotMarkReactionState
  | BotMarkMorphState
  | BotMarkProductState
  | BotMarkBrandState;

export type BotMarkPoke = "spin" | "bounce" | "nod";

/** A `#rrggbb` colour (any CSS colour string is passed through to SVG `fill`). */
export type BotMarkColor = string;

export interface BotMarkPokeOptions {
  /** Spin turns (rounded, at least 1). */
  turns?: number;
}

export interface BotMarkOptions {
  shape: BotMarkShape | BotMarkSeasonalShape;
  color: BotMarkColor;
  /** Default "idle". Unknown states fall back to "idle". */
  state?: BotMarkState;
  /** Varies clip choice/timing so two marks in the same state don't move in sync. Defaults to `id`. */
  seed?: string;
  /** Prefix for the SVG mask ids. Defaults to a unique `bot-mark-*` id. */
  id?: string;
  /** Eyes follow the pointer anywhere in the window. Default false. */
  followPointer?: boolean;
  /** Frame-rate cap. Default 60. */
  maxFrameRate?: number;
  /** Eye colour; omitted = eyes cut out (transparent), as in the app. */
  eyeColor?: BotMarkColor;
  /** Fixed pixel size; omitted = track the host's width with a ResizeObserver. */
  sizePx?: number;
  /** Share of the host box the body fills. Default BOT_MARK_DEFAULT_FILL (0.92). */
  fill?: number;
  /** Fixed SVG coordinate resolution (the app used 192 for agent marks). */
  resolution?: number;
  /** Default true. */
  playing?: boolean;
  /** Hover emphasis. Default false. */
  emphasized?: boolean;
  /** Always draw a still frame (as with prefers-reduced-motion). Default false. */
  isStatic?: boolean;
}

export interface BotMarkHandle {
  readonly state: BotMarkState;
  readonly shape: BotMarkShape | BotMarkSeasonalShape;
  readonly color: BotMarkColor;
  setState(state: BotMarkState): void;
  setShape(shape: BotMarkShape | BotMarkSeasonalShape): void;
  /** `eyeColor`: undefined keeps the current eye colour, null cuts the eyes out. */
  setColor(color: BotMarkColor, eyeColor?: BotMarkColor | null): void;
  /** Default "spin". Ignored under prefers-reduced-motion. */
  poke(kind?: BotMarkPoke, options?: BotMarkPokeOptions): void;
  blink(): void;
  /** Gaze target in [-1, 1] (x right, y up), or null to look ahead. */
  gaze(target: readonly [number, number] | null): void;
  setPlaying(playing: boolean): void;
  setEmphasized(emphasized: boolean): void;
  setFollowingPointer(follow: boolean): void;
  setMaxFrameRate(fps: number): void;
  /** Stops the rAF loop and observers and removes the mark from the host. */
  destroy(): void;
}

export interface BotMarkStillOptions {
  eyeColor?: BotMarkColor;
  fill?: number;
  id?: string;
}

export const BOT_MARK_SHAPES: readonly BotMarkShape[];
export const BOT_MARK_ALL_SHAPES: readonly (BotMarkShape | BotMarkSeasonalShape)[];
export const BOT_MARK_STATES: readonly BotMarkState[];
export const BOT_MARK_POKES: readonly BotMarkPoke[];
export const BOT_MARK_DEFAULT_FILL: number;

export function mountBotMark(host: HTMLElement, opts: BotMarkOptions): BotMarkHandle;

/** The resting mark as an `<svg>` string, `sizePx` square. No DOM needed. */
export function staticBotMarkSvg(
  shape: BotMarkShape | BotMarkSeasonalShape,
  color: BotMarkColor,
  sizePx: number,
  opts?: BotMarkStillOptions,
): string;

/** `staticBotMarkSvg` as a `data:image/svg+xml` URL. */
export function staticBotMarkDataUrl(
  shape: BotMarkShape | BotMarkSeasonalShape,
  color: BotMarkColor,
  sizePx: number,
  opts?: BotMarkStillOptions,
): string;
