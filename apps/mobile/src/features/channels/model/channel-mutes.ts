import { isDynamicRecord } from "@openbot/contracts/runtime-values";
import { File, Paths } from "expo-file-system";
import { create } from "zustand";

/**
 * HoleA.I: the group chats this phone muted, after Signal's per-chat mute and the desktop's
 * `holeai-channel-mutes-v1.json`. A mute lasts until `until` (ms) or, with null, until undone. A
 * muted chat still notifies a message that mentions the reader.
 *
 * The file sits in the app's files folder, where `OpenBotMessagingService.kt` reads it too: it drops
 * a sealed push of a muted chat's thread while the app does not run. So each mute keeps the thread
 * ids of the chat as they were when it was muted, and the app refreshes them from each channel list.
 */
export interface MobileChannelMute {
  serverId: string;
  channelId: string;
  until: number | null;
  threadIds: string[];
}

export const CHANNEL_MUTE_DURATIONS = {
  "1h": 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  always: null,
} as const satisfies Record<string, number | null>;
export type ChannelMuteDuration = keyof typeof CHANNEL_MUTE_DURATIONS;

const FILE = "holeai-channel-mutes-v1.json";

export const useChannelMutes = create<{ mutes: MobileChannelMute[]; loaded: boolean }>(() => ({
  mutes: [],
  loaded: false,
}));

function isMute(value: unknown): value is MobileChannelMute {
  return (
    isDynamicRecord(value) &&
    typeof value.serverId === "string" &&
    typeof value.channelId === "string" &&
    (value.until === null || typeof value.until === "number") &&
    Array.isArray(value.threadIds) &&
    value.threadIds.every((id) => typeof id === "string")
  );
}

function current(mutes: readonly MobileChannelMute[], now: number): MobileChannelMute[] {
  return mutes.filter((mute) => mute.until === null || mute.until > now);
}

function write(mutes: MobileChannelMute[]) {
  useChannelMutes.setState({ mutes });
  try {
    new File(Paths.document, FILE).writeSync(JSON.stringify(mutes));
  } catch {
    // The mute holds while the app runs.
  }
}

export function loadChannelMutes(): void {
  if (useChannelMutes.getState().loaded) return;
  try {
    const file = new File(Paths.document, FILE);
    const value = file.exists ? JSON.parse(file.textSync()) : [];
    useChannelMutes.setState({
      mutes: current(Array.isArray(value) ? value.filter(isMute) : [], Date.now()),
      loaded: true,
    });
  } catch {
    useChannelMutes.setState({ loaded: true });
  }
}

export function channelMuteOf(
  mutes: readonly MobileChannelMute[],
  serverId: string,
  channelId: string,
  now = Date.now(),
): MobileChannelMute | null {
  return current(mutes, now).find((mute) => mute.serverId === serverId && mute.channelId === channelId) ?? null;
}

export function isChannelMuted(serverId: string, channelId: string, now = Date.now()): boolean {
  loadChannelMutes();
  return channelMuteOf(useChannelMutes.getState().mutes, serverId, channelId, now) !== null;
}

/** Whether a push about this agent thread belongs to a chat the reader muted. */
export function isThreadMuted(serverId: string | null, threadId: string | null, now = Date.now()): boolean {
  if (!threadId) return false;
  loadChannelMutes();
  return current(useChannelMutes.getState().mutes, now).some(
    (mute) => (serverId === null || mute.serverId === serverId) && mute.threadIds.includes(threadId),
  );
}

/** Mutes a chat for a duration, or undoes the mute with `null`. */
export function setChannelMuted(
  serverId: string,
  channelId: string,
  duration: ChannelMuteDuration | null,
  threadIds: readonly string[],
  now = Date.now(),
): void {
  loadChannelMutes();
  const others = current(useChannelMutes.getState().mutes, now).filter(
    (mute) => !(mute.serverId === serverId && mute.channelId === channelId),
  );
  if (duration === null) {
    write(others);
    return;
  }
  const length = CHANNEL_MUTE_DURATIONS[duration];
  write([...others, { serverId, channelId, until: length === null ? null : now + length, threadIds: [...threadIds] }]);
}

/** Keeps each muted chat's thread ids current with a new channel list of its server. */
export function refreshMutedThreads(
  serverId: string,
  channels: readonly { id: string; threads?: readonly { threadId: string }[] }[],
): void {
  loadChannelMutes();
  const mutes = useChannelMutes.getState().mutes;
  let changed = false;
  const next = mutes.map((mute) => {
    if (mute.serverId !== serverId) return mute;
    const channel = channels.find((candidate) => candidate.id === mute.channelId);
    const threadIds = channel?.threads?.map((thread) => thread.threadId) ?? mute.threadIds;
    if (threadIds.join("\n") === mute.threadIds.join("\n")) return mute;
    changed = true;
    return { ...mute, threadIds };
  });
  if (changed) write(next);
}
