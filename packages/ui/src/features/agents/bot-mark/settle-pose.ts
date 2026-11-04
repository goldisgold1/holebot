import type { BotMarkState } from "@openbot/brand/bot-mark-engine";
import { createSignal } from "solid-js";

/**
 * HoleA.I (Vincent, Nov 3 2026): as in the bot app, a turn that ends shows its outcome on the face for a
 * moment (a finished turn cheers, a failed one slumps) and then the face rests again. A cancelled turn
 * goes straight back to rest. Keyed by avatar seed, the one id every avatar of an agent shares.
 */
export const SETTLE_POSE_MS = 8_000;

export type SettlePose = "finished" | "failed";

const [poses, setPoses] = createSignal<Readonly<Record<string, SettlePose>>>({});
/** When each agent last finished a turn, by avatar seed, for the sidebar's "Finished 3m ago". */
const [finishes, setFinishes] = createSignal<Readonly<Record<string, number>>>({});
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function clearPose(seed: string) {
  clearTimeout(timers.get(seed));
  timers.delete(seed);
  setPoses((current) => {
    if (!(seed in current)) return current;
    const { [seed]: _cleared, ...rest } = current;
    return rest;
  });
}

/** Shows `pose` on the agent's face for {@link SETTLE_POSE_MS}; `null` returns it to rest now. */
export function holdSettlePose(seed: string, pose: SettlePose | null) {
  clearPose(seed);
  if (pose === "finished") setFinishes((current) => ({ ...current, [seed]: Date.now() }));
  if (!pose) return;
  setPoses((current) => ({ ...current, [seed]: pose }));
  timers.set(
    seed,
    setTimeout(() => clearPose(seed), SETTLE_POSE_MS),
  );
}

export function settlePose(seed: string): BotMarkState | undefined {
  return poses()[seed];
}

export function finishedAt(seed: string): number | undefined {
  return finishes()[seed];
}
