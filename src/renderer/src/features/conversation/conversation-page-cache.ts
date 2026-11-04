import { type ConversationMessage, type ConversationPage, isConversationMessage } from "@openbot/contracts/ipc";
import { isDynamicRecord, isNumber, isString } from "@openbot/contracts/runtime-values";

/*
 * HoleA.I (from Vincent's bot app): the bot app keeps the latest part of each chat on the device and
 * shows it the moment a chat opens, while the fresh page loads behind it. This is that cache: the
 * latest page of each agent chat of one account on one server, in memory and in the app's own
 * storage. It holds no read state, so a cached page never moves an unread count or a receipt.
 */

type CacheStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

const KEY_PREFIX = "openbot:conversation-cache:v1:";
export const CACHED_MESSAGES_PER_AGENT = 50;
export const CACHED_AGENTS = 30;
/** One chat with long messages must not take the whole budget. Characters of JSON. */
const MAX_ENTRY_CHARS = 256_000;
/** The whole cache of one server, so it stays far below the storage quota it shares. */
const MAX_TOTAL_CHARS = 2_000_000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const WRITE_DELAY_MS = 1000;

interface CacheEntry {
  agentId: string;
  savedAt: number;
  page: ConversationPage;
  chars: number;
}

export interface ConversationPageCacheOptions {
  storage?: CacheStorage | null;
  now?: () => number;
  /** The write to storage waits this long, so a burst of pages is one write. */
  writeDelayMs?: number;
}

function scopeKey(accountId: string, serverId: string): string {
  return `${KEY_PREFIX}${encodeURIComponent(accountId)}:${encodeURIComponent(serverId)}`;
}

function defaultStorage(): CacheStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The latest messages of a page with the quotes they need, and no read state. */
export function cachedPage(page: ConversationPage, limit = CACHED_MESSAGES_PER_AGENT): ConversationPage {
  const messages = page.messages.filter((message) => message.status !== "streaming").slice(-limit);
  const trimmed = messages.length < page.messages.length;
  const references: Record<string, ConversationMessage> = {};
  for (const message of messages) {
    const original = message.replyToMessageId ? page.references[message.replyToMessageId] : undefined;
    if (message.replyToMessageId && original) references[message.replyToMessageId] = original;
  }
  return {
    agentId: page.agentId,
    threadId: page.threadId,
    activeTurnId: null,
    // A cached page is older than anything the host sends, whatever revision the host counts from.
    revision: -1,
    messages,
    references,
    // A trimmed page has no cursor for the messages it dropped. The fresh page brings one.
    pageInfo: trimmed ? { hasOlder: true, olderCursor: null } : page.pageInfo,
  };
}

function decodeEntry(value: unknown, now: number): CacheEntry | null {
  if (!isDynamicRecord(value) || !isString(value.agentId) || !isNumber(value.savedAt)) return null;
  if (now - value.savedAt > MAX_AGE_MS) return null;
  const page = value.page;
  if (!isDynamicRecord(page) || page.agentId !== value.agentId || !Array.isArray(page.messages)) return null;
  if (!page.messages.every(isConversationMessage)) return null;
  const references: Record<string, ConversationMessage> = {};
  for (const [id, original] of Object.entries(isDynamicRecord(page.references) ? page.references : {})) {
    if (!isConversationMessage(original)) return null;
    references[id] = original;
  }
  const pageInfo = isDynamicRecord(page.pageInfo) ? page.pageInfo : {};
  const decoded: ConversationPage = {
    agentId: value.agentId,
    threadId: isString(page.threadId) ? page.threadId : null,
    activeTurnId: null,
    revision: -1,
    messages: page.messages,
    references,
    pageInfo: {
      hasOlder: pageInfo.hasOlder === true,
      olderCursor: isString(pageInfo.olderCursor) ? pageInfo.olderCursor : null,
    },
  };
  return { agentId: value.agentId, savedAt: value.savedAt, page: decoded, chars: JSON.stringify(decoded).length };
}

export type ConversationPageCache = ReturnType<typeof createConversationPageCache>;

/** One cache for the renderer. Each account and server has its own part, read on first use. */
export function createConversationPageCache(options: ConversationPageCacheOptions = {}) {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const now = options.now ?? Date.now;
  const writeDelayMs = options.writeDelayMs ?? WRITE_DELAY_MS;
  /** Per scope key, the entries from least to most recently used. */
  const scopes = new Map<string, Map<string, CacheEntry>>();
  const writes = new Map<string, ReturnType<typeof setTimeout>>();

  function load(key: string): Map<string, CacheEntry> {
    const loaded = scopes.get(key);
    if (loaded) return loaded;
    const entries = new Map<string, CacheEntry>();
    try {
      const raw = storage?.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      if (isDynamicRecord(parsed) && Array.isArray(parsed.entries)) {
        const at = now();
        for (const value of parsed.entries) {
          const entry = decodeEntry(value, at);
          if (entry) entries.set(entry.agentId, entry);
        }
      }
    } catch {
      // A broken or blocked storage only costs the cache. The chat still loads from the host.
    }
    scopes.set(key, entries);
    return entries;
  }

  function writeNow(key: string): void {
    writes.delete(key);
    const entries = scopes.get(key);
    if (!storage || !entries) return;
    try {
      if (entries.size === 0) storage.removeItem(key);
      else
        storage.setItem(
          key,
          JSON.stringify({
            entries: [...entries.values()].map(({ agentId, savedAt, page }) => ({ agentId, savedAt, page })),
          }),
        );
    } catch {
      // A full storage keeps the cache in memory only.
    }
  }

  function scheduleWrite(key: string): void {
    if (!storage || writes.has(key)) return;
    writes.set(
      key,
      setTimeout(() => writeNow(key), writeDelayMs),
    );
  }

  function evict(entries: Map<string, CacheEntry>): void {
    let total = 0;
    for (const entry of entries.values()) total += entry.chars;
    for (const [agentId, entry] of entries) {
      if (entries.size <= CACHED_AGENTS && total <= MAX_TOTAL_CHARS) break;
      entries.delete(agentId);
      total -= entry.chars;
    }
  }

  return {
    /** The cached latest page of an agent chat, or null. Reading it marks it recently used. */
    read(accountId: string, serverId: string, agentId: string): ConversationPage | null {
      const entries = load(scopeKey(accountId, serverId));
      const entry = entries.get(agentId);
      if (!entry) return null;
      if (now() - entry.savedAt > MAX_AGE_MS) {
        entries.delete(agentId);
        scheduleWrite(scopeKey(accountId, serverId));
        return null;
      }
      entries.delete(agentId);
      entries.set(agentId, entry);
      return entry.page;
    },
    /** Keeps the latest messages of a page that the host sent for the latest part of a chat. */
    remember(accountId: string, serverId: string, page: ConversationPage): void {
      const key = scopeKey(accountId, serverId);
      const entries = load(key);
      let limit = CACHED_MESSAGES_PER_AGENT;
      let stored = cachedPage(page, limit);
      let chars = JSON.stringify(stored).length;
      while (chars > MAX_ENTRY_CHARS && limit > 1) {
        limit = Math.floor(limit / 2);
        stored = cachedPage(page, limit);
        chars = JSON.stringify(stored).length;
      }
      entries.delete(page.agentId);
      if (chars <= MAX_ENTRY_CHARS && stored.messages.length > 0) {
        entries.set(page.agentId, { agentId: page.agentId, savedAt: now(), page: stored, chars });
        evict(entries);
      }
      scheduleWrite(key);
    },
    forget(accountId: string, serverId: string, agentId: string): void {
      const key = scopeKey(accountId, serverId);
      if (load(key).delete(agentId)) scheduleWrite(key);
    },
    /**
     * Deletes the caches of an account, but those of `keepServerIds`. With no account, it deletes
     * every account's cache, as after a sign-out.
     */
    deleteAll(accountId: string | null, keepServerIds: readonly string[] = []): void {
      const prefix = accountId === null ? KEY_PREFIX : `${KEY_PREFIX}${encodeURIComponent(accountId)}:`;
      const kept = new Set(accountId === null ? [] : keepServerIds.map((serverId) => scopeKey(accountId, serverId)));
      const keys = new Set([...scopes.keys()].filter((key) => key.startsWith(prefix)));
      try {
        for (let index = 0; storage && index < storage.length; index += 1) {
          const key = storage.key(index);
          if (key?.startsWith(prefix)) keys.add(key);
        }
      } catch {
        // Blocked storage holds no cache.
      }
      for (const key of keys) {
        if (kept.has(key)) continue;
        clearTimeout(writes.get(key));
        writes.delete(key);
        scopes.delete(key);
        try {
          storage?.removeItem(key);
        } catch {
          // Blocked storage holds no cache.
        }
      }
    },
    /** Writes what waits, for a test or a window that closes. */
    flush(): void {
      for (const key of [...writes.keys()]) {
        clearTimeout(writes.get(key));
        writeNow(key);
      }
    },
  };
}

export const conversationPageCache = createConversationPageCache();

/**
 * Reads pages in the background, a few at a time. A chat that a pointer reaches goes first. A chat
 * read a moment ago is not read again, and a read in flight is not started twice.
 */
export function createConversationPrefetcher(options: {
  read: (agentId: string) => Promise<void>;
  concurrency?: number;
  /** A chat read within this time is fresh enough. */
  freshMs?: number;
  now?: () => number;
}) {
  const concurrency = options.concurrency ?? 2;
  const freshMs = options.freshMs ?? 30_000;
  const now = options.now ?? Date.now;
  const queue: string[] = [];
  const running = new Set<string>();
  const readAt = new Map<string, number>();
  let disposed = false;

  function pump(): void {
    while (!disposed && running.size < concurrency && queue.length > 0) {
      const agentId = queue.shift();
      if (!agentId || running.has(agentId)) continue;
      running.add(agentId);
      void options
        .read(agentId)
        .then(
          () => readAt.set(agentId, now()),
          () => undefined,
        )
        .finally(() => {
          running.delete(agentId);
          pump();
        });
    }
  }

  function fresh(agentId: string): boolean {
    const at = readAt.get(agentId);
    return running.has(agentId) || (at !== undefined && now() - at < freshMs);
  }

  return {
    /** Queues chats in order. `urgent` puts them before the chats that wait. */
    request(agentIds: readonly string[], urgent = false): void {
      const wanted = agentIds.filter((agentId) => agentId && !fresh(agentId));
      for (const agentId of wanted) {
        const index = queue.indexOf(agentId);
        if (index >= 0) queue.splice(index, 1);
      }
      if (urgent) queue.unshift(...wanted);
      else queue.push(...wanted);
      pump();
    },
    /** A page read by the open of the chat counts as a fresh read. */
    noteRead(agentId: string): void {
      readAt.set(agentId, now());
    },
    dispose(): void {
      disposed = true;
      queue.length = 0;
    },
  };
}
