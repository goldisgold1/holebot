import type { ChannelPage, ConversationPage } from "@openbot/contracts/ipc";
import { Directory, File, Paths } from "expo-file-system";
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
  type WorkspaceSnapshot,
} from "./workspace-cache";

/*
 * HoleA.I (from Vincent's bot app): the files of `workspace-cache.ts`, in the app's cache folder, one
 * folder for each account. Writes wait a moment and run together, so a streamed reply does not write
 * on each chunk. Any failure only costs the cache: the workspace still loads from the host.
 */
const ROOT = "holeai-workspace-v1";
const WRITE_DELAY_MS = 1_500;

/** A short stable name for the account folder. It holds no address or id in the clear. */
function accountFolderName(apiUrl: string, userId: string): string {
  let hash = 0x811c9dc5;
  for (const char of `${apiUrl}\n${userId}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

const fileName = (key: string) => `${key.replace(/[^A-Za-z0-9._-]/gu, "_")}.json`;

function readText(file: File): string | null {
  try {
    return file.exists ? file.textSync() : null;
  } catch {
    return null;
  }
}

function writeText(folder: Directory, name: string, text: string): void {
  folder.create({ intermediates: true, idempotent: true });
  const temporary = new File(folder, `${name}.tmp`);
  temporary.writeSync(text);
  temporary.moveSync(new File(folder, name), { overwrite: true });
}

export interface WorkspaceCacheFiles {
  readSnapshot(): WorkspaceSnapshot | null;
  saveSnapshot(snapshot: WorkspaceSnapshot): void;
  readConversation(agentId: string): ConversationPage | null;
  saveConversation(page: ConversationPage): void;
  readChannelPage(serverId: string, channelId: string): ChannelPage | null;
  saveChannelPage(serverId: string, page: ChannelPage): void;
  forgetConversation(agentId: string): void;
  dispose(): void;
}

export function createWorkspaceCacheFiles(apiUrl: string, userId: string): WorkspaceCacheFiles {
  const folder = new Directory(Paths.cache, ROOT, accountFolderName(apiUrl, userId));
  const chats = new Directory(folder, "chats");
  const pending = new Map<string, () => string | null>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const evict = () => {
    const entries = chats
      .list()
      .flatMap((entry) =>
        entry instanceof File && entry.name.endsWith(".json")
          ? [{ name: entry.name, savedAt: entry.modificationTime ?? 0 }]
          : [],
      );
    for (const name of chatEvictions(entries, Date.now())) new File(chats, name).delete();
  };

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending.size) return;
    const writes = [...pending];
    pending.clear();
    let wroteChat = false;
    for (const [key, text] of writes) {
      try {
        const value = text();
        if (key === "workspace") {
          if (value !== null) writeText(folder, "workspace.json", value);
          continue;
        }
        const file = new File(chats, fileName(key));
        if (value === null) {
          if (file.exists) file.delete();
        } else {
          writeText(chats, fileName(key), value);
          wroteChat = true;
        }
      } catch {
        // The cache misses this write.
      }
    }
    try {
      if (wroteChat) evict();
    } catch {
      // The next write evicts.
    }
  };

  const schedule = (key: string, text: () => string | null) => {
    pending.set(key, text);
    timer ??= setTimeout(flush, WRITE_DELAY_MS);
  };

  return {
    readSnapshot: () => parseWorkspaceSnapshot(readText(new File(folder, "workspace.json")), Date.now()),
    saveSnapshot: (snapshot) => schedule("workspace", () => serializeWorkspaceSnapshot(snapshot, Date.now())),
    readConversation: (agentId) =>
      parseCachedConversation(readText(new File(chats, fileName(agentChatKey(agentId)))), Date.now()),
    saveConversation: (page) =>
      schedule(agentChatKey(page.agentId), () => {
        const kept = cachedConversationPage(page);
        return kept.messages.length ? serializeCachedChat(kept, Date.now()) : null;
      }),
    readChannelPage: (serverId, channelId) =>
      parseCachedChannelPage(readText(new File(chats, fileName(channelChatKey(serverId, channelId)))), Date.now()),
    saveChannelPage: (serverId, page) =>
      schedule(channelChatKey(serverId, page.channel.id), () =>
        serializeCachedChat(cachedChannelPage(page), Date.now()),
      ),
    forgetConversation: (agentId) => schedule(agentChatKey(agentId), () => null),
    // The provider ends with the session, such as at a sign-out that deleted the cache: nothing more is written.
    dispose: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      pending.clear();
    },
  };
}

/** Deletes the saved workspaces of every account, as after a sign-out. */
export function deleteWorkspaceCaches(): void {
  try {
    const root = new Directory(Paths.cache, ROOT);
    if (root.exists) root.delete();
  } catch {
    // Nothing is saved, or the system clears the cache folder itself.
  }
}
