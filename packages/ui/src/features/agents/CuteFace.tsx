import { botClosedEyes, botInset, botToken } from "@openbot/brand/cute-face";
import { createEffect, createMemo, For, onCleanup, Show } from "solid-js";
import type { AvatarFaceMood, SupportedAvatarSilhouetteId } from "../../bloub-avatar";
import { startFaceMotion } from "./face-motion";

/**
 * HoleA.I: the agent face - a little object in one flat seeded colour, drawn as a thick token turned a
 * touch in 3D, with two dark pill eyes on its front. It blinks and glances (CSS in holeai-clean.css) only
 * while `animated` is set. The phone draws the same token from `@openbot/brand/cute-face`.
 */
export function CuteFace(props: {
  seed: string;
  color: string;
  /** Kept for callers; the object comes from the seed. */
  shape?: SupportedAvatarSilhouetteId;
  mood: AvatarFaceMood;
  animated: boolean;
  delay?: number | undefined;
}) {
  const token = createMemo(() => botToken(props.seed));
  // The turn is CSS (holeai-clean.css): every slice steps by its depth times the live yaw and pitch, so the
  // token turns in 3D as the moods animate them. These are its resting numbers.
  const style = () => ({
    "--cute-face-delay": `${(props.delay ?? 0).toFixed(2)}s`,
    "--face-base-yaw": String(token().pose.yaw),
    "--face-base-pitch": String(token().pose.pitch),
  });
  // The turn, nod and body motion come from one shared loop (face-motion.ts), only while the face is
  // animated and on screen. Each agent moves its own way, from its seed.
  let svg: SVGSVGElement | undefined;
  let motion: ReturnType<typeof startFaceMotion> | undefined;
  // A resting face still hops once when a reply lands, then rests again.
  createEffect(
    () => [props.animated || props.mood === "responded", props.seed] as const,
    ([moving, seed]) => {
      motion?.stop();
      motion = moving && svg ? startFaceMotion(svg, seed, props.mood, !props.animated) : undefined;
    },
  );
  createEffect(
    () => props.mood,
    (mood) => motion?.setMood(mood),
  );
  onCleanup(() => motion?.stop());
  const slices = (className: string, fill?: string) => (
    <g class={className} style={fill ? { fill } : undefined}>
      <For each={token().slices}>
        {(slice) => (
          <path
            class="cute-face-slice"
            d={token().shape.body.path}
            transform={botInset(slice.inset)}
            fill-rule="evenodd"
            style={{ "--face-depth": String(slice.depth) }}
          />
        )}
      </For>
    </g>
  );
  return (
    <svg
      ref={svg}
      class="cute-face bloub-avatar-svg"
      viewBox="-64 -64 128 128"
      data-animated={props.animated ? "" : undefined}
      data-mood={props.mood}
      style={style()}
      aria-hidden="true"
    >
      <g class="cute-face-bob">
        <g transform="translate(-50 -50)">
          <g class="cute-face-turn">
            {/* The outline goes round the whole token, so it is drawn under all the slices, not per slice. */}
            {slices("cute-face-rim")}
            {slices("cute-face-body", props.color)}
            <g class="cute-face-slice" style={{ "--face-depth": String(token().frontDepth) }}>
              <Show
                when={botClosedEyes(token(), props.mood)}
                fallback={
                  <g class="cute-face-eyes" data-look={props.mood === "waiting" ? "up" : undefined}>
                    <For each={token().eyes}>
                      {(eye) => (
                        <rect
                          class="cute-face-pupil"
                          x={eye.x}
                          y={eye.y}
                          width={eye.width}
                          height={eye.height}
                          rx={eye.width / 2}
                        />
                      )}
                    </For>
                  </g>
                }
              >
                {(closed) => <path class="cute-face-line" d={closed()} />}
              </Show>
            </g>
          </g>
          <Show when={props.mood === "asleep"}>
            <path class="cute-face-line cute-face-zz" d="M 80 12 h 8 l -8 9 h 8" />
          </Show>
        </g>
      </g>
    </svg>
  );
}
