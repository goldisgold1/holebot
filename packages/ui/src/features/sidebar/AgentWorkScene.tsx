/**
 * HoleA.I: an agent's role, read from its name, and the Reels a spawned Reel Worker makes.
 *
 * The role picks the outfit its avatar wears (AgentOutfit); a Reel Worker also lists the Reels it
 * makes under its row, with the board stage each one is on.
 */

import type { ReelFactoryLive } from "@openbot/contracts/ipc";
import { For } from "solid-js";
import { useText } from "../../text";

export type AgentWorkRole =
  | "reel"
  | "cos"
  | "coo"
  | "producer"
  | "analyst"
  | "publisher"
  | "image"
  | "carousel"
  | "story"
  | "warmup"
  | "growth"
  | "strategist"
  | "coder"
  | "finances"
  | "voice"
  | "thinking"
  | "chinese"
  | "english"
  | "selfie"
  | "chef"
  | "general";

const ROLE_NAMES: ReadonlyArray<readonly [RegExp, AgentWorkRole]> = [
  [/^reel worker\b/i, "reel"],
  [/^cos\b|chief of staff/i, "cos"],
  [/^rosie\b|\bcoo\b/i, "coo"],
  [/^(reels? )?producer\b/i, "producer"],
  [/^analyst\b/i, "analyst"],
  [/^publisher\b/i, "publisher"],
  [/^image producer\b/i, "image"],
  [/^carousel\b/i, "carousel"],
  [/^story\b/i, "story"],
  [/^warm-?up\b/i, "warmup"],
  [/^growth\b/i, "growth"],
  [/^coder/i, "coder"],
  [/^strategist\b/i, "strategist"],
  [/^financ/i, "finances"],
  [/^voice coach\b/i, "voice"],
  [/^thinking coach\b/i, "thinking"],
  [/^chinese coach\b/i, "chinese"],
  [/^english coach\b/i, "english"],
  [/^selfie\b/i, "selfie"],
  [/^chef\b/i, "chef"],
];

/** The role of an agent, from its name. */
export function agentWorkRole(name: string): AgentWorkRole {
  const trimmed = name.trim();
  return ROLE_NAMES.find(([pattern]) => pattern.test(trimmed))?.[1] ?? "general";
}

export const isReelWorkerName = (name: string) => agentWorkRole(name) === "reel";

/** A Reel Worker that a Producer spawned for one job; only these wear the Reel Worker outfit. */
export const isSpawnedReelWorker = (agent: { name: string; title: string; spawnedBy?: string | undefined }) =>
  isReelWorkerName(agent.name) && (agent.spawnedBy !== undefined || /^spawned reel worker$/i.test(agent.title.trim()));

/** `Reel Worker EC13` makes the Reels labelled `EC13 ...`; Reel Worker 1 and 2 name no Reel. */
export function reelWorkerReels(name: string, live: ReelFactoryLive | null | undefined) {
  const token = name
    .trim()
    .replace(/^reel worker\s*/i, "")
    .trim()
    .toUpperCase();
  if (!live || !/^EC/.test(token)) return [];
  return live.jobs.flatMap((job) => job.reels).filter((reel) => reel.label.toUpperCase().startsWith(token));
}

const stageName = (stage: string) => {
  const words = stage.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The Reels a Reel Worker makes: one line each, its label, a pip per board stage and the stage it is on. */
export function ReelStepRows(props: { reels: ReturnType<typeof reelWorkerReels>; stages: string[] }) {
  const { t } = useText();
  return (
    <span class="reel-steps">
      <For each={props.reels}>
        {(reel) => (
          <span class="reel-steps-row">
            <span class="sr-only">
              {t("sidebar.work.reelStep", {
                reel: reel.label,
                stage: reel.current ? stageName(reel.current) : t("sidebar.work.reelDone"),
                done: reel.done.length,
                total: props.stages.length,
              })}
            </span>
            <span class="reel-steps-label" aria-hidden="true">
              {reel.label}
            </span>
            <span class="reel-steps-pips" aria-hidden="true">
              <For each={props.stages}>
                {(stage) => (
                  <span
                    class="reel-steps-pip"
                    data-state={reel.done.includes(stage) ? "done" : stage === reel.current ? "current" : undefined}
                  />
                )}
              </For>
            </span>
            <span class="reel-steps-stage" aria-hidden="true">
              {reel.current ? stageName(reel.current) : t("sidebar.work.reelDone")}
            </span>
          </span>
        )}
      </For>
    </span>
  );
}
