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

// Measured on the round body: it spans x 2.6-44.4 and y 8-41 of the 48 box, and its eyes centre near
// (25, 20.5). Hats sit with their brim on the brow, glasses on the eyes, and held items stay inside the
// body's lower right. Each box keeps its item's own proportions, so nothing stretches or floats.
const OUTFITS: Partial<Record<AgentWorkRole, Outfit>> = {
  reel: {
    items: [
      { src: headphones, x: 3.5, y: -7, w: 40, h: 42.8 },
      { src: clapperboard, x: 30, y: 28, w: 15, h: 17, motion: "snap" },
    ],
  },
  producer: {
    items: [
      { src: beret, x: 8, y: -3.4, w: 28, h: 17.4 },
      { src: directorSunglasses, x: 14, y: 16.8, w: 22, h: 7.5 },
      { src: megaphone, x: 29, y: 30, w: 17, h: 13.8, motion: "shout" },
    ],
    waves: true,
  },
  cos: {
    items: [
      { src: headset, x: 5.5, y: -6, w: 36, h: 46 },
      { src: clipboard, x: 33, y: 27, w: 12, h: 17.4, motion: "tilt" },
    ],
  },
  coo: {
    items: [
      { src: hairBow, x: 31, y: 4, w: 11, h: 11.4 },
      { src: readingGlasses, x: 15, y: 16.7, w: 20, h: 7.6 },
      { src: laptop, x: 30, y: 31, w: 16, h: 12.8, motion: "tap" },
    ],
  },
  analyst: {
    items: [
      { src: deerstalker, x: 10.5, y: -6.3, w: 26, h: 21.3 },
      { src: magnifyingGlass, x: 30, y: 30, w: 16, h: 14.2, motion: "scan" },
    ],
  },
  strategist: {
    items: [{ src: generalCap, x: 9.5, y: -4.6, w: 28, h: 19.6 }],
  },
  story: {
    items: [
      { src: beanie, x: 13.5, y: -8.8, w: 20, h: 25.8 },
      { src: smartphone, x: 35, y: 26, w: 9, h: 18.3, motion: "tilt" },
    ],
    flash: { x: 39.5, y: 33 },
  },
  carousel: {
    items: [
      { src: painterBeret, x: 9.5, y: -3.9, w: 28, h: 17.9 },
      { src: photoStack, x: 30, y: 31, w: 16, h: 12.6, motion: "deal" },
    ],
  },
  image: {
    items: [
      { src: bucketHat, x: 7.5, y: -6.8, w: 32, h: 21.8 },
      { src: instantCamera, x: 34, y: 27, w: 11, h: 17, motion: "beat" },
    ],
    flash: { x: 39.5, y: 32 },
  },
  publisher: {
    items: [
      { src: mailCap, x: 9.5, y: -5.4, w: 28, h: 20.4 },
      { src: paperPlane, x: 30, y: 33, w: 16, h: 10, motion: "throw" },
    ],
  },
  coder: {
    items: [
      { src: squareGlasses, x: 15, y: 17.1, w: 20, h: 6.8 },
      { src: keyboard, x: 26, y: 35, w: 20, h: 9.4, motion: "tap" },
    ],
  },
  warmup: {
    items: [
      { src: sweatband, x: 6.5, y: 3.2, w: 34, h: 15.6 },
      { src: dumbbell, x: 30, y: 37, w: 16, h: 6.6, motion: "lift" },
    ],
  },
  growth: {
    items: [
      { src: aviatorGoggles, x: 11.5, y: 4, w: 24, h: 11 },
      { src: rocket, x: 37, y: 27, w: 8, h: 16.5, motion: "launch" },
    ],
  },
  finances: {
    items: [
      { src: greenVisor, x: 7.5, y: -8, w: 32, h: 25 },
      { src: coinStack, x: 32, y: 32, w: 13, h: 12, motion: "beat" },
    ],
  },
  voice: {
    items: [{ src: microphone, x: 37, y: 26, w: 7, h: 18.7, motion: "tilt" }],
  },
  thinking: {
    items: [{ src: lightBulb, x: 36, y: -3, w: 9, h: 15.8, motion: "glow" }],
  },
  chinese: {
    items: [{ src: calligraphyBrush, x: 31, y: 29, w: 15, h: 15.2, motion: "tilt" }],
  },
  english: {
    items: [
      { src: mortarboard, x: 8.5, y: -5.8, w: 30, h: 19.8 },
      { src: openBook, x: 30, y: 31, w: 16, h: 13.6, motion: "tilt" },
    ],
  },
  selfie: {
    items: [
      { src: starClip, x: 8, y: 9, w: 8, h: 7.3 },
      { src: selfieStick, x: 36, y: 25, w: 9, h: 19, motion: "tilt" },
    ],
    flash: { x: 40.5, y: 29 },
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
            <path class="ao-wave" d="M47 33a5 5 0 0 1 0 7" />
            <path class="ao-wave ao-late" d="M49.5 31a8 8 0 0 1 0 11" />
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
