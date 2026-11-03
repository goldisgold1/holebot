import { avatarHeadColor } from "@openbot/brand/bloub-avatar";
import type { AgentRuntimeSnapshot, ConversationReadState, TrayRosterAgent } from "@openbot/contracts/ipc";

/**
 * HoleA.I (Vincent, Nov 3 2026): what the tray shows about the local agents, from the runtime snapshot
 * and the read state that the main process already holds.
 */

/** The shapes of the avatar engine, in the order of `BOT_MARK_SHAPES` in `bot-mark/engine.js`. */
export const BOT_MARK_SHAPES = [
  "blob",
  "pebble",
  "bean",
  "egg",
  "squircle",
  "tablet",
  "capsule",
  "cylinder",
  "hex",
  "gem",
  "crystal",
  "wedge",
  "shield",
  "dome",
  "arch",
  "cloud",
  "teardrop",
  "leaf",
  "square",
  "sparkle",
  "clover",
  "flower",
  "heart",
  "house",
  "star",
] as const;

export type BotMarkShape = (typeof BOT_MARK_SHAPES)[number];

/** The shape the renderer draws for a seed: FNV-1a, as `seededShape` in `BotMarkFace.tsx`. */
export function seededShape(seed: string): BotMarkShape {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return BOT_MARK_SHAPES[(hash >>> 0) % BOT_MARK_SHAPES.length] ?? "blob";
}

export interface TrayAvatar {
  shape: BotMarkShape;
  /** `#rrggbb`. */
  color: string;
  /** An uploaded picture as a data URL, which replaces the shape. */
  photo: string | null;
}

export interface TrayAgent {
  agentId: string;
  title: string;
  avatar: TrayAvatar;
  unread: boolean;
  busy: boolean;
  /** Ctrl+Shift+<slot>, 1 to 5. */
  shortcutSlot: number;
}

export interface TrayState {
  agents: TrayAgent[];
  /** The busy agent the tray face shows, or null for the app icon. */
  face: { agentId: string; avatar: TrayAvatar } | null;
  /** Chats with unread replies, without muted agents. */
  unreadCount: number;
}

export const TRAY_RECENT_AGENTS = 5;

type RosterEntry = Pick<
  AgentRuntimeSnapshot["agents"][number],
  "id" | "name" | "avatarSeed" | "avatarHue" | "avatarUrl" | "updatedAt" | "notifications"
>;

function avatarOf(agent: RosterEntry): TrayAvatar {
  const photo =
    agent.avatarUrl?.startsWith("data:image/") === true && !agent.avatarUrl.startsWith("data:image/svg")
      ? agent.avatarUrl
      : null;
  return { shape: seededShape(agent.avatarSeed), color: avatarHeadColor(agent.avatarSeed, agent.avatarHue), photo };
}

function activityAt(agent: RosterEntry): number {
  const at = agent.updatedAt === null ? Number.NaN : Date.parse(agent.updatedAt);
  return Number.isFinite(at) ? at : 0;
}

/**
 * Builds the tray state. `busySince` remembers when each agent became busy, so the face follows the
 * agent that started work most recently; this call updates it.
 */
export function trayState(
  snapshot: AgentRuntimeSnapshot,
  reads: Record<string, ConversationReadState>,
  busySince: Map<string, number>,
  now: number,
): TrayState {
  const busy = new Set<string>(snapshot.activeTurns.map((turn) => turn.agentId));
  for (const item of snapshot.work) if (item.status !== "failed") busy.add(item.agentId);
  return rosterTrayState(snapshot.agents, busy, (agentId) => (reads[agentId]?.unreadCount ?? 0) > 0, busySince, now);
}

/** The tray state of the agents a window sent, such as those of the hole.fm VPS. */
export function sentRosterTrayState(roster: TrayRosterAgent[], busySince: Map<string, number>, now: number): TrayState {
  const busy = new Set(roster.filter((agent) => agent.busy).map((agent) => agent.id));
  const unread = new Set(roster.filter((agent) => agent.unread).map((agent) => agent.id));
  return rosterTrayState(roster, busy, (agentId) => unread.has(agentId), busySince, now);
}

function rosterTrayState(
  roster: readonly RosterEntry[],
  busy: ReadonlySet<string>,
  isUnread: (agentId: string) => boolean,
  busySince: Map<string, number>,
  now: number,
): TrayState {
  for (const agentId of [...busySince.keys()]) if (!busy.has(agentId)) busySince.delete(agentId);
  for (const agentId of busy) if (!busySince.has(agentId)) busySince.set(agentId, now);

  const recent = [...roster].sort((left, right) => activityAt(right) - activityAt(left));
  const unread = (agent: RosterEntry) => isUnread(agent.id);
  const agents = recent.slice(0, TRAY_RECENT_AGENTS).map(
    (agent, index): TrayAgent => ({
      agentId: agent.id,
      title: agent.name,
      avatar: avatarOf(agent),
      unread: unread(agent),
      busy: busy.has(agent.id),
      shortcutSlot: index + 1,
    }),
  );

  let face: TrayState["face"] = null;
  let faceSince = Number.NEGATIVE_INFINITY;
  for (const agent of roster) {
    const since = busySince.get(agent.id);
    if (since === undefined || since < faceSince) continue;
    faceSince = since;
    face = { agentId: agent.id, avatar: avatarOf(agent) };
  }

  const unreadCount = roster.filter((agent) => agent.notifications && unread(agent)).length;
  return { agents, face, unreadCount };
}
