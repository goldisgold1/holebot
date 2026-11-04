import type { ConversationMessage, ConversationPage } from "@openbot/contracts/ipc";
import { describe, expect, it } from "vitest";
import { MobileConversationStore } from "./conversation-store";
import {
  CACHED_CHAT_MAX_AGE_MS,
  CACHED_CHAT_MESSAGES,
  cachedConversationPage,
  chatEvictions,
  chatsToPrefetch,
  parseCachedConversation,
  parseWorkspaceSnapshot,
  serializeCachedChat,
  serializeWorkspaceSnapshot,
} from "./workspace-cache";
import type { MobileAgent, MobileServer } from "./workspace-types";

const message = (index: number, status: ConversationMessage["status"] = "completed"): ConversationMessage => ({
  id: `m${index}`,
  turnId: `t${index}`,
  author: index % 2 ? "assistant" : "user",
  source: index % 2 ? "assistant" : "user",
  text: `message ${index}`,
  createdAt: new Date(index * 1000).toISOString(),
  status,
});

const page = (count: number, revision = 10): ConversationPage => ({
  agentId: "agent-1",
  threadId: null,
  activeTurnId: null,
  revision,
  messages: Array.from({ length: count }, (_, index) => message(index)),
  references: {},
  pageInfo: { hasOlder: true, olderCursor: "cursor-0" },
});

const server: MobileServer = {
  id: "server-1",
  name: "HoleA.I VPS",
  logoKey: null,
  kind: "remote",
  state: "online",
  initialConnectionPending: false,
  connectionMessage: "online",
  resuming: true,
  address: null,
  accent: "#fff",
  publicKey: "key",
  membershipId: "member-1",
  role: "member",
};

const agent: MobileAgent = {
  id: "agent-1",
  serverId: "server-1",
  name: "Chef",
  title: "",
  description: "",
  preview: "",
  updatedLabel: "",
  avatarSeed: "seed",
  avatarHue: null,
};

describe("workspace cache", () => {
  it("keeps the workspace and shows each server as not connected yet", () => {
    const text = serializeWorkspaceSnapshot({ servers: [server], agents: [agent], sidebar: {}, channels: {} }, 0);
    const snapshot = parseWorkspaceSnapshot(text, 1000);
    expect(snapshot?.agents).toEqual([agent]);
    expect(snapshot?.servers[0]).toMatchObject({ id: "server-1", state: "unknown", initialConnectionPending: true });
    expect(snapshot?.servers[0]?.resuming).toBeUndefined();
  });

  it("drops a damaged or old workspace and agents of unknown servers", () => {
    expect(parseWorkspaceSnapshot("{damaged", 0)).toBeNull();
    const text = serializeWorkspaceSnapshot(
      { servers: [server], agents: [agent, { ...agent, id: "agent-2", serverId: "gone" }], sidebar: {}, channels: {} },
      0,
    );
    expect(parseWorkspaceSnapshot(text, 1)?.agents.map((item) => item.id)).toEqual(["agent-1"]);
    expect(parseWorkspaceSnapshot(text, 31 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it("keeps the latest settled messages of a chat and no cursor for a cut window", () => {
    const long = page(CACHED_CHAT_MESSAGES + 10);
    long.messages.push(message(999, "streaming"));
    const kept = cachedConversationPage(long);
    expect(kept.messages).toHaveLength(CACHED_CHAT_MESSAGES);
    expect(kept.messages.at(-1)?.id).toBe(`m${CACHED_CHAT_MESSAGES + 9}`);
    expect(kept.pageInfo).toEqual({ hasOlder: false, olderCursor: null });
    expect(cachedConversationPage(page(3)).pageInfo).toEqual({ hasOlder: true, olderCursor: "cursor-0" });
  });

  it("reads back a saved chat until it is too old", () => {
    const text = serializeCachedChat(cachedConversationPage(page(3)), 0);
    expect(parseCachedConversation(text, 1000)?.messages.map((item) => item.id)).toEqual(["m0", "m1", "m2"]);
    expect(parseCachedConversation(text, CACHED_CHAT_MAX_AGE_MS + 1)).toBeNull();
    expect(parseCachedConversation("not json", 0)).toBeNull();
  });

  it("evicts old chats, then the least recently saved over the limit", () => {
    const entries = [
      { name: "a", savedAt: 5 },
      { name: "b", savedAt: 4 },
      { name: "c", savedAt: 3 },
      { name: "old", savedAt: -CACHED_CHAT_MAX_AGE_MS - 10 },
    ];
    expect(chatEvictions(entries, 0, 2).sort()).toEqual(["c", "old"]);
  });

  it("prefetches pinned chats first and skips loaded ones", () => {
    expect(chatsToPrefetch(["a", "b", "c", "d"], ["c", "x"], (id) => id === "a", 2)).toEqual(["c", "b"]);
  });

  it("opens a chat on its cached messages and lets the first read replace them", () => {
    const store = new MobileConversationStore(
      () => () => undefined,
      undefined,
      () => cachedConversationPage(page(3, 50)),
    );
    store.seedCached("agent-1");
    expect(store.get("agent-1")?.messages.map((item) => item.id)).toEqual(["m0", "m1", "m2"]);
    expect(store.isUpToDate("agent-1")).toBe(false);
    // The host's revision can be lower than the cached one, after a restart: the page still lands.
    const fresh = { ...page(2, 1), messages: [message(1), message(7)] };
    store.applyPage(fresh);
    expect(store.get("agent-1")?.messages.map((item) => item.id)).toEqual(["m1", "m7"]);
  });
});
