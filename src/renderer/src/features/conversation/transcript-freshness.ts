import type { ServerSummary } from "@openbot/contracts/ipc";
import type { TranscriptFreshness } from "@openbot/ui/features/conversation/TranscriptFreshnessBanner";
import { createEffect, createSignal, onCleanup } from "solid-js";

/**
 * Whether the host of a chat is out of reach, so the chat shows the messages it saved. A local
 * server runs in this app and is never out of reach. A joined server is out of reach while it
 * connects again or has failed, and while the computer has no network at all. An incompatible host
 * has a notice of its own.
 */
export function transcriptTransportDown(server: ServerSummary | undefined, online: boolean): boolean {
  if (server?.kind !== "remote") return false;
  if (server.state === "connecting" || server.state === "offline" || server.state === "error") return true;
  return server.state === "online" && !online;
}

/**
 * The phase of the freshness notice above the transcript. It shows nothing until the host goes out of
 * reach with saved messages on screen, then "stale" while it stays away, "refreshing" while the chat
 * loads again after it came back, and "fresh" once it has. The notice is per chat: another chat
 * starts with nothing, and "stale" there shows again even when the user closed it here.
 */
export function createTranscriptFreshness(
  read: () => { key: string; server: ServerSummary | undefined; loaded: boolean; hasMessages: boolean },
) {
  const [online, setOnline] = createSignal(navigator.onLine);
  const updateOnline = () => setOnline(navigator.onLine);
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  onCleanup(() => {
    window.removeEventListener("online", updateOnline);
    window.removeEventListener("offline", updateOnline);
  });

  const [phase, setPhase] = createSignal<TranscriptFreshness | null>(null);
  let key: string | null = null;
  let outage = false;
  let staleDismissed = false;

  createEffect(
    () => {
      const value = read();
      return {
        key: value.key,
        down: transcriptTransportDown(value.server, online()),
        loaded: value.loaded,
        hasMessages: value.hasMessages,
      };
    },
    (value) => {
      if (value.key !== key) {
        key = value.key;
        outage = false;
        staleDismissed = false;
        setPhase(null);
      }
      if (value.down) {
        // Nothing saved is on screen, so there is nothing to call out of date.
        if (!outage && !value.hasMessages) return;
        outage = true;
        setPhase(staleDismissed ? null : "stale");
        return;
      }
      if (!outage) return;
      if (!value.loaded) {
        setPhase("refreshing");
        return;
      }
      outage = false;
      staleDismissed = false;
      setPhase("fresh");
    },
  );

  const dismiss = () => {
    if (phase() === "stale") staleDismissed = true;
    setPhase(null);
  };

  return { phase, dismiss };
}
