import type { NotificationPresence } from "@openbot/contracts/ipc";
import { isBoolean, isDynamicRecord } from "@openbot/contracts/runtime-values";

/**
 * HoleA.I (from Vincent's bot app): what each app window has on screen, as the window last said. Main reads
 * it to show no notification for the chat the user is looking at (the bot app checks that the focused
 * window shows that agent, not only that the app has focus), and to keep the OS toast silent when the
 * window plays its own sound, so the two never chime together.
 */
const presences = new Map<number, NotificationPresence>();

const ID_LIMIT = 512;

function optionalId(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" && value.length > 0 && value.length <= ID_LIMIT ? value : undefined;
}

export function parseNotificationPresence(input: unknown): NotificationPresence {
  if (!isDynamicRecord(input) || !isBoolean(input.appSound)) throw new Error("Notification presence is required.");
  const serverId = optionalId(input.serverId);
  const agentId = optionalId(input.agentId);
  const channelId = optionalId(input.channelId);
  if (serverId === undefined || agentId === undefined || channelId === undefined) {
    throw new Error("Notification presence is required.");
  }
  return { serverId, agentId, channelId, appSound: input.appSound };
}

/** Keeps the presence of a window, by its web contents id, until the window goes away. */
export function setNotificationPresence(
  contents: { id: number; once(event: "destroyed", listener: () => void): unknown },
  presence: NotificationPresence,
): void {
  if (!presences.has(contents.id)) contents.once("destroyed", () => presences.delete(contents.id));
  presences.set(contents.id, presence);
}

/**
 * Whether one of the focused windows shows this agent's chat or this group chat. A window that has
 * not said what it shows counts as showing it, as before: the whole app suppressed then.
 */
export function notificationTargetOnScreen(
  focusedContentIds: readonly number[],
  serverId: string,
  target: { agentId: string | null; channelId?: string | null | undefined },
): boolean {
  return focusedContentIds.some((id) => {
    const presence = presences.get(id);
    if (!presence) return true;
    if (presence.serverId !== serverId) return false;
    if (target.channelId) return presence.channelId === target.channelId;
    return target.agentId !== null && presence.channelId === null && presence.agentId === target.agentId;
  });
}

/** Whether a window of the app plays its own sound for this server's events. */
export function appPlaysNotificationSound(serverId: string): boolean {
  for (const presence of presences.values()) if (presence.appSound && presence.serverId === serverId) return true;
  return false;
}
