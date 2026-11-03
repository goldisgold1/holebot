/**
 * HoleA.I: what an agent is doing, drawn under its row while it works.
 *
 * Every role has a small scene of its own: a Reel Worker cuts clips on an editing desk, Rosie ticks off
 * the ops checklist, the Publisher sends a paper plane, and so on. The scene is decoration (the row's
 * label already says the agent works), so it is hidden from screen readers. A Reel Worker also lists
 * the Reels it makes, with the board stage each one is on.
 */

import type { ReelFactoryLive } from "@openbot/contracts/ipc";
import type { JSX } from "@solidjs/web";
import { createUniqueId, For, Show } from "solid-js";
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
];

/** The scene of an agent, from its name. */
export function agentWorkRole(name: string): AgentWorkRole {
  const trimmed = name.trim();
  return ROLE_NAMES.find(([pattern]) => pattern.test(trimmed))?.[1] ?? "general";
}

export const isReelWorkerName = (name: string) => agentWorkRole(name) === "reel";

/** A Reel Worker that a Producer spawned for one job; only these work at the editing desk. */
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

const REEL_CAPTIONS = [
  "sidebar.work.reel.hook",
  "sidebar.work.reel.grade",
  "sidebar.work.reel.audio",
  "sidebar.work.reel.render",
] as const;

function ReelDesk(): JSX.Element {
  const { t } = useText();
  const clip = createUniqueId();
  return (
    <>
      <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
        <g class="ws-reel-clap">
          <rect class="ws-b" x="4" y="17" width="26" height="19" rx="2" />
          <g class="ws-reel-clap-top">
            <rect class="ws-fg" x="4" y="10" width="26" height="6" rx="1" />
            <path class="ws-ink" d="M9 10l3 6M16 10l3 6M23 10l3 6" />
          </g>
        </g>
        <clipPath id={clip}>
          <rect x="40" y="7" width="58" height="23" rx="2" />
        </clipPath>
        <rect class="ws-frame" x="38" y="5" width="62" height="27" rx="3" />
        <g clip-path={`url(#${clip})`}>
          <g class="ws-reel-play">
            <rect class="ws-a" x="40" y="7" width="20" height="23" />
            <rect class="ws-b" x="60" y="7" width="19" height="23" />
            <rect class="ws-a ws-soft" x="79" y="7" width="19" height="23" />
            <rect class="ws-a" x="98" y="7" width="20" height="23" />
            <rect class="ws-b" x="118" y="7" width="19" height="23" />
            <rect class="ws-a ws-soft" x="137" y="7" width="19" height="23" />
          </g>
        </g>
        <path class="ws-fg ws-pulse" d="M65 13v12l9-6z" />
        <rect class="ws-muted" x="63" y="34" width="12" height="2" rx="1" />
        <line class="ws-line" x1="108" y1="31" x2="216" y2="31" />
        <rect class="ws-a" x="108" y="21" width="30" height="8" rx="2" />
        <rect class="ws-b ws-reel-trim" x="141" y="21" width="34" height="8" rx="2" />
        <rect class="ws-a" x="178" y="21" width="38" height="8" rx="2" />
        <circle class="ws-fg ws-reel-spark" cx="139.5" cy="25" r="2.5" />
        <circle class="ws-fg ws-reel-spark ws-late" cx="176.5" cy="25" r="2.5" />
        <g class="ws-reel-scissors">
          <circle class="ws-ring" cx="-6" cy="6" r="2.4" />
          <circle class="ws-ring" cx="-6" cy="14" r="2.4" />
          <rect class="ws-fg ws-reel-blade-a" x="-4" y="9.2" width="12" height="1.6" rx="0.8" />
          <rect class="ws-fg ws-reel-blade-b" x="-4" y="9.2" width="12" height="1.6" rx="0.8" />
        </g>
      </svg>
      <span class="work-scene-captions" aria-hidden="true">
        <For each={REEL_CAPTIONS}>{(key) => <span class="work-scene-caption">{t(key)}</span>}</For>
      </span>
    </>
  );
}

/** The smaller scenes. Each is a few shapes that move while the agent works. */
function RoleArt(props: { role: AgentWorkRole }): JSX.Element {
  switch (props.role) {
    case "cos":
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-frame" x="6" y="8" width="40" height="26" rx="3" />
          <rect class="ws-b ws-cos-card" x="12" y="14" width="26" height="6" rx="2" />
          <rect class="ws-a ws-cos-card ws-late" x="12" y="22" width="26" height="6" rx="2" />
          <line class="ws-line" x1="120" y1="12" x2="214" y2="12" />
          <line class="ws-line" x1="120" y1="22" x2="214" y2="22" />
          <line class="ws-line" x1="120" y1="32" x2="214" y2="32" />
          <rect class="ws-b ws-soft" x="126" y="6" width="22" height="5" rx="2" />
          <rect class="ws-a ws-soft" x="152" y="16" width="22" height="5" rx="2" />
          <rect class="ws-b ws-soft" x="178" y="26" width="22" height="5" rx="2" />
        </svg>
      );
    case "coo":
      // Rosie writes Elle's daily report in Vietnamese and sends it to her.
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <g class="ws-send">
            <rect class="ws-frame" x="6" y="1" width="64" height="38" rx="3" />
            <rect class="ws-b" x="11" y="5" width="12" height="8" rx="1" />
            <path class="ws-a" d="M17 6.4l.9 2.2 2.3.1-1.8 1.4.6 2.2-2-1.3-2 1.3.6-2.2-1.8-1.4 2.3-.1z" />
            <rect class="ws-muted" x="27" y="7" width="36" height="3" rx="1.5" />
            <For each={[0, 1, 2]}>
              {(line) => (
                <rect
                  class="ws-a ws-type"
                  style={`animation-delay: ${line * 0.6}s;`}
                  x="11"
                  y={17 + line * 6}
                  width={52 - line * 10}
                  height="3"
                  rx="1.5"
                />
              )}
            </For>
          </g>
          <line class="ws-trail" x1="78" y1="20" x2="176" y2="20" />
          <circle class="ws-b ws-pulse" cx="194" cy="20" r="12" />
          <path class="ws-check-static" d="M188.5 20l4 4 7-7.5" />
        </svg>
      );
    case "producer":
      // The Producer directs like a Hollywood director: chair, megaphone, clapper and a rolling camera.
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-b" x="6" y="4" width="30" height="9" rx="1.5" />
          <rect class="ws-fg" x="6" y="19" width="30" height="4" rx="1" />
          <line class="ws-chair" x1="9" y1="38" x2="33" y2="23" />
          <line class="ws-chair" x1="33" y1="38" x2="9" y2="23" />
          <line class="ws-chair" x1="7" y1="13" x2="7" y2="23" />
          <line class="ws-chair" x1="35" y1="13" x2="35" y2="23" />
          <g class="ws-shout">
            <rect class="ws-fg" x="44" y="17" width="7" height="6" rx="1.5" />
            <path class="ws-a" d="M51 15.5L70 7v26l-19-8.5z" />
          </g>
          <path class="ws-wave" d="M75 13q5 7 0 14" />
          <path class="ws-wave ws-wave-2" d="M81 9q8 11 0 22" />
          <path class="ws-wave ws-wave-3" d="M87 5q11 15 0 30" />
          <g class="ws-reel-clap" style="transform: translateX(100px);">
            <rect class="ws-b" x="0" y="17" width="26" height="19" rx="2" />
            <g class="ws-reel-clap-top">
              <rect class="ws-fg" x="0" y="10" width="26" height="6" rx="1" />
              <path class="ws-ink" d="M5 10l3 6M12 10l3 6M19 10l3 6" />
            </g>
          </g>
          <circle class="ws-frame ws-spin-local" cx="152" cy="11" r="8" />
          <circle class="ws-frame ws-spin-local" cx="170" cy="11" r="8" />
          <rect class="ws-a" x="146" y="19" width="32" height="13" rx="2" />
          <path class="ws-b" d="M178 22l10-4v15l-10-4z" />
          <circle class="ws-fg ws-flash" cx="150" cy="23" r="1.6" />
          <line class="ws-chair" x1="162" y1="32" x2="154" y2="39" />
          <line class="ws-chair" x1="162" y1="32" x2="170" y2="39" />
        </svg>
      );
    case "analyst":
      // The Analyst reads a source Reel: frames pass under the glass, the transcript lights line by line,
      // and the read gets its score.
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-frame" x="4" y="2" width="96" height="22" rx="2" />
          <g class="ws-frames">
            <For each={[0, 1, 2, 3, 4, 5]}>
              {(frame) => (
                <rect
                  class={frame % 2 ? "ws-b ws-soft" : "ws-a ws-soft"}
                  x={7 + frame * 30}
                  y="5"
                  width="26"
                  height="16"
                  rx="1.5"
                />
              )}
            </For>
          </g>
          <g class="ws-glass">
            <circle class="ws-ring" cx="52" cy="13" r="10" />
            <rect class="ws-fg" x="58" y="20" width="9" height="3" rx="1.5" transform="rotate(45 58 20)" />
          </g>
          <For each={[0, 1, 2]}>
            {(line) => <rect class="ws-muted" x="110" y={6 + line * 9} width={70 - line * 14} height="3" rx="1.5" />}
          </For>
          <rect class="ws-b ws-highlight" x="108" y="4" width="74" height="7" rx="2" />
          <rect class="ws-muted ws-soft" x="6" y="31" width="90" height="3" rx="1.5" />
          <rect class="ws-a ws-type" x="6" y="31" width="90" height="3" rx="1.5" />
          <circle class="ws-b ws-pulse" cx="202" cy="20" r="10" />
          <path class="ws-check-static" d="M197.5 20l3.5 3.5 6-6.5" />
        </svg>
      );
    case "publisher":
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <line class="ws-trail" x1="8" y1="32" x2="200" y2="10" />
          <g class="ws-fly">
            <path class="ws-b" d="M0 10L22 0 14 22 10 13z" />
            <path class="ws-fg" d="M10 13l12-13" />
          </g>
        </svg>
      );
    case "image":
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-b" x="8" y="10" width="40" height="26" rx="4" />
          <rect class="ws-fg" x="18" y="6" width="12" height="5" rx="1.5" />
          <circle class="ws-ring" cx="28" cy="23" r="8" />
          <circle class="ws-fg ws-flash" cx="42" cy="15" r="3" />
          <For each={[0, 1, 2]}>
            {(frame) => (
              <rect
                class="ws-a ws-soft ws-develop"
                style={`animation-delay: ${frame * 0.4}s;`}
                x={70 + frame * 46}
                y="8"
                width="38"
                height="26"
                rx="3"
              />
            )}
          </For>
        </svg>
      );
    case "carousel":
      // The Carousel Maker deals the slides of one carousel into place.
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <For each={[0, 1, 2, 3, 4]}>
            {(slide) => (
              <rect
                class={`${slide % 2 ? "ws-b" : "ws-a"} ws-deal`}
                style={`animation-delay: ${slide * 0.35}s; --deal-x: ${slide * 30}px;`}
                x="8"
                y="5"
                width="26"
                height="26"
                rx="3"
              />
            )}
          </For>
          <For each={[0, 1, 2, 3, 4]}>
            {(dot) => (
              <circle
                class="ws-muted ws-pulse"
                style={`animation-delay: ${dot * 0.35}s;`}
                cx={60 + dot * 8}
                cy="37"
                r="1.6"
              />
            )}
          </For>
        </svg>
      );
    case "story":
      // The Story Maker scrapes inspiration off a phone into a board and stamps a label on each.
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-frame" x="6" y="1" width="24" height="38" rx="4" />
          <For each={[0, 1, 2]}>
            {(segment) => (
              <rect
                class="ws-fg ws-fill"
                style={`animation-delay: ${segment * 0.8}s;`}
                x={9 + segment * 6.5}
                y="4"
                width="5.5"
                height="2"
                rx="1"
              />
            )}
          </For>
          <rect class="ws-b ws-soft" x="10" y="10" width="16" height="24" rx="2" />
          <rect class="ws-b ws-scrape" x="12" y="14" width="12" height="16" rx="2" />
          <For each={[0, 1, 2, 3]}>
            {(tile) => (
              <>
                <rect class="ws-a ws-soft" x={70 + tile * 36} y="6" width="30" height="28" rx="3" />
                <rect
                  class="ws-b ws-stamp"
                  style={`animation-delay: ${tile * 0.5}s;`}
                  x={73 + tile * 36}
                  y="26"
                  width="18"
                  height="5"
                  rx="2.5"
                />
              </>
            )}
          </For>
        </svg>
      );
    case "warmup":
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-frame" x="8" y="1" width="26" height="38" rx="4" />
          <g class="ws-scroll">
            <For each={[0, 1, 2, 3, 4, 5]}>
              {(post) => (
                <rect
                  class={post % 2 ? "ws-b ws-soft" : "ws-a ws-soft"}
                  x="11"
                  y={4 + post * 12}
                  width="20"
                  height="9"
                  rx="2"
                />
              )}
            </For>
          </g>
          <path class="ws-b ws-heart" d="M60 26c-6-4-9-7-9-10a4.5 4.5 0 019-2 4.5 4.5 0 019 2c0 3-3 6-9 10z" />
        </svg>
      );
    case "growth":
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-b" x="10" y="28" width="22" height="10" rx="2" />
          <rect class="ws-a ws-stem" x="20" y="10" width="2.5" height="18" rx="1.2" />
          <ellipse class="ws-a ws-leaf" cx="15" cy="15" rx="5" ry="2.6" />
          <ellipse class="ws-a ws-leaf ws-late" cx="27" cy="12" rx="5" ry="2.6" />
          <path class="ws-trail" d="M50 34L90 26 120 28 160 14 210 6" />
        </svg>
      );
    case "strategist":
      // The Strategist ranks the clusters: bubbles shuffle, the ranking fills, the top one gets the star.
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <circle class="ws-a ws-shuffle" cx="16" cy="14" r="8" />
          <circle class="ws-b ws-shuffle ws-shuffle-2" cx="38" cy="26" r="6" />
          <circle class="ws-a ws-soft ws-shuffle ws-shuffle-3" cx="56" cy="12" r="5" />
          <line class="ws-trail" x1="70" y1="20" x2="96" y2="20" />
          <For each={[0, 1, 2]}>
            {(rank) => (
              <rect
                class={`${rank === 0 ? "ws-b" : "ws-a"} ws-fill`}
                style={`animation-delay: ${rank * 0.4}s;`}
                x="104"
                y={5 + rank * 11}
                width={90 - rank * 22}
                height="7"
                rx="3.5"
              />
            )}
          </For>
          <path class="ws-fg ws-pulse" d="M204 4.5l1.8 4 4.4.4-3.3 2.9 1 4.3-3.9-2.3-3.9 2.3 1-4.3-3.3-2.9 4.4-.4z" />
        </svg>
      );
    case "coder":
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-frame" x="4" y="2" width="150" height="36" rx="3" />
          <For each={[0, 1, 2]}>
            {(line) => (
              <rect
                class={`${line === 1 ? "ws-b" : "ws-a"} ws-type`}
                style={`animation-delay: ${line * 0.7}s;`}
                x={10 + (line % 2) * 10}
                y={8 + line * 10}
                width={110 - line * 22}
                height="4"
                rx="2"
              />
            )}
          </For>
          <rect class="ws-fg ws-caret" x="132" y="27" width="2" height="7" rx="1" />
          <circle class="ws-b ws-pulse" cx="190" cy="20" r="8" />
        </svg>
      );
    default:
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <For each={[0, 1, 2]}>
            {(dot) => (
              <circle
                class="ws-b ws-bounce"
                style={`animation-delay: ${dot * 0.15}s;`}
                cx={14 + dot * 14}
                cy="22"
                r="4"
              />
            )}
          </For>
        </svg>
      );
  }
}

/** The scene under a working agent's row. `working` plays it; otherwise it is not drawn. */
export function AgentWorkScene(props: { role: AgentWorkRole }) {
  return (
    <span class="work-scene" data-role={props.role} aria-hidden="true">
      <Show when={props.role === "reel"} fallback={<RoleArt role={props.role} />}>
        <ReelDesk />
      </Show>
    </span>
  );
}
