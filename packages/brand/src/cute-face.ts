import type { SupportedAvatarSilhouetteId } from "./bloub-avatar";
import type { AvatarFaceMood } from "./bloub-avatar-motion";

/**
 * HoleA.I: the agent face in the Grok Bot style, shared by the desktop (`CuteFace.tsx`) and the phone.
 * Drawn in a -64..64 box: one flat colour from the seed, a soft silhouette, two small light pill eyes and
 * no mouth, so the face stays calm and clean at list sizes.
 */
export const CUTE_FACE_EYES = [-12, 12] as const;
export const CUTE_FACE_EYE = { cy: -4, rx: 5, ry: 8.5 } as const;

export function cuteFaceBody(shape: SupportedAvatarSilhouetteId) {
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

/** Closed eyes, as one stroked path, for moods that shut them; null keeps them open. */
export function cuteFaceClosedEyes(mood: AvatarFaceMood) {
  if (mood === "responded") return "M -17 -2 Q -12 -9 -7 -2 M 7 -2 Q 12 -9 17 -2";
  if (mood === "asleep") return "M -17 -4 Q -12 1 -7 -4 M 7 -4 Q 12 1 17 -4";
  return null;
}
