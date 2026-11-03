/**
 * HoleA.I: the outfit an agent's avatar wears for its role, drawn over the avatar.
 *
 * The items are real-looking product renders (cut out, in ./outfit-items). The outfit always shows, so
 * a role reads at a glance; while the agent works, the item it holds moves (the Reel Worker snaps its
 * clapper, the Producer shouts into the megaphone, COS ticks the clipboard, ...) and the avatar bobs.
 * Everything stays inside the avatar's own box, so a row never grows or covers the next one. It is
 * decoration, hidden from screen readers.
 */

import { For, Show } from "solid-js";
import type { AgentWorkRole } from "./AgentWorkScene";
import aviatorGoggles from "./outfit-items/aviator_goggles.webp";
import beanie from "./outfit-items/beanie.webp";
import beret from "./outfit-items/beret.webp";
import bucketHat from "./outfit-items/bucket_hat.webp";
import calligraphyBrush from "./outfit-items/calligraphy_brush.webp";
import clapperboard from "./outfit-items/clapperboard.webp";
import clipboard from "./outfit-items/clipboard.webp";
import coinStack from "./outfit-items/coin_stack.webp";
import deerstalker from "./outfit-items/deerstalker.webp";
import directorSunglasses from "./outfit-items/director_sunglasses.webp";
import dumbbell from "./outfit-items/dumbbell.webp";
import generalCap from "./outfit-items/general_cap.webp";
import greenVisor from "./outfit-items/green_visor.webp";
import hairBow from "./outfit-items/hair_bow.webp";
import headphones from "./outfit-items/headphones.webp";
import headset from "./outfit-items/headset.webp";
import instantCamera from "./outfit-items/instant_camera.webp";
import keyboard from "./outfit-items/keyboard.webp";
import laptop from "./outfit-items/laptop.webp";
import lightBulb from "./outfit-items/light_bulb.webp";
import magnifyingGlass from "./outfit-items/magnifying_glass.webp";
import mailCap from "./outfit-items/mail_cap.webp";
import megaphone from "./outfit-items/megaphone.webp";
import microphone from "./outfit-items/microphone.webp";
import mortarboard from "./outfit-items/mortarboard.webp";
import openBook from "./outfit-items/open_book.webp";
import painterBeret from "./outfit-items/painter_beret.webp";
import paperPlane from "./outfit-items/paper_plane.webp";
import photoStack from "./outfit-items/photo_stack.webp";
import readingGlasses from "./outfit-items/reading_glasses.webp";
import rocket from "./outfit-items/rocket.webp";
import selfieStick from "./outfit-items/selfie_stick.webp";
import smartphone from "./outfit-items/smartphone.webp";
import squareGlasses from "./outfit-items/square_glasses.webp";
import starClip from "./outfit-items/star_clip.webp";
import sweatband from "./outfit-items/sweatband.webp";

/** One item on the 48 x 48 box laid over the avatar; `motion` is how it moves while the agent works. */
interface OutfitItem {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  motion?: "snap" | "shout" | "tilt" | "throw" | "scan" | "deal" | "tap" | "lift" | "launch" | "glow" | "beat";
}

interface Outfit {
  items: OutfitItem[];
  /** A camera or phone flash at this point while the agent works. */
  flash?: { x: number; y: number };
  /** Sound waves from the megaphone while the agent works. */
  waves?: boolean;
}

// The eyes sit near (23, 27), so glasses go there and hats just above the head; held items go at the
// lower right.
const OUTFITS: Partial<Record<AgentWorkRole, Outfit>> = {
  reel: {
    items: [
      { src: headphones, x: 1, y: 6, w: 44, h: 30 },
      { src: clapperboard, x: 28, y: 29, w: 20, h: 19, motion: "snap" },
    ],
  },
  producer: {
    items: [
      { src: beret, x: 6, y: 1, w: 30, h: 17 },
      { src: directorSunglasses, x: 11, y: 22, w: 24, h: 10 },
      { src: megaphone, x: 28, y: 30, w: 19, h: 16, motion: "shout" },
    ],
    waves: true,
  },
  cos: {
    items: [
      { src: headset, x: 1, y: 5, w: 44, h: 32 },
      { src: clipboard, x: 31, y: 27, w: 17, h: 21, motion: "tilt" },
    ],
  },
  coo: {
    items: [
      { src: hairBow, x: 28, y: 6, w: 15, h: 10 },
      { src: readingGlasses, x: 11, y: 22, w: 24, h: 10 },
      { src: laptop, x: 28, y: 31, w: 20, h: 16, motion: "tap" },
      { src: paperPlane, x: 36, y: 18, w: 12, h: 10, motion: "throw" },
    ],
  },
  analyst: {
    items: [
      { src: deerstalker, x: 6, y: 1, w: 34, h: 19 },
      { src: magnifyingGlass, x: 27, y: 27, w: 21, h: 21, motion: "scan" },
    ],
  },
  strategist: {
    items: [{ src: generalCap, x: 6, y: 1, w: 34, h: 19 }],
  },
  story: {
    items: [
      { src: beanie, x: 8, y: 0, w: 30, h: 20 },
      { src: smartphone, x: 33, y: 26, w: 14, h: 22, motion: "tilt" },
    ],
    flash: { x: 40, y: 32 },
  },
  carousel: {
    items: [
      { src: painterBeret, x: 8, y: 2, w: 30, h: 16 },
      { src: photoStack, x: 28, y: 29, w: 20, h: 19, motion: "deal" },
    ],
  },
  image: {
    items: [
      { src: bucketHat, x: 5, y: 2, w: 36, h: 18 },
      { src: instantCamera, x: 28, y: 29, w: 20, h: 19, motion: "beat" },
    ],
    flash: { x: 38, y: 34 },
  },
  publisher: {
    items: [
      { src: mailCap, x: 7, y: 2, w: 32, h: 17 },
      { src: paperPlane, x: 29, y: 30, w: 19, h: 16, motion: "throw" },
    ],
  },
  coder: {
    items: [
      { src: squareGlasses, x: 11, y: 22, w: 24, h: 10 },
      { src: keyboard, x: 25, y: 34, w: 23, h: 13, motion: "tap" },
    ],
  },
  warmup: {
    items: [
      { src: sweatband, x: 6, y: 10, w: 34, h: 10 },
      { src: dumbbell, x: 29, y: 35, w: 19, h: 12, motion: "lift" },
    ],
  },
  growth: {
    items: [
      { src: aviatorGoggles, x: 8, y: 7, w: 30, h: 13 },
      { src: rocket, x: 33, y: 24, w: 14, h: 23, motion: "launch" },
    ],
  },
  finances: {
    items: [
      { src: greenVisor, x: 5, y: 6, w: 36, h: 15 },
      { src: coinStack, x: 30, y: 32, w: 18, h: 15, motion: "beat" },
    ],
  },
  voice: {
    items: [{ src: microphone, x: 30, y: 23, w: 18, h: 25, motion: "tilt" }],
  },
  thinking: {
    items: [{ src: lightBulb, x: 33, y: 0, w: 14, h: 18, motion: "glow" }],
  },
  chinese: {
    items: [{ src: calligraphyBrush, x: 26, y: 28, w: 22, h: 20, motion: "tilt" }],
  },
  english: {
    items: [
      { src: mortarboard, x: 6, y: 0, w: 34, h: 19 },
      { src: openBook, x: 27, y: 32, w: 21, h: 15, motion: "tilt" },
    ],
  },
  selfie: {
    items: [
      { src: starClip, x: 6, y: 9, w: 11, h: 11 },
      { src: selfieStick, x: 30, y: 20, w: 18, h: 28, motion: "tilt" },
    ],
    flash: { x: 41, y: 26 },
  },
};

/**
 * A dressed agent wears the same soft pebble body, so its hat sits on top and its glasses on its eyes;
 * the house, crown and cloud silhouettes put them in the wrong place.
 */
export const outfitBodyShape = (role: AgentWorkRole) => (OUTFITS[role] ? ("galet" as const) : undefined);

export function AgentOutfit(props: { role: AgentWorkRole; working: boolean }) {
  return (
    <Show when={OUTFITS[props.role]}>
      {(outfit) => (
        <svg
          class="agent-outfit"
          viewBox="0 0 48 48"
          data-role={props.role}
          data-working={props.working ? "" : undefined}
          aria-hidden="true"
        >
          <For each={outfit().items}>
            {(item) => (
              <image
                class="ao-item"
                data-motion={item.motion}
                href={item.src}
                x={item.x}
                y={item.y}
                width={item.w}
                height={item.h}
                preserveAspectRatio="xMidYMid meet"
              />
            )}
          </For>
          <Show when={outfit().waves}>
            <path class="ao-wave" d="M47 35a6 6 0 0 1 0 8" />
            <path class="ao-wave ao-late" d="M49.5 32.5a10 10 0 0 1 0 13" />
          </Show>
          <Show when={outfit().flash}>
            {(flash) => <circle class="ao-flash" cx={flash().x} cy={flash().y} r="6" />}
          </Show>
        </svg>
      )}
    </Show>
  );
}

/** What crosses the row while the agent works: film, sound waves, typed lines, photos, a flight path... */
type StripTrail = "film" | "waves" | "lines" | "photos" | "dashes" | "sparkle" | "bars";

interface WorkStripScene {
  /** The item doing the job, and how it moves along the row. */
  actor?: { src: string; move: "stay" | "travel" | "sweep" | "lift" };
  trail: StripTrail;
  /** The picture the "photos" trail deals out. */
  photo?: string;
}

const STRIP_COUNTS: Readonly<Record<StripTrail, number>> = {
  film: 1,
  waves: 3,
  lines: 3,
  photos: 4,
  dashes: 1,
  sparkle: 5,
  bars: 5,
};

const WORK_STRIPS: Partial<Record<AgentWorkRole, WorkStripScene>> = {
  reel: { actor: { src: clapperboard, move: "stay" }, trail: "film" },
  producer: { actor: { src: megaphone, move: "stay" }, trail: "waves" },
  cos: { actor: { src: clipboard, move: "stay" }, trail: "lines" },
  coo: { actor: { src: laptop, move: "stay" }, trail: "lines" },
  analyst: { actor: { src: magnifyingGlass, move: "sweep" }, trail: "film" },
  strategist: { trail: "bars" },
  story: { actor: { src: smartphone, move: "stay" }, trail: "photos", photo: photoStack },
  carousel: { actor: { src: photoStack, move: "stay" }, trail: "photos", photo: photoStack },
  image: { actor: { src: instantCamera, move: "stay" }, trail: "photos", photo: photoStack },
  publisher: { actor: { src: paperPlane, move: "travel" }, trail: "dashes" },
  coder: { actor: { src: keyboard, move: "stay" }, trail: "lines" },
  warmup: { actor: { src: dumbbell, move: "lift" }, trail: "bars" },
  growth: { actor: { src: rocket, move: "travel" }, trail: "dashes" },
  finances: { actor: { src: coinStack, move: "stay" }, trail: "sparkle" },
  voice: { actor: { src: microphone, move: "stay" }, trail: "waves" },
  thinking: { actor: { src: lightBulb, move: "stay" }, trail: "sparkle" },
  chinese: { actor: { src: calligraphyBrush, move: "travel" }, trail: "lines" },
  english: { actor: { src: openBook, move: "stay" }, trail: "lines" },
  selfie: { actor: { src: selfieStick, move: "stay" }, trail: "sparkle" },
};

export const hasWorkStrip = (role: AgentWorkRole) => WORK_STRIPS[role] !== undefined;

/** The agent's job, played across its row in place of the chat preview while it works. */
export function WorkStrip(props: { role: AgentWorkRole }) {
  return (
    <Show when={WORK_STRIPS[props.role]}>
      {(scene) => (
        <span class="work-strip" data-role={props.role} data-trail={scene().trail} aria-hidden="true">
          <span class="work-strip-trail">
            <For each={Array.from({ length: STRIP_COUNTS[scene().trail] }, (_, index) => index)}>
              {(index) => (
                <span
                  class="work-strip-bit"
                  style={{
                    "--bit": String(index),
                    ...(scene().photo ? { "background-image": `url("${scene().photo}")` } : {}),
                  }}
                />
              )}
            </For>
          </span>
          <Show when={scene().actor}>
            {(actor) => (
              <span
                class="work-strip-actor"
                data-move={actor().move}
                style={{ "background-image": `url("${actor().src}")` }}
              />
            )}
          </Show>
        </span>
      )}
    </Show>
  );
}
