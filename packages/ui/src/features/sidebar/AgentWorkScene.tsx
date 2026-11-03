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
  [/^strategist\b/i, "strategist"],
];

/** The scene of an agent, from its name. */
export function agentWorkRole(name: string): AgentWorkRole {
  const trimmed = name.trim();
  return ROLE_NAMES.find(([pattern]) => pattern.test(trimmed))?.[1] ?? "general";
}

export const isReelWorkerName = (name: string) => agentWorkRole(name) === "reel";

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
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-frame" x="6" y="3" width="150" height="34" rx="3" />
          <For each={[0, 1, 2]}>
            {(row) => (
              <>
                <rect class="ws-frame" x="12" y={8 + row * 9} width="7" height="7" rx="1.5" />
                <path class={`ws-check ws-check-${row}`} d={`M13.5 ${11.5 + row * 9}l2 2 3.2-4`} />
                <rect class="ws-muted" x="24" y={10 + row * 9} width={90 - row * 18} height="3" rx="1.5" />
              </>
            )}
          </For>
          <circle class="ws-b ws-pulse" cx="190" cy="20" r="9" />
          <path class="ws-check-static" d="M185.5 20l3 3 6-6.5" />
        </svg>
      );
    case "producer":
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <g class="ws-reel-clap">
            <rect class="ws-b" x="6" y="15" width="34" height="21" rx="2" />
            <g class="ws-reel-clap-top">
              <rect class="ws-fg" x="6" y="8" width="34" height="6" rx="1" />
              <path class="ws-ink" d="M11 8l3 6M19 8l3 6M27 8l3 6M35 8l3 6" />
            </g>
          </g>
          <g class="ws-spin" style="transform-origin: 90px 20px;">
            <circle class="ws-frame" cx="90" cy="20" r="15" />
            <circle class="ws-a" cx="90" cy="11" r="3.5" />
            <circle class="ws-b" cx="98" cy="25" r="3.5" />
            <circle class="ws-a" cx="82" cy="25" r="3.5" />
          </g>
          <rect class="ws-muted ws-slide" x="120" y="17" width="90" height="6" rx="3" />
        </svg>
      );
    case "analyst":
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <line class="ws-line" x1="6" y1="36" x2="130" y2="36" />
          <For each={[0, 1, 2, 3, 4]}>
            {(bar) => (
              <rect
                class={`${bar % 2 ? "ws-b" : "ws-a"} ws-bar`}
                style={`animation-delay: ${bar * 0.18}s;`}
                x={12 + bar * 24}
                y="8"
                width="14"
                height="28"
                rx="2"
              />
            )}
          </For>
          <g class="ws-slide">
            <circle class="ws-ring" cx="160" cy="18" r="9" />
            <rect class="ws-fg" x="166" y="24" width="10" height="3" rx="1.5" transform="rotate(40 166 24)" />
          </g>
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
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <g class="ws-carousel">
            <For each={[0, 1, 2, 3, 4, 5]}>
              {(slide) => (
                <rect class={slide % 2 ? "ws-b" : "ws-a"} x={8 + slide * 40} y="6" width="34" height="28" rx="3" />
              )}
            </For>
          </g>
        </svg>
      );
    case "story":
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <rect class="ws-frame" x="8" y="1" width="24" height="38" rx="4" />
          <For each={[0, 1, 2]}>
            {(segment) => (
              <rect
                class="ws-fg ws-fill"
                style={`animation-delay: ${segment * 0.8}s;`}
                x={11 + segment * 6.5}
                y="4"
                width="5.5"
                height="2"
                rx="1"
              />
            )}
          </For>
          <For each={[0, 1, 2, 3]}>
            {(ring) => (
              <circle
                class={`${ring % 2 ? "ws-b" : "ws-a"} ws-pulse`}
                style={`animation-delay: ${ring * 0.3}s;`}
                cx={60 + ring * 36}
                cy="20"
                r="11"
              />
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
      return (
        <svg class="work-scene-art" viewBox="0 0 220 40" aria-hidden="true">
          <circle class="ws-frame" cx="22" cy="20" r="16" />
          <g class="ws-compass" style="transform-origin: 22px 20px;">
            <path class="ws-b" d="M22 7l3.5 13h-7z" />
            <path class="ws-muted" d="M22 33l3.5-13h-7z" />
          </g>
          <path class="ws-trail" d="M50 30C80 30 90 10 120 10S170 30 210 20" />
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
