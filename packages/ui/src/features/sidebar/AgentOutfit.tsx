/**
 * HoleA.I: the outfit an agent's avatar wears for its role, drawn over the avatar.
 *
 * The items are real-looking product renders (cut out, in ./outfit-items). The outfit always shows, so
 * a role reads at a glance; while the agent works, the item it holds moves (the Reel Worker snaps its
 * clapper, the Producer shouts into the megaphone, COS ticks the clipboard, ...) and the avatar bobs.
 * Everything stays inside the avatar's own box, so a row never grows or covers the next one. It is
 * decoration, hidden from screen readers.
 */

import { createSignal, For, onCleanup, Show } from "solid-js";
import type { AgentWorkRole } from "./AgentWorkScene";
import aviatorGoggles from "./outfit-items/aviator_goggles.webp";
import beanie from "./outfit-items/beanie.webp";
import beret from "./outfit-items/beret.webp";
import bucketHat from "./outfit-items/bucket_hat.webp";
import calligraphyBrush from "./outfit-items/calligraphy_brush.webp";
import chefHat from "./outfit-items/chef_hat.webp";
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
import whisk from "./outfit-items/whisk.webp";

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

// Measured on the round side-looking body: it spans x 5-44 and y 11-50 of the 48 box, and its eyes centre
// near (31.5, 24.5). Hats sit with their brim on the brow, glasses on the eyes, and held items stay inside the
// body's lower right. Each box keeps its item's own proportions, so nothing stretches or floats.
const OUTFITS: Partial<Record<AgentWorkRole, Outfit>> = {
  reel: {
    items: [
      { src: headphones, x: 4.5, y: -4, w: 40, h: 42.8 },
      { src: clapperboard, x: 30, y: 32, w: 15, h: 17, motion: "snap" },
    ],
  },
  producer: {
    items: [
      { src: beret, x: 10, y: -0.9, w: 28, h: 17.4 },
      { src: directorSunglasses, x: 20.5, y: 17.8, w: 22, h: 7.5 },
      { src: megaphone, x: 29, y: 34, w: 17, h: 13.8, motion: "shout" },
    ],
    waves: true,
  },
  cos: {
    items: [
      { src: headset, x: 6.5, y: -3, w: 36, h: 46 },
      { src: clipboard, x: 33, y: 31, w: 12, h: 17.4, motion: "tilt" },
    ],
  },
  coo: {
    items: [
      { src: hairBow, x: 33, y: 6.5, w: 11, h: 11.4 },
      { src: readingGlasses, x: 21.5, y: 17.7, w: 20, h: 7.6 },
      { src: laptop, x: 30, y: 35, w: 16, h: 12.8, motion: "tap" },
    ],
  },
  analyst: {
    items: [
      { src: deerstalker, x: 12.5, y: -3.8, w: 26, h: 21.3 },
      { src: magnifyingGlass, x: 30, y: 34, w: 16, h: 14.2, motion: "scan" },
    ],
  },
  strategist: {
    items: [{ src: generalCap, x: 11.5, y: -2.1, w: 28, h: 19.6 }],
  },
  story: {
    items: [
      { src: beanie, x: 15.5, y: -6.3, w: 20, h: 25.8 },
      { src: smartphone, x: 35, y: 30, w: 9, h: 18.3, motion: "tilt" },
    ],
    flash: { x: 39.5, y: 37 },
  },
  carousel: {
    items: [
      { src: painterBeret, x: 11.5, y: -1.4, w: 28, h: 17.9 },
      { src: photoStack, x: 30, y: 35, w: 16, h: 12.6, motion: "deal" },
    ],
  },
  image: {
    items: [
      { src: bucketHat, x: 9.5, y: -4.3, w: 32, h: 21.8 },
      { src: instantCamera, x: 34, y: 31, w: 11, h: 17, motion: "beat" },
    ],
    flash: { x: 39.5, y: 36 },
  },
  publisher: {
    items: [
      { src: mailCap, x: 11.5, y: -2.9, w: 28, h: 20.4 },
      { src: paperPlane, x: 30, y: 37, w: 16, h: 10, motion: "throw" },
    ],
  },
  coder: {
    items: [
      { src: squareGlasses, x: 21.5, y: 18.1, w: 20, h: 6.8 },
      { src: keyboard, x: 26, y: 39, w: 20, h: 9.4, motion: "tap" },
    ],
  },
  warmup: {
    items: [
      { src: sweatband, x: 7.5, y: 6.2, w: 34, h: 15.6 },
      { src: dumbbell, x: 30, y: 41, w: 16, h: 6.6, motion: "lift" },
    ],
  },
  growth: {
    items: [
      { src: aviatorGoggles, x: 19.5, y: 6.5, w: 24, h: 11 },
      { src: rocket, x: 37, y: 31, w: 8, h: 16.5, motion: "launch" },
    ],
  },
  finances: {
    items: [
      { src: greenVisor, x: 9.5, y: -5.5, w: 32, h: 25 },
      { src: coinStack, x: 32, y: 36, w: 13, h: 12, motion: "beat" },
    ],
  },
  voice: {
    items: [{ src: microphone, x: 37, y: 30, w: 7, h: 18.7, motion: "tilt" }],
  },
  thinking: {
    items: [{ src: lightBulb, x: 38, y: -0.5, w: 9, h: 15.8, motion: "glow" }],
  },
  chinese: {
    items: [{ src: calligraphyBrush, x: 31, y: 33, w: 15, h: 15.2, motion: "tilt" }],
  },
  english: {
    items: [
      { src: mortarboard, x: 10.5, y: -3.3, w: 30, h: 19.8 },
      { src: openBook, x: 30, y: 35, w: 16, h: 13.6, motion: "tilt" },
    ],
  },
  selfie: {
    items: [
      { src: starClip, x: 10, y: 11.5, w: 8, h: 7.3 },
      { src: selfieStick, x: 36, y: 29, w: 9, h: 19, motion: "tilt" },
    ],
    flash: { x: 40.5, y: 33 },
  },
  chef: {
    items: [
      { src: chefHat, x: 18, y: -9.5, w: 17, h: 27.2 },
      { src: whisk, x: 31, y: 34, w: 14, h: 12.8, motion: "deal" },
    ],
  },
};

// Every dressed agent wears the round body (Vincent's pick) in its own colour; the outfit tells roles apart.
export const outfitBodyShape = (role: AgentWorkRole) => (OUTFITS[role] ? ("cercle" as const) : undefined);

/** Where the face actually is in the 48 box: its body's box and the middle of its eyes. */
interface FaceFit {
  x: number;
  y: number;
  w: number;
  h: number;
  eyeX: number;
  eyeY: number;
}

// The items above were placed on the round body (x 5-44, y 11-50, eyes near 31.5, 24.5).
const REFERENCE_FACE: FaceFit = { x: 5, y: 11, w: 39, h: 39, eyeX: 31.5, eyeY: 24.5 };

/**
 * HoleA.I (Vincent): each agent's face has its own shape (a tall pill, a wedge, ...), so the outfit is fitted to
 * the face drawn next to it: the body's box and the eyes are read off the rendered mark.
 */
function measureFace(outfit: SVGSVGElement): FaceFit | undefined {
  const box = outfit.parentElement?.getBoundingClientRect();
  const mark = outfit.parentElement?.querySelector<SVGSVGElement>("[data-bot-mark] svg");
  const body = mark?.querySelector<SVGUseElement>("use");
  if (!box || !mark || !body || box.width === 0) return undefined;
  const unit = 48 / box.width;
  const rect = body.getBoundingClientRect();
  if (rect.width === 0) return undefined;
  const face = {
    x: (rect.left - box.left) * unit,
    y: (rect.top - box.top) * unit,
    w: rect.width * unit,
    h: rect.height * unit,
  };
  // The eyes are holes in the body's mask, in the space of the group that holds the body.
  const group = body.parentNode;
  const toScreen = group instanceof SVGGraphicsElement ? group.getScreenCTM() : null;
  const eyes = [...mark.querySelectorAll<SVGPathElement>("mask path")].flatMap((path) => {
    const b = path.getBBox();
    if (!toScreen || b.width === 0) return [];
    const point = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(toScreen);
    return [{ x: (point.x - box.left) * unit, y: (point.y - box.top) * unit }];
  });
  const middle = (axis: "x" | "y", fallback: number) =>
    eyes.length ? eyes.reduce((sum, eye) => sum + eye[axis], 0) / eyes.length : fallback;
  return {
    ...face,
    eyeX: middle("x", face.x + face.w * 0.68),
    eyeY: middle("y", face.y + face.h * 0.35),
  };
}

/** Moves an item from the round body onto `face`: hats ride its top, glasses its eyes, held items its lower right. */
function fitItem(item: OutfitItem, face: FaceFit): OutfitItem {
  const ref = REFERENCE_FACE;
  const scale = face.w / ref.w;
  const w = item.w * scale;
  const h = item.h * scale;
  const centreY = item.y + item.h / 2;
  if (item.motion) {
    return {
      ...item,
      w,
      h,
      x: face.x + face.w + (item.x - ref.x - ref.w) * scale,
      y: face.y + face.h + (item.y - ref.y - ref.h) * scale,
    };
  }
  if (Math.abs(centreY - ref.eyeY) < 6 && item.h < 12) {
    return { ...item, w, h, x: face.eyeX + (item.x - ref.eyeX) * scale, y: face.eyeY + (item.y - ref.eyeY) * scale };
  }
  // Headwear: tall wraps (headphones, a headset) also stretch to the face's height.
  const tall = item.h > ref.h * 0.6;
  const vertical = tall ? face.h / ref.h : scale;
  return {
    ...item,
    w,
    h: item.h * vertical,
    x: face.x + (item.x - ref.x) * scale,
    y: face.y + (item.y - ref.y) * vertical,
  };
}

/** The outfit goes on only while the agent works (Vincent): an idle agent is just its round body. */
const attribute = (value: string | number) => String(value).replace(/[&"<>]/gu, (char) => `&#${char.charCodeAt(0)};`);

/** One outfit item as SVG markup, at the place fitted to the face. */
function outfitImageMarkup(item: OutfitItem, place: OutfitItem): string {
  const motion = item.motion ? ` data-motion="${attribute(item.motion)}"` : "";
  return `<image class="ao-item"${motion} href="${attribute(item.src)}" x="${attribute(place.x)}" y="${attribute(place.y)}" width="${attribute(place.w)}" height="${attribute(place.h)}" preserveAspectRatio="xMidYMid meet"></image>`;
}

export function AgentOutfit(props: { role: AgentWorkRole; working: boolean }) {
  const [face, setFace] = createSignal<FaceFit | undefined>();
  let frame = 0;
  // The mark draws its first frame after mounting, so the face is read once that frame is up.
  const fit = (outfit: SVGSVGElement) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setFace(measureFace(outfit)));
    });
  };
  onCleanup(() => cancelAnimationFrame(frame));
  const placed = (item: OutfitItem) => {
    const current = face();
    return current ? fitItem(item, current) : item;
  };
  return (
    <Show when={props.working ? OUTFITS[props.role] : undefined}>
      {(outfit) => (
        <svg
          ref={fit}
          class="agent-outfit"
          viewBox="0 0 48 48"
          data-role={props.role}
          data-working={props.working ? "" : undefined}
          aria-hidden="true"
        >
          <For each={outfit().items}>
            {(item) => (
              // The web build's template check reads a JSX <image> as HTML <img> and fails, so the
              // image goes in as SVG markup. Every value is the app's own outfit data.
              <g innerHTML={outfitImageMarkup(item, placed(item))} />
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
  /** Little emoji the job throws off: they pop up, float away or rain down along the row. */
  pops?: { chars: string[]; motion: "pop" | "float" | "drop" };
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
  reel: {
    actor: { src: clapperboard, move: "stay" },
    trail: "film",
    pops: { chars: ["✂", "✦", "✦"], motion: "pop" },
  },
  producer: {
    actor: { src: megaphone, move: "stay" },
    trail: "waves",
    pops: { chars: ["★", "✦", "★"], motion: "float" },
  },
  cos: { actor: { src: clipboard, move: "stay" }, trail: "lines", pops: { chars: ["✓", "✓", "✓"], motion: "pop" } },
  coo: { actor: { src: laptop, move: "stay" }, trail: "lines", pops: { chars: ["♥", "✉", "♥"], motion: "float" } },
  analyst: {
    actor: { src: magnifyingGlass, move: "sweep" },
    trail: "film",
    pops: { chars: ["✦", "★", "✓"], motion: "pop" },
  },
  strategist: { trail: "bars", pops: { chars: ["♛"], motion: "drop" } },
  story: {
    actor: { src: smartphone, move: "stay" },
    trail: "photos",
    photo: photoStack,
    pops: { chars: ["✦", "♥", "✦"], motion: "float" },
  },
  carousel: {
    actor: { src: photoStack, move: "stay" },
    trail: "photos",
    photo: photoStack,
    pops: { chars: ["✦", "✧", "✦"], motion: "pop" },
  },
  image: {
    actor: { src: instantCamera, move: "stay" },
    trail: "photos",
    photo: photoStack,
    pops: { chars: ["✧", "✦", "✧"], motion: "pop" },
  },
  publisher: {
    actor: { src: paperPlane, move: "travel" },
    trail: "dashes",
    pops: { chars: ["✉", "✦", "✉"], motion: "float" },
  },
  coder: { actor: { src: keyboard, move: "stay" }, trail: "lines", pops: { chars: ["✓", "✦", "✓"], motion: "pop" } },
  warmup: {
    actor: { src: dumbbell, move: "lift" },
    trail: "bars",
    pops: { chars: ["✦", "↑", "✦"], motion: "float" },
  },
  growth: {
    actor: { src: rocket, move: "travel" },
    trail: "dashes",
    pops: { chars: ["★", "↗", "✦", "★"], motion: "float" },
  },
  finances: {
    actor: { src: coinStack, move: "stay" },
    trail: "sparkle",
    pops: { chars: ["$", "$", "$", "$"], motion: "drop" },
  },
  voice: {
    actor: { src: microphone, move: "stay" },
    trail: "waves",
    pops: { chars: ["♪", "♫", "♪"], motion: "float" },
  },
  thinking: {
    actor: { src: lightBulb, move: "stay" },
    trail: "sparkle",
    pops: { chars: ["?", "!", "✦"], motion: "float" },
  },
  chinese: {
    actor: { src: calligraphyBrush, move: "travel" },
    trail: "lines",
    pops: { chars: ["✿", "✦", "✿"], motion: "float" },
  },
  english: {
    actor: { src: openBook, move: "stay" },
    trail: "lines",
    pops: { chars: ["A", "B", "C"], motion: "float" },
  },
  selfie: {
    actor: { src: selfieStick, move: "stay" },
    trail: "sparkle",
    pops: { chars: ["♥", "✦", "♥"], motion: "float" },
  },
  chef: { actor: { src: whisk, move: "stay" }, trail: "sparkle", pops: { chars: ["♨", "✦", "♨"], motion: "float" } },
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
          <Show when={scene().pops}>
            {(pops) => (
              <For each={pops().chars}>
                {(char, index) => (
                  <span
                    class="work-strip-pop"
                    data-motion={pops().motion}
                    style={{ "--pop": String(index()), "--pops": String(pops().chars.length) }}
                  >
                    {`${char}︎`}
                  </span>
                )}
              </For>
            )}
          </Show>
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

/** A pinned tile has no row to play its job across, so its emoji float up around the avatar instead. */
export function WorkPops(props: { role: AgentWorkRole }) {
  return (
    <Show when={WORK_STRIPS[props.role]?.pops}>
      {(pops) => (
        <span class="pinned-pops" aria-hidden="true">
          <For each={pops().chars}>
            {(char, index) => (
              <span
                class="work-strip-pop"
                data-motion="float"
                style={{ "--pop": String(index()), "--pops": String(pops().chars.length) }}
              >
                {`${char}︎`}
              </span>
            )}
          </For>
        </span>
      )}
    </Show>
  );
}
