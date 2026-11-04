/**
 * HoleA.I (from Vincent's bot app): "View unread". The list shows only the chats with an unread reply,
 * and the open chat, so it does not vanish while it is read. One choice for the window, kept across starts.
 */

import { createSignal } from "solid-js";

const STORAGE_KEY = "openbot:sidebar-unread-only";

function readStored(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

const [unreadOnly, setUnreadOnlySignal] = createSignal(readStored());

export { unreadOnly };

export function setUnreadOnly(value: boolean): void {
  setUnreadOnlySignal(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Blocked storage keeps the choice for this session only.
  }
}
