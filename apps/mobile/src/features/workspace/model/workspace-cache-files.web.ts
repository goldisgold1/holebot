import {
  agentChatKey,
  cachedChannelPage,
  cachedConversationPage,
  channelChatKey,
  chatEvictions,
  parseCachedChannelPage,
  parseCachedConversation,
  parseWorkspaceSnapshot,
  serializeCachedChat,
  serializeWorkspaceSnapshot,
} from "./workspace-cache";
import type { WorkspaceCacheFiles } from "./workspace-cache-files";

/*
 * HoleA.I: the web build of `workspace-cache-files.ts`. A browser has no app cache folder (expo-file-system
 * throws there and blanked the page after sign-in), so the same entries live in localStorage. Any failure
 * only costs the cache: the workspace still loads from the host.
 */
const ROOT = "holeai-workspace-v1";
const WRITE_DELAY_MS = 1_500;

function accountFolderName(apiUrl: string, userId: string): string {
  let hash = 0x811c9dc5;
  for (const char of `${apiUrl}\n${userId}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function createWorkspaceCacheFiles(apiUrl: string, userId: string): WorkspaceCacheFiles {
  const prefix = `${ROOT}:${accountFolderName(apiUrl, userId)}:`;
  const chatPrefix = `${prefix}chats:`;
  const savedAtPrefix = `${prefix}saved:`;
  const pending = new Map<string, () => string | null>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const evict = (store: Storage) => {
    const entries: { name: string; savedAt: number }[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (!key?.startsWith(chatPrefix)) continue;
      const name = key.slice(chatPrefix.length);
      entries.push({ name, savedAt: Number(store.getItem(`${savedAtPrefix}${name}`)) || 0 });
    }
    for (const name of chatEvictions(entries, Date.now())) {
      store.removeItem(`${chatPrefix}${name}`);
      store.removeItem(`${savedAtPrefix}${name}`);
    }
  };

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const store = storage();
    if (!pending.size || !store) return;
    const writes = [...pending];
    pending.clear();
    let wroteChat = false;
    for (const [key, text] of writes) {
      try {
        const value = text();
        if (key === "workspace") {
          if (value !== null) store.setItem(`${prefix}workspace`, value);
          continue;
        }
        if (value === null) {
          store.removeItem(`${chatPrefix}${key}`);
          store.removeItem(`${savedAtPrefix}${key}`);
        } else {
          store.setItem(`${chatPrefix}${key}`, value);
          store.setItem(`${savedAtPrefix}${key}`, String(Date.now()));
          wroteChat = true;
        }
      } catch {
        // The cache misses this write (a full storage, say).
      }
    }
    try {
      if (wroteChat) evict(store);
    } catch {
      // The next write evicts.
    }
  };

  const schedule = (key: string, text: () => string | null) => {
    pending.set(key, text);
    timer ??= setTimeout(flush, WRITE_DELAY_MS);
  };

  return {
    readSnapshot: () => parseWorkspaceSnapshot(read(`${prefix}workspace`), Date.now()),
    saveSnapshot: (snapshot) => schedule("workspace", () => serializeWorkspaceSnapshot(snapshot, Date.now())),
    readConversation: (agentId) => parseCachedConversation(read(`${chatPrefix}${agentChatKey(agentId)}`), Date.now()),
    saveConversation: (page) =>
      schedule(agentChatKey(page.agentId), () => {
        const kept = cachedConversationPage(page);
        return kept.messages.length ? serializeCachedChat(kept, Date.now()) : null;
      }),
    readChannelPage: (serverId, channelId) =>
      parseCachedChannelPage(read(`${chatPrefix}${channelChatKey(serverId, channelId)}`), Date.now()),
    saveChannelPage: (serverId, page) =>
      schedule(channelChatKey(serverId, page.channel.id), () =>
        serializeCachedChat(cachedChannelPage(page), Date.now()),
      ),
    forgetConversation: (agentId) => schedule(agentChatKey(agentId), () => null),
    dispose: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      pending.clear();
    },
  };
}

/** Deletes the saved workspaces of every account, as after a sign-out. */
export function deleteWorkspaceCaches(): void {
  const store = storage();
  if (!store) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith(`${ROOT}:`)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    // Nothing is saved.
  }
}
