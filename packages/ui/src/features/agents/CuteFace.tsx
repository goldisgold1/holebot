import { createUniqueId, Match, Show, Switch } from "solid-js";
import type { AvatarMood, SupportedAvatarSilhouetteId } from "../../bloub-avatar";

/**
 * HoleA.I: a soft, round messenger face drawn in plain SVG - shaded body, big shiny eyes, blush and a
 * small mouth. It takes the seeded colour and silhouette, so every agent keeps the face it is known by;
 * the motion (blink, bob) is CSS in holeai-clean.css and runs only while `animated` is set.
 */
export function CuteFace(props: {
  seed: string;
  color: string;
  shape: SupportedAvatarSilhouetteId;
  mood: AvatarMood;
  animated: boolean;
  delay?: number | undefined;
}) {
  const shadeId = createUniqueId();
  const mouth = () => restingMouth(props.seed);
  return (
    <svg
      class="cute-face bloub-avatar-svg"
      viewBox="-64 -64 128 128"
      data-animated={props.animated ? "" : undefined}
      data-mood={props.mood}
      style={{ "--cute-face-delay": `${(props.delay ?? 0).toFixed(2)}s` }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={shadeId} cx="36%" cy="28%" r="80%">
          <stop offset="0" style={{ "stop-color": "var(--holeai-face-shine)", "stop-opacity": "0.5" }} />
          <stop offset="0.5" style={{ "stop-color": "var(--holeai-face-shine)", "stop-opacity": "0" }} />
          <stop offset="1" style={{ "stop-color": "var(--holeai-face-ink)", "stop-opacity": "0.22" }} />
        </radialGradient>
      </defs>
      <g class="cute-face-bob">
        <path class="cute-face-body" d={bodyPath(props.shape)} style={{ fill: props.color }} />
        <path d={bodyPath(props.shape)} fill={`url(#${shadeId})`} />
        <ellipse class="cute-face-blush" cx="-25" cy="13" rx="8.5" ry="5" />
        <ellipse class="cute-face-blush" cx="25" cy="13" rx="8.5" ry="5" />
        <Switch
          fallback={
            <g class="cute-face-eyes" data-look={props.mood === "waiting" ? "up" : undefined}>
              <OpenEye x={-15} />
              <OpenEye x={15} />
            </g>
          }
        >
          <Match when={props.mood === "responded"}>
            <path class="cute-face-line" d="M -21 -2 Q -15 -10 -9 -2 M 9 -2 Q 15 -10 21 -2" />
          </Match>
          <Match when={props.mood === "asleep"}>
            <path class="cute-face-line" d="M -21 -3 Q -15 3 -9 -3 M 9 -3 Q 15 3 21 -3" />
          </Match>
        </Switch>
        <Switch fallback={<path class="cute-face-line" d={mouth()} />}>
          <Match when={props.mood === "failed"}>
            <path class="cute-face-line" d="M -6 18 Q 0 12 6 18" />
          </Match>
          <Match when={props.mood === "waiting" || props.mood === "working" || props.mood === "connecting"}>
            <ellipse class="cute-face-mouth" cx="0" cy="15" rx="3.4" ry="3.8" />
          </Match>
          <Match when={props.mood === "responded"}>
            <path class="cute-face-mouth" d="M -8 11 Q 0 11 8 11 Q 7 21 0 21 Q -7 21 -8 11 Z" />
          </Match>
        </Switch>
        <Show when={props.mood === "asleep"}>
          <path class="cute-face-line cute-face-zz" d="M 30 -36 h 9 l -9 10 h 9" />
        </Show>
      </g>
    </svg>
  );
}

function OpenEye(props: { x: number }) {
  return (
    <g>
      <ellipse class="cute-face-pupil" cx={props.x} cy="-3" rx="6.8" ry="8.6" />
      <circle class="cute-face-shine" cx={props.x + 2.4} cy="-6.6" r="2.8" />
      <circle class="cute-face-shine" cx={props.x - 2.2} cy="0.6" r="1.3" />
    </g>
  );
}

// The face sits a little low on the body, which reads as younger and softer.
function bodyPath(shape: SupportedAvatarSilhouetteId) {
  switch (shape) {
    case "squircle":
      return "M 0 -44 C 34 -44 44 -34 44 0 C 44 34 34 44 0 44 C -34 44 -44 34 -44 0 C -44 -34 -34 -44 0 -44 Z";
    case "galet":
      return "M 0 -41 C 30 -41 48 -24 48 2 C 48 28 28 43 0 43 C -28 43 -48 28 -48 2 C -48 -24 -30 -41 0 -41 Z";
    case "capsule":
      return "M 0 -47 C 26 -47 40 -30 40 0 C 40 30 26 46 0 46 C -26 46 -40 30 -40 0 C -40 -30 -26 -47 0 -47 Z";
    default:
      return "M 0 -45 C 25 -45 45 -25 45 0 C 45 25 25 45 0 45 C -25 45 -45 25 -45 0 C -45 -25 -25 -45 0 -45 Z";
  }
}

// A resting agent keeps one of a few friendly mouths, picked by its seed so it never changes.
const RESTING_MOUTHS = [
  "M -7 12 Q 0 19 7 12",
  "M -8 12 Q -4 17 0 12 Q 4 17 8 12",
  "M -5 13 Q 0 17 5 13",
  "M -9 11 Q 0 21 9 11",
] as const;

function restingMouth(seed: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return RESTING_MOUTHS[(hash >>> 0) % RESTING_MOUTHS.length] ?? RESTING_MOUTHS[0];
}
