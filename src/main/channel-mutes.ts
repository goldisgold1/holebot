// HoleA.I: the group chats this computer muted, after Signal's per-chat mute. A mute lasts until its
// end time or, with none, until the user undoes it. A muted chat still notifies a mention.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ChannelMute } from "@openbot/contracts/ipc";
import { app } from "electron";

const FILE = "holeai-channel-mutes-v1.json";

let mutes: ChannelMute[] | undefined;

function path(): string {
  return join(app.getPath("userData"), FILE);
}

function load(): ChannelMute[] {
  if (mutes) return mutes;
  try {
    const value = JSON.parse(readFileSync(path(), "utf8"));
    mutes = Array.isArray(value)
      ? value.filter(
          (entry): entry is ChannelMute =>
            typeof entry?.serverId === "string" &&
            typeof entry?.channelId === "string" &&
            (entry.until === null || typeof entry.until === "number"),
        )
      : [];
  } catch {
    mutes = [];
  }
  return mutes;
}

/** The mutes in force now; ended ones are dropped. */
export function channelMutes(now = Date.now()): ChannelMute[] {
  return load().filter((mute) => mute.until === null || mute.until > now);
}

export function channelIsMuted(serverId: string, channelId: string, now = Date.now()): boolean {
  return channelMutes(now).some((mute) => mute.serverId === serverId && mute.channelId === channelId);
}

/** Mutes a chat for `durationMs`, or until undone with null; `muted` false undoes it. */
export function setChannelMuted(
  serverId: string,
  channelId: string,
  muted: boolean,
  durationMs: number | null,
  now = Date.now(),
): ChannelMute[] {
  const others = channelMutes(now).filter((mute) => !(mute.serverId === serverId && mute.channelId === channelId));
  mutes = muted ? [...others, { serverId, channelId, until: durationMs === null ? null : now + durationMs }] : others;
  try {
    writeFileSync(path(), JSON.stringify(mutes), "utf8");
  } catch {
    // The mute holds for this run.
  }
  return mutes;
}
