import type { AvatarFaceMood } from "@openbot/brand/bloub-avatar-motion";
import type { AppTextKey } from "@openbot/i18n";
import { Button, IconButton, MessageSquareText, Mic, MicOff, TriangleAlert, X } from "@openbot/ui";
import { avatarHeadColor } from "@openbot/ui/bloub-avatar";
import type { AgentProfile } from "@openbot/ui/data";
import { AgentAvatar } from "@openbot/ui/features/agents/AgentAvatar";
import { StopIcon } from "@openbot/ui/features/conversation/ConversationIcons";
import { VoiceWaveform } from "@openbot/ui/features/conversation/VoiceRecordingMorph";
import { useText } from "@openbot/ui/text";
import { createEffect, createSignal, onCleanup, Show, untrack } from "solid-js";

/** What a voice conversation does now. */
export type VoicePanelPhase = "starting" | "listening" | "thinking" | "speaking" | "offline";

const PHASE_LABELS: Record<VoicePanelPhase, AppTextKey> = {
  starting: "conversation.voice.phase.starting",
  listening: "conversation.voice.phase.listening",
  thinking: "conversation.voice.phase.thinking",
  speaking: "conversation.voice.phase.speaking",
  offline: "conversation.voice.phase.offline",
};

/**
 * The face of each phase. The caller talking and the agent talking each have their own face, so a
 * face that listens never looks like one that rests: the caller speaks -> listening, the agent
 * thinks -> working, the agent speaks -> speaking, and a quiet line rests.
 */
const PHASE_MOODS: Record<VoicePanelPhase, AvatarFaceMood> = {
  starting: "connecting",
  listening: "listening",
  thinking: "working",
  speaking: "speaking",
  offline: "idle",
};

/** A mark the header puts on the agent's name: a press there toggles the call, so it is not "outside". */
const VOICE_CALL_ANCHOR_ATTRIBUTE = "data-voice-call-anchor";

export interface VoicePanelProps {
  agent: AgentProfile;
  phase: VoicePanelPhase;
  /** The microphone is off until the user unmutes it. */
  muted: boolean;
  /** What the user said in this turn, so far. */
  heard: string;
  /** The part of the reply that plays now. */
  said: string;
  /** The latest loudness readings of the voice that is heard now, from 0 to 1, oldest first. */
  levels: readonly number[];
  /** Why the conversation stopped listening. */
  error: string | null;
  onToggleMute: () => void;
  /** Stops the reply, or the wait for it, and listens again. */
  onInterrupt: () => void;
  onEnd: () => void;
  /** The popover shows; otherwise the call is minimised to the "on call" chip. Defaults to shown. */
  expanded?: boolean | undefined;
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
  /** When the call began, in ms since the epoch. Defaults to when this component mounted. */
  startedAt?: number | undefined;
  /** Opens the transcript tray at the start. */
  defaultTranscriptOpen?: boolean | undefined;
}

/** "4:07", or "1:02:09" past an hour. */
export function formatCallDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/**
 * A voice call with the agent, as a compact popover that hangs under the agent's name in the chat
 * header. The agent listens until you stop speaking, sends what you said to the chat, and reads its
 * reply aloud; then it listens again.
 *
 * - The head holds the agent's face, whose mood follows the call, and a waveform in the agent's colour
 *   that moves with your voice or the agent's.
 * - Four round controls: transcript, mute, interrupt and a red Hang up.
 * - The transcript tray opens under them and shows what you say and what the agent says.
 * - Minimised (Escape, or a press outside), the call becomes an "on call" chip with the live duration.
 * - A failure that stopped listening replaces the frame with an alert card; a fault that does not stop
 *   the call adds a warning line.
 */
export function VoicePanel(props: VoicePanelProps) {
  const { t } = useText();
  const [ownExpanded, setOwnExpanded] = createSignal(true);
  const expanded = () => props.expanded ?? ownExpanded();
  const setExpanded = (next: boolean) => {
    setOwnExpanded(next);
    props.onExpandedChange?.(next);
  };
  const [transcriptOpen, setTranscriptOpen] = createSignal(untrack(() => props.defaultTranscriptOpen === true));
  const startedAt = untrack(() => props.startedAt ?? Date.now());
  const [now, setNow] = createSignal(Date.now());
  const clock = setInterval(() => setNow(Date.now()), 1000);
  onCleanup(() => clearInterval(clock));
  const duration = () => formatCallDuration(now() - startedAt);

  const hearing = () => props.phase === "listening" && !props.muted;
  const mood = (): AvatarFaceMood => (props.muted && props.phase === "listening" ? "idle" : PHASE_MOODS[props.phase]);
  const phaseLabel = () =>
    t(props.muted && props.phase === "listening" ? "conversation.voice.phase.muted" : PHASE_LABELS[props.phase]);
  const agentColor = () => avatarHeadColor(props.agent.avatarSeed, props.agent.avatarHue ?? null);
  /** A failure stopped listening: the microphone or the speech models could not start. Unmuting tries again. */
  const failure = () => (props.error && props.muted && props.phase !== "offline" ? props.error : null);
  /** A fault the call goes on through: a message that did not send, or a lost server. */
  const fault = () => (props.error && !failure() ? props.error : null);

  let root: HTMLDivElement | undefined;
  let chip: HTMLButtonElement | undefined;
  let popover: HTMLElement | undefined;
  const minimise = (focusChip: boolean) => {
    setExpanded(false);
    if (focusChip) requestAnimationFrame(() => chip?.focus());
  };
  // A press anywhere else minimises the call to its chip; the call goes on.
  createEffect(expanded, (open) => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (root?.contains(target) || target.closest(`[${VOICE_CALL_ANCHOR_ATTRIBUTE}]`)) return;
      minimise(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  });
  // The transcript follows the newest words while it is open.
  createEffect(
    () => [props.heard, props.said, transcriptOpen()] as const,
    () => {
      const log = popover?.querySelector<HTMLElement>(".voice-call-transcript");
      if (log) log.scrollTop = log.scrollHeight;
    },
  );

  return (
    <div
      ref={(element) => {
        root = element;
      }}
      class="voice-call"
      style={{ "--voice-agent-color": agentColor() }}
    >
      <Show when={!expanded()}>
        <Button
          ref={(element: HTMLButtonElement) => {
            chip = element;
          }}
          variant="ghost"
          type="button"
          class="voice-call-chip no-drag"
          aria-label={t("conversation.voice.return", { name: props.agent.name })}
          title={t("conversation.voice.return", { name: props.agent.name })}
          onClick={() => setExpanded(true)}
        >
          <AgentAvatar agent={props.agent} mood={mood()} motion="always" class="voice-call-chip-face" />
          <span class="voice-call-chip-time">
            <span aria-hidden="true">{duration()}</span>
            <span class="sr-only">{t("conversation.voice.duration", { duration: duration() })}</span>
          </span>
        </Button>
      </Show>
      <Show when={expanded()}>
        <section
          ref={(element) => {
            popover = element;
          }}
          class="voice-call-popover no-drag"
          aria-label={t("conversation.voice.label", { name: props.agent.name })}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || event.defaultPrevented) return;
            event.preventDefault();
            minimise(true);
          }}
        >
          <Show
            when={failure()}
            fallback={
              <div class="voice-call-frame">
                <div class="voice-call-row">
                  <div class="voice-call-head" data-voice-call-activity={props.phase}>
                    <div class="voice-call-face" data-muted={props.muted ? "" : undefined}>
                      <AgentAvatar agent={props.agent} mood={mood()} motion="always" class="voice-call-avatar" />
                    </div>
                    <Show
                      when={props.phase !== "starting"}
                      fallback={
                        <span
                          class="voice-call-connecting"
                          role="progressbar"
                          aria-label={t("conversation.voice.connecting")}
                        />
                      }
                    >
                      <div
                        class="voice-call-wave"
                        data-source={props.phase === "speaking" ? "agent" : hearing() ? "caller" : undefined}
                      >
                        <VoiceWaveform levels={props.levels} class="voice-call-waveform" />
                      </div>
                    </Show>
                    <span class="sr-only" role="status">
                      {phaseLabel()}
                    </span>
                  </div>
                  <div class="voice-call-controls">
                    <IconButton
                      variant="ghost"
                      type="button"
                      class="voice-call-control"
                      label={t(
                        transcriptOpen() ? "conversation.voice.hideTranscript" : "conversation.voice.showTranscript",
                      )}
                      aria-pressed={transcriptOpen() ? "true" : "false"}
                      aria-expanded={transcriptOpen() ? "true" : "false"}
                      onClick={() => setTranscriptOpen(!transcriptOpen())}
                    >
                      <MessageSquareText aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      variant="ghost"
                      type="button"
                      class="voice-call-control"
                      label={t(props.muted ? "conversation.voice.unmute" : "conversation.voice.mute")}
                      aria-pressed={props.muted ? "true" : "false"}
                      onClick={() => props.onToggleMute()}
                    >
                      <Show when={props.muted} fallback={<Mic aria-hidden="true" />}>
                        <MicOff aria-hidden="true" />
                      </Show>
                    </IconButton>
                    <IconButton
                      variant="ghost"
                      type="button"
                      class="voice-call-control"
                      label={t("conversation.voice.interrupt")}
                      disabled={props.phase !== "speaking" && props.phase !== "thinking"}
                      onClick={() => props.onInterrupt()}
                    >
                      <StopIcon />
                    </IconButton>
                    <IconButton
                      variant="ghost"
                      type="button"
                      class="voice-call-control voice-call-hangup"
                      label={t("conversation.voice.hangUp")}
                      onClick={() => props.onEnd()}
                    >
                      <X aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>
                <Show when={fault()}>
                  {(text) => (
                    <p class="voice-call-fault" role="status">
                      <TriangleAlert aria-hidden="true" />
                      <span>{text()}</span>
                    </p>
                  )}
                </Show>
                <div class="voice-call-tray" data-open={transcriptOpen() ? "" : undefined}>
                  <div class="voice-call-tray-clip">
                    <div
                      class="voice-call-transcript"
                      role="log"
                      aria-live="polite"
                      inert={transcriptOpen() ? undefined : true}
                    >
                      <Show when={props.heard}>
                        {(heard) => (
                          <p class="voice-call-line" data-speaker="caller">
                            <span class="voice-call-speaker">{t("conversation.voice.you")}</span>
                            {heard()}
                          </p>
                        )}
                      </Show>
                      <Show when={props.phase === "speaking" && props.said}>
                        {(said) => (
                          <p class="voice-call-line" data-speaker="agent">
                            <span class="voice-call-speaker">{props.agent.name}</span>
                            {said()}
                          </p>
                        )}
                      </Show>
                      <Show when={!props.heard && !(props.phase === "speaking" && props.said)}>
                        <p class="voice-call-empty">
                          {t(hearing() ? "conversation.voice.speakNow" : "conversation.voice.noSpeech")}
                        </p>
                      </Show>
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            {(text) => (
              <div class="voice-call-failure" role="alert">
                <span class="voice-call-failure-badge" aria-hidden="true">
                  <TriangleAlert />
                </span>
                <div class="voice-call-failure-copy">
                  <p class="voice-call-failure-title">{t("conversation.voice.failedTitle")}</p>
                  <p class="voice-call-failure-detail">{text()}</p>
                </div>
                <div class="voice-call-failure-actions">
                  <Button variant="secondary" size="sm" type="button" onClick={() => props.onToggleMute()}>
                    {t("conversation.voice.retry")}
                  </Button>
                  <Button variant="secondary" size="sm" type="button" onClick={() => props.onEnd()}>
                    {t("conversation.voice.dismiss")}
                  </Button>
                </div>
              </div>
            )}
          </Show>
        </section>
      </Show>
    </div>
  );
}
