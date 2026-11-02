import { CUTE_FACE_EYE, CUTE_FACE_EYES, cuteFaceBody, cuteFaceClosedEyes } from "@openbot/brand/cute-face";
import { Show } from "solid-js";
import type { AvatarFaceMood, SupportedAvatarSilhouetteId } from "../../bloub-avatar";

/**
 * HoleA.I: the agent face in the Grok Bot style - a flat seeded colour and silhouette with two small
 * light pill eyes. It blinks and bobs (CSS in holeai-clean.css) only while `animated` is set. The phone
 * draws the same geometry from `@openbot/brand/cute-face`.
 */
export function CuteFace(props: {
  seed: string;
  color: string;
  shape: SupportedAvatarSilhouetteId;
  mood: AvatarFaceMood;
  animated: boolean;
  delay?: number | undefined;
}) {
  const body = () => cuteFaceBody(props.shape);
  return (
    <svg
      class="cute-face bloub-avatar-svg"
      viewBox="-64 -64 128 128"
      data-animated={props.animated ? "" : undefined}
      data-mood={props.mood}
      style={{ "--cute-face-delay": `${(props.delay ?? 0).toFixed(2)}s` }}
      aria-hidden="true"
    >
      <g class="cute-face-bob">
        <path class="cute-face-body" d={body()} style={{ fill: props.color }} />
        <Show
          when={cuteFaceClosedEyes(props.mood)}
          fallback={
            <g class="cute-face-eyes" data-look={props.mood === "waiting" ? "up" : undefined}>
              {CUTE_FACE_EYES.map((x) => (
                <OpenEye x={x} />
              ))}
            </g>
          }
        >
          {(closed) => <path class="cute-face-line" d={closed()} />}
        </Show>
        <Show when={props.mood === "asleep"}>
          <path class="cute-face-line cute-face-zz" d="M 30 -36 h 9 l -9 10 h 9" />
        </Show>
      </g>
    </svg>
  );
}

function OpenEye(props: { x: number }) {
  return (
    <ellipse class="cute-face-pupil" cx={props.x} cy={CUTE_FACE_EYE.cy} rx={CUTE_FACE_EYE.rx} ry={CUTE_FACE_EYE.ry} />
  );
}
