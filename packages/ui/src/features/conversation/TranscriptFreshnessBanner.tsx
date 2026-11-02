import { Button, CircleCheck, Info, LoaderCircle } from "@openbot/ui";
import { prefersReducedMotion } from "@openbot/ui/utils";
import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, Match, Show, Switch } from "solid-js";
import { useText } from "../../text";
import { CloseIcon } from "./ConversationIcons";

/**
 * How fresh the transcript is while the connection to the host comes and goes:
 * - `stale`: the host is out of reach, so the chat shows the messages it saved. The user may close it.
 * - `refreshing`: the host is back and the chat loads again. It cannot be closed.
 * - `fresh`: the chat has the latest messages. It closes itself.
 */
export type TranscriptFreshness = "stale" | "refreshing" | "fresh";

/** How long "You're up to date" stays. Hover or focus holds the countdown. */
export const TRANSCRIPT_FRESH_DISMISS_MS = 3000;

/**
 * The single-line notice above the transcript. It shows only while the app is offline or
 * reconnecting, and for the moment after, so the saved messages never pass for live ones.
 *
 * The `fresh` phase runs a countdown that pauses while the pointer is over the banner or focus is in
 * it, then fades out and calls `onDismiss`. With reduced motion it is removed at once, with no fade.
 */
export function TranscriptFreshnessBanner(props: {
  phase: TranscriptFreshness | null;
  onDismiss: () => void;
}): JSX.Element {
  const { t } = useText();
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const [leaving, setLeaving] = createSignal(false);
  let remaining = TRANSCRIPT_FRESH_DISMISS_MS;

  const finish = () => {
    if (prefersReducedMotion()) {
      props.onDismiss();
      return;
    }
    setLeaving(true);
  };

  // A new phase starts the countdown again and brings a leaving banner back.
  createEffect(
    () => props.phase,
    () => {
      remaining = TRANSCRIPT_FRESH_DISMISS_MS;
      setLeaving(false);
    },
  );

  // The countdown runs only in the fresh phase and only while nothing holds it.
  createEffect(
    () => props.phase === "fresh" && !hovered() && !focused() && !leaving(),
    (running) => {
      if (!running) return;
      const startedAt = Date.now();
      const timer = window.setTimeout(finish, remaining);
      return () => {
        window.clearTimeout(timer);
        remaining = Math.max(0, remaining - (Date.now() - startedAt));
      };
    },
  );

  return (
    <Show when={props.phase}>
      {(phase) => (
        <div
          class="transcript-freshness"
          data-phase={phase()}
          data-leaving={leaving() ? "" : undefined}
          role="status"
          aria-live="polite"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocusIn={() => setFocused(true)}
          onFocusOut={(event) => {
            if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)))
              setFocused(false);
          }}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && leaving()) props.onDismiss();
          }}
        >
          <span class="transcript-freshness-icon" aria-hidden="true">
            <Switch>
              <Match when={phase() === "stale"}>
                <Info />
              </Match>
              <Match when={phase() === "refreshing"}>
                <LoaderCircle />
              </Match>
              <Match when={phase() === "fresh"}>
                <CircleCheck />
              </Match>
            </Switch>
          </span>
          <span class="transcript-freshness-copy">
            <Switch>
              <Match when={phase() === "stale"}>
                <strong class="transcript-freshness-title">{t("conversation.freshness.staleTitle")}</strong>
                <span class="transcript-freshness-body">{t("conversation.freshness.staleBody")}</span>
              </Match>
              <Match when={phase() === "refreshing"}>
                <strong class="transcript-freshness-title">{t("conversation.freshness.refreshingTitle")}</strong>
                <span class="transcript-freshness-body">{t("conversation.freshness.refreshingBody")}</span>
              </Match>
              <Match when={phase() === "fresh"}>
                <strong class="transcript-freshness-title">{t("conversation.freshness.freshTitle")}</strong>
              </Match>
            </Switch>
          </span>
          <Show when={phase() !== "refreshing"}>
            <Button
              variant="ghost"
              size="icon-xs"
              class="transcript-freshness-dismiss"
              aria-label={
                phase() === "fresh" ? t("conversation.freshness.autoDismiss") : t("conversation.freshness.dismiss")
              }
              onClick={() => props.onDismiss()}
            >
              <CloseIcon />
            </Button>
          </Show>
        </div>
      )}
    </Show>
  );
}
