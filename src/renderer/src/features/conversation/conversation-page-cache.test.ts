import type { ConversationMessage, ConversationPage } from "@openbot/contracts/ipc";
import { describe, expect, it, vi } from "vitest";
import {
  CACHED_AGENTS,
  CACHED_MESSAGES_PER_AGENT,
  createConversationPageCache,
  createConversationPrefetcher,
} from "./conversation-page-cache";

class MemoryStorage {
  readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

function message(id: string, extra: Partial<ConversationMessage> = {}): ConversationMessage {
  return {
    id,
    author: "agent",
    text: `text ${id}`,
    createdAt: "2026-11-04T00:00:00.000Z",
    status: "completed",
    ...extra,
  };
}

function page(agentId: string, count: number, extra: Partial<ConversationPage> = {}): ConversationPage {
  return {
    agentId,
    threadId: null,
    activeTurnId: "turn-1",
    revision: 42,
    messages: Array.from({ length: count }, (_, index) => message(`m-${agentId}-${index}`)),
    references: {},
    pageInfo: { hasOlder: false, olderCursor: null },
    readState: { unreadCount: 3, firstUnreadMessageId: null, throughMessageId: null },
    ...extra,
  };
}

describe("conversation page cache", () => {
  it("keeps the latest messages with no read state, no turn and a revision any host page beats", () => {
    const cache = createConversationPageCache({ storage: null });
    cache.remember("acct", "srv", page("a1", CACHED_MESSAGES_PER_AGENT + 10));
    const cached = cache.read("acct", "srv", "a1");
    expect(cached?.messages).toHaveLength(CACHED_MESSAGES_PER_AGENT);
    expect(cached?.messages.at(-1)?.id).toBe(`m-a1-${CACHED_MESSAGES_PER_AGENT + 9}`);
    expect(cached?.readState).toBeUndefined();
    expect(cached?.activeTurnId).toBeNull();
    expect(cached?.revision).toBe(-1);
    // A trimmed page has no cursor for what it dropped.
    expect(cached?.pageInfo).toEqual({ hasOlder: true, olderCursor: null });
    expect(cache.read("acct", "other", "a1")).toBeNull();
  });

  it("leaves streaming messages out and keeps the quotes the kept replies need", () => {
    const cache = createConversationPageCache({ storage: null });
    const original = message("orig");
    cache.remember(
      "acct",
      "srv",
      page("a1", 0, {
        messages: [message("r1", { replyToMessageId: "orig" }), message("s1", { status: "streaming" })],
        references: { orig: original, unused: message("unused") },
      }),
    );
    const cached = cache.read("acct", "srv", "a1");
    expect(cached?.messages.map((entry) => entry.id)).toEqual(["r1"]);
    expect(Object.keys(cached?.references ?? {})).toEqual(["orig"]);
  });

  it("evicts the least recently used agent past the limit", () => {
    const cache = createConversationPageCache({ storage: null });
    for (let index = 0; index < CACHED_AGENTS; index += 1) cache.remember("acct", "srv", page(`a${index}`, 1));
    // Reading a0 makes a1 the oldest.
    expect(cache.read("acct", "srv", "a0")).not.toBeNull();
    cache.remember("acct", "srv", page("new", 1));
    expect(cache.read("acct", "srv", "a1")).toBeNull();
    expect(cache.read("acct", "srv", "a0")).not.toBeNull();
    expect(cache.read("acct", "srv", "new")).not.toBeNull();
  });

  it("persists to its storage and reads it back in a new session, until it expires", () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    let now = Date.parse("2026-11-04T00:00:00.000Z");
    const first = createConversationPageCache({ storage, now: () => now, writeDelayMs: 50 });
    first.remember("acct", "srv", page("a1", 3));
    expect(storage.length).toBe(0);
    vi.advanceTimersByTime(60);
    expect(storage.length).toBe(1);

    const second = createConversationPageCache({ storage, now: () => now });
    expect(second.read("acct", "srv", "a1")?.messages).toHaveLength(3);

    now += 8 * 24 * 60 * 60 * 1000;
    const late = createConversationPageCache({ storage, now: () => now });
    expect(late.read("acct", "srv", "a1")).toBeNull();
    vi.useRealTimers();
  });

  it("drops a stored entry that does not decode", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "openbot:conversation-cache:v1:acct:srv",
      JSON.stringify({ entries: [{ agentId: "a1", savedAt: Date.now(), page: { agentId: "a1", messages: [{}] } }] }),
    );
    expect(createConversationPageCache({ storage }).read("acct", "srv", "a1")).toBeNull();
  });

  it("deletes the caches of an account but the servers it keeps, and every cache on sign-out", () => {
    const storage = new MemoryStorage();
    const cache = createConversationPageCache({ storage, writeDelayMs: 0 });
    cache.remember("acct", "keep", page("a1", 1));
    cache.remember("acct", "gone", page("a1", 1));
    cache.remember("other", "srv", page("a1", 1));
    cache.flush();
    cache.deleteAll("acct", ["keep"]);
    expect(cache.read("acct", "keep", "a1")).not.toBeNull();
    expect(cache.read("acct", "gone", "a1")).toBeNull();
    expect(cache.read("other", "srv", "a1")).not.toBeNull();
    cache.deleteAll(null);
    expect(storage.length).toBe(0);
    expect(cache.read("acct", "keep", "a1")).toBeNull();
  });
});

describe("conversation prefetcher", () => {
  function deferred() {
    let resolve = () => {};
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  it("reads two at a time, puts a pointed row first, and does not read a fresh chat again", async () => {
    const started: string[] = [];
    const reads = new Map<string, ReturnType<typeof deferred>>();
    const prefetcher = createConversationPrefetcher({
      read: (agentId) => {
        started.push(agentId);
        const read = deferred();
        reads.set(agentId, read);
        return read.promise;
      },
    });
    prefetcher.request(["a", "b", "c", "d"]);
    expect(started).toEqual(["a", "b"]);
    prefetcher.request(["d"], true);
    reads.get("a")?.resolve();
    await vi.waitFor(() => expect(started).toEqual(["a", "b", "d"]));
    prefetcher.request(["a", "b"]);
    reads.get("b")?.resolve();
    await vi.waitFor(() => expect(started).toEqual(["a", "b", "d", "c"]));
    prefetcher.dispose();
  });

  it("skips a chat that its open just read", () => {
    const read = vi.fn(() => Promise.resolve());
    const prefetcher = createConversationPrefetcher({ read });
    prefetcher.noteRead("a");
    prefetcher.request(["a"]);
    expect(read).not.toHaveBeenCalled();
  });
});
