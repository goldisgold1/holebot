import { ArrowUp, Button, LoaderCircle, Mic } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { Show } from "solid-js";
import { StopIcon } from "./ConversationIcons";

/** The voice job of the main button, for a message box that has dictation. */
export interface ComposerSendVoice {
  /** Nothing to send: the button starts dictation in place of Send. */
  first: boolean;
  /** The accessible name of the microphone. */
  label: string;
  disabled: boolean;
  /** A spinner replaces the microphone while the recording starts or the speech is read. */
  busy: boolean;
  onStart: () => void;
}

export interface ComposerSendControlProps {
  /** Show Stop in place of Send: the agent works and the message box has nothing to send. */
  stop: boolean;
  onStop: () => void;
  /** The accessible name of Send. */
  label: string;
  keyShortcuts?: string | undefined;
  title?: string | undefined;
  disabled: boolean;
  /** A spinner replaces the arrow while the message goes. */
  busy: boolean;
  /** Without it, Send submits its form. */
  onSend?: (() => void) | undefined;
  /** Without it, the button is only Send or Stop. */
  voice?: ComposerSendVoice | undefined;
}

type SendJob = "send" | "stop" | "voice";

/**
 * The main button of a message box. It changes its job rather than its place: the microphone while
 * there is nothing to send, Send once there is, and Stop while the agent works. The glyphs of every
 * job sit stacked in one slot and cross-fade, so the button never jumps or loses the focus.
 */
export function ComposerSendControl(props: ComposerSendControlProps) {
  const { t } = useText();
  const job = (): SendJob => (props.stop ? "stop" : props.voice?.first ? "voice" : "send");
  const shown = (glyph: SendJob) => (job() === glyph ? "" : undefined);
  const label = () => {
    if (job() === "stop") return t("composer.send.stop");
    return job() === "voice" ? props.voice?.label : props.label;
  };
  const disabled = () => {
    if (job() === "stop") return false;
    return job() === "voice" ? (props.voice?.disabled ?? true) : props.disabled;
  };
  return (
    <Button
      variant="ghost"
      type={job() === "send" && !props.onSend ? "submit" : "button"}
      class={job() === "stop" ? "voice-button voice-button-active" : "voice-button"}
      data-job={job()}
      aria-label={label()}
      aria-keyshortcuts={job() === "send" ? props.keyShortcuts : undefined}
      title={job() === "send" ? props.title : undefined}
      data-cuelume-emphasis={job() === "stop" ? undefined : "normal"}
      data-cuelume-tap={job() === "stop" ? "close" : undefined}
      disabled={disabled()}
      onClick={() => {
        const current = job();
        if (current === "stop") props.onStop();
        else if (current === "voice") props.voice?.onStart();
        else props.onSend?.();
      }}
    >
      <span class="composer-cta-glyphs" aria-hidden="true">
        <Show when={props.voice}>
          {(voice) => (
            <span class="composer-cta-glyph" data-shown={shown("voice")}>
              <Show when={voice().busy} fallback={<Mic />}>
                <LoaderCircle class="composer-spinner" />
              </Show>
            </span>
          )}
        </Show>
        <span class="composer-cta-glyph" data-shown={shown("send")}>
          <Show when={props.busy} fallback={<ArrowUp />}>
            <LoaderCircle class="composer-spinner" />
          </Show>
        </span>
        <span class="composer-cta-glyph" data-shown={shown("stop")}>
          <StopIcon />
        </span>
      </span>
    </Button>
  );
}
