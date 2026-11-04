import {
  type ChannelPage,
  type ChannelSummary,
  type ConversationPage,
  decodeChannelPage,
  decodeChannelSummaries,
  isSidebarLayoutSnapshot,
  type SidebarLayoutSnapshot,
} from "@openbot/contracts/ipc";
import { isDynamicRecord, isNumber, isString } from "@openbot/contracts/runtime-values";
import { decodeConversationPage } from "./conversation";
import type { MobileAgent, MobileServer } from "./workspace-types";

/*
 * HoleA.I (from Vincent's bot app): the phone keeps the last known workspace (servers, agents, sections,
 * group chats) and the latest messages of recent chats, so home and a chat show at once while the
 * connection and the reads run behind them. This file is the pure part; `workspace-cache-files.ts`
 * reads and writes it in the app's own cache folder.
 */

/** A chat keeps at most this many of its latest messages on the phone. */
export const CACHED_CHAT_MESSAGES = 50;
/** The phone keeps the chats that were read last, up to this many. */
export const CACHED_CHAT_LIMIT = 30;
/** An older chat or workspace is too stale to show. */
export const CACHED_CHAT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const WORKSPACE_SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SNAPSHOT_VERSION = 1;

export interface WorkspaceSnapshot {
  servers: MobileServer[];
  agents: MobileAgent[];
  sidebar: Record<string, SidebarLayoutSnapshot>;
  channels: Record<string, ChannelSummary[]>;
}

/** The cache key of an agent chat or a group chat. */
export const agentChatKey = (agentId: string) => `agent:${agentId}`;
export const channelChatKey = (serverId: string, channelId: string) => `channel:${serverId}:${channelId}`;

/** A server as it shows before it connects: the connection state of the last run does not carry over. */
function restingServer(server: MobileServer): MobileServer {
  const {
    connectionFailure: _failure,
    recoveryStatus: _recovery,
    resuming: _resuming,
    keyChangedAt: _keyChangedAt,
    ...rest
  } = server;
  return { ...rest, state: "unknown", initialConnectionPending: true, connectionMessage: null };
}

function isServer(value: unknown): value is MobileServer {
  return (
    isDynamicRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    (value.kind === "local" || value.kind === "remote") &&
    isString(value.publicKey) &&
    isString(value.membershipId) &&
    isString(value.accent) &&
    (value.role === "owner" || value.role === "admin" || value.role === "member")
  );
}

function isAgent(value: unknown): value is MobileAgent {
  return (
    isDynamicRecord(value) &&
    isString(value.id) &&
    isString(value.serverId) &&
    isString(value.name) &&
    isString(value.title) &&
    isString(value.description) &&
    isString(value.preview) &&
    isString(value.updatedLabel) &&
    isString(value.avatarSeed)
  );
}

export function serializeWorkspaceSnapshot(snapshot: WorkspaceSnapshot, now: number): string {
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    savedAt: now,
    servers: snapshot.servers.map(restingServer),
    agents: snapshot.agents,
    sidebar: snapshot.sidebar,
    channels: snapshot.channels,
  });
}

/** The saved workspace, or null when there is none, it is too old, or it does not decode. */
export function parseWorkspaceSnapshot(text: string | null, now: number): WorkspaceSnapshot | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text);
    if (
      !isDynamicRecord(value) ||
      value.version !== SNAPSHOT_VERSION ||
      !isNumber(value.savedAt) ||
      now - value.savedAt > WORKSPACE_SNAPSHOT_MAX_AGE_MS ||
      !Array.isArray(value.servers) ||
      !Array.isArray(value.agents)
    )
      return null;
    const servers = value.servers.filter(isServer).map(restingServer);
    const serverIds = new Set(servers.map((server) => server.id));
    const sidebar: Record<string, SidebarLayoutSnapshot> = {};
    if (isDynamicRecord(value.sidebar))
      for (const [id, layout] of Object.entries(value.sidebar))
        if (serverIds.has(id) && isSidebarLayoutSnapshot(layout)) sidebar[id] = layout;
    const channels: Record<string, ChannelSummary[]> = {};
    if (isDynamicRecord(value.channels))
      for (const [id, list] of Object.entries(value.channels)) {
        if (!serverIds.has(id)) continue;
        try {
          channels[id] = decodeChannelSummaries(list);
        } catch {
          // The list comes from the host when it connects.
        }
      }
    return {
      servers,
      agents: value.agents.filter((agent): agent is MobileAgent => isAgent(agent) && serverIds.has(agent.serverId)),
      sidebar,
      channels,
    };
  } catch {
    return null;
  }
}

/**
 * The latest messages of a chat as the phone keeps them. A streamed message that did not end is left
 * out: the next read gives it whole. A cut window has no older cursor, so it never loads with a gap.
 */
export function cachedConversationPage(page: ConversationPage): ConversationPage {
  const settled = page.messages.filter((message) => message.status !== "streaming");
  const messages = settled.slice(-CACHED_CHAT_MESSAGES);
  const cut = messages.length < page.messages.length;
  const ids = new Set(messages.map((message) => message.id));
  const references = Object.fromEntries(
    Object.entries(page.references).filter(([id]) =>
      messages.some((message) => message.replyToMessageId === id && !ids.has(id)),
    ),
  );
  return {
    agentId: page.agentId,
    threadId: page.threadId,
    activeTurnId: null,
    revision: page.revision,
    messages,
    references,
    pageInfo: cut ? { hasOlder: false, olderCursor: null } : page.pageInfo,
  };
}

/** A group chat's latest messages, cut as the channel store cuts a chat that nobody reads. */
export function cachedChannelPage(page: ChannelPage): ChannelPage {
  const { typing: _typing, ...rest } = page;
  if (page.messages.length <= CACHED_CHAT_MESSAGES) return rest;
  const messages = page.messages.slice(-CACHED_CHAT_MESSAGES);
  const { olderCount: _count, oldestAt: _oldest, ...kept } = rest;
  return { ...kept, messages, olderCursor: messages[0]?.sequence ?? page.olderCursor };
}

export function serializeCachedChat(value: ConversationPage | ChannelPage, now: number): string {
  return JSON.stringify({ version: SNAPSHOT_VERSION, savedAt: now, value });
}

function parseCachedChat<T>(text: string | null, now: number, decode: (value: unknown) => T): T | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text);
    if (
      !isDynamicRecord(value) ||
      value.version !== SNAPSHOT_VERSION ||
      !isNumber(value.savedAt) ||
      now - value.savedAt > CACHED_CHAT_MAX_AGE_MS
    )
      return null;
    return decode(value.value);
  } catch {
    return null;
  }
}

export const parseCachedConversation = (text: string | null, now: number) =>
  parseCachedChat(text, now, decodeConversationPage);
export const parseCachedChannelPage = (text: string | null, now: number) =>
  parseCachedChat(text, now, decodeChannelPage);

/** The saved chats to delete: those too old, then the least recently saved over the limit. */
export function chatEvictions(
  entries: readonly { name: string; savedAt: number }[],
  now: number,
  limit = CACHED_CHAT_LIMIT,
): string[] {
  const fresh = entries.filter((entry) => now - entry.savedAt <= CACHED_CHAT_MAX_AGE_MS);
  const expired = entries.filter((entry) => now - entry.savedAt > CACHED_CHAT_MAX_AGE_MS).map((entry) => entry.name);
  const overflow = [...fresh]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(limit)
    .map((entry) => entry.name);
  return [...expired, ...overflow];
}

/**
 * The chats worth reading after a connection, in the order home shows them: pinned first, then the
 * rest, up to `count`. The bot app reads its five most recent chats at start the same way.
 */
export function chatsToPrefetch(
  agentIds: readonly string[],
  pinnedIds: readonly string[],
  isCurrent: (agentId: string) => boolean,
  count = 5,
): string[] {
  const listed = new Set(agentIds);
  const ordered = [...pinnedIds.filter((id) => listed.has(id)), ...agentIds];
  return [...new Set(ordered)].filter((id) => !isCurrent(id)).slice(0, count);
}
