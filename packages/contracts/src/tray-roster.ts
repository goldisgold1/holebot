import { type AvatarHue, isAvatarHue } from "./ipc-agent-identity";
import { isDynamicRecord } from "./runtime-values";

/**
 * HoleA.I (Vincent, Nov 3 2026): the agents of the server the window shows, sent to the tray. The tray
 * otherwise sees only the agents of this computer, and the team's agents live on the hole.fm VPS.
 */
export interface TrayRosterAgent {
  id: string;
  name: string;
  avatarSeed: string;
  avatarHue: AvatarHue | null;
  avatarUrl: string | null;
  /** ISO time of the last activity, for the recent order. */
  updatedAt: string | null;
  /** Off for a muted agent, whose unread chats the badge does not count. */
  notifications: boolean;
  busy: boolean;
  unread: boolean;
}

export const TRAY_ROSTER_LIMIT = 200;

export function isTrayRoster(value: unknown): value is TrayRosterAgent[] {
  return (
    Array.isArray(value) &&
    value.length <= TRAY_ROSTER_LIMIT &&
    value.every(
      (agent) =>
        isDynamicRecord(agent) &&
        typeof agent.id === "string" &&
        agent.id.length <= 200 &&
        typeof agent.name === "string" &&
        agent.name.length <= 200 &&
        typeof agent.avatarSeed === "string" &&
        agent.avatarSeed.length <= 200 &&
        (agent.avatarHue === null || isAvatarHue(agent.avatarHue)) &&
        (agent.avatarUrl === null || (typeof agent.avatarUrl === "string" && agent.avatarUrl.length <= 2_000_000)) &&
        (agent.updatedAt === null || (typeof agent.updatedAt === "string" && agent.updatedAt.length <= 64)) &&
        typeof agent.notifications === "boolean" &&
        typeof agent.busy === "boolean" &&
        typeof agent.unread === "boolean",
    )
  );
}
