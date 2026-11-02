import type { ChannelSummary } from "@openbot/contracts/ipc";
import { isDynamicRecord } from "@openbot/contracts/runtime-values";
import type { AppTranslate } from "@openbot/i18n";
import { channelPeopleNotifications } from "@openbot/team-client/channel-notifications";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { androidChannelId } from "@/features/push-notifications/android-notification-channels";
import { serverNotificationSetting, usePushNotificationPreference } from "@/features/settings/model/push-notifications";
import { isChannelMuted } from "./channel-mutes";
import { groupChatText } from "./group-chat-text";

/** The last channel list of each server: the first one is the baseline, as on the desktop. */
const previousLists = new Map<string, readonly ChannelSummary[]>();

// The shared function words its notifications with the desktop catalog keys; the phone has its own text.
function phoneTranslate(key: string, values?: unknown): string {
  const person = isDynamicRecord(values) ? String(values.person ?? values.agent ?? "") : "";
  const channel = isDynamicRecord(values) ? String(values.channel ?? "") : "";
  if (key === "notification.channelMention") return groupChatText.mentionedYou(person, channel);
  if (key === "notification.channelTitle") return groupChatText.personInChat(person, channel);
  return groupChatText.sentMessage;
}
const translate: AppTranslate = phoneTranslate;

/**
 * HoleA.I: a teammate's new message in a group chat notifies while the app runs, after Signal and the
 * desktop (`channelPeopleNotifications`). A chat the reader muted notifies only a message that
 * mentions them. The notification switches and the server's level and mute in Settings apply.
 */
export function notifyGroupChatPeople(serverId: string, channels: readonly ChannelSummary[]): void {
  const previous = previousLists.get(serverId) ?? null;
  previousLists.set(serverId, channels);
  const preference = usePushNotificationPreference.getState();
  if (!preference.ready || !preference.enabled || preference.permission !== "granted") return;
  const setting = serverNotificationSetting(preference, serverId);
  const now = Date.now();
  if (setting.mute && (setting.mute.until === null || setting.mute.until > now)) return;
  const notifications = channelPeopleNotifications(previous, channels, {
    translate,
    level: setting.level,
    redact: preference.preview ? (text) => text : null,
    muted: (channelId) => isChannelMuted(serverId, channelId, now),
  });
  const sound = preference.playSound ? preference.sound : null;
  for (const notification of notifications) {
    void Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: { serverId, channelId: notification.channelId },
      },
      trigger: Platform.OS === "android" ? { channelId: androidChannelId(sound) } : null,
    }).catch(() => undefined);
  }
}
