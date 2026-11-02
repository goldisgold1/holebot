import { type ConversationReaction, MESSAGE_REACTIONS, MORE_MESSAGE_REACTIONS } from "@openbot/contracts/ipc";
import {
  applyChannelReaction,
  CHANNEL_REACTION_GROUPS_SHOWN,
  type ChannelReaction,
  groupChannelReactions,
} from "@openbot/contracts/signal-port/reactions";
import { Button, Typography } from "heroui-native";
import { useThemeColor } from "heroui-native/hooks";
import Check from "lucide-react-native/icons/check";
import Copy from "lucide-react-native/icons/copy";
import SmilePlus from "lucide-react-native/icons/face-slightly-smiling-plus";
import Plus from "lucide-react-native/icons/plus";
import Reply from "lucide-react-native/icons/reply";
import Square from "lucide-react-native/icons/square";
import TextSelect from "lucide-react-native/icons/square-dashed-text";
import Volume2 from "lucide-react-native/icons/volume-2";
import { type PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { type AccessibilityState, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { showFailureAlert } from "@/features/analytics/failure-reports";
import { toggleReadAloud, useReadingAloud } from "@/features/voice/model/message-reading";
import type { MobileAgent } from "@/features/workspace/context/mobile-workspace-context";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";
import { groupChatText } from "../../channels/model/group-chat-text";
import { useCopyMessage } from "./use-copy-message";
import { useHistoryShown } from "./use-history-shown";

const PICKER_IN = FadeIn.duration(160).reduceMotion(ReduceMotion.System);
const PICKER_OUT = FadeOut.duration(120).reduceMotion(ReduceMotion.System);
const ICON_SIZE = 18;
const PRESSED = { transform: [{ scale: 0.94 }] };

/**
 * A button of the row under a message, with the size and look of a small ghost HeroUI `Button`. It
 * is a plain pressable: each message in the chat has up to five of these, and each HeroUI button mounts an
 * animated pressable with about nine shared values and four animated styles, which made the chat
 * lag while it scrolled. The press shows at once, without an animation.
 */
function ActionButton({
  accessibilityLabel,
  accessibilityState,
  onPress,
  selected = false,
  label = false,
  children,
}: PropsWithChildren<{
  accessibilityLabel: string;
  accessibilityState?: AccessibilityState;
  onPress: () => void;
  /** Drawn as a pressed HeroUI `secondary` button. */
  selected?: boolean;
  /** An emoji, not an icon: the button takes the width of its content. */
  label?: boolean;
}>) {
  // An icon draws only once the chat shows its history. The button keeps its size without it, so
  // the row does not move, and a chat that opens does not wait for the icons of every row.
  const historyShown = useHistoryShown();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPress={onPress}
      className={`h-10 items-center justify-center rounded-full active:bg-default-hover/30 ${label ? "px-2" : "w-10"} ${selected ? "bg-default" : ""}`}
      style={({ pressed }) => (pressed ? PRESSED : undefined)}
    >
      {historyShown || label ? children : null}
    </Pressable>
  );
}

/** Reads the message aloud with the reply voice from the settings. A second tap stops it. */
function ReadAloudButton({
  messageId,
  text,
  color,
  selectedColor,
}: {
  messageId: string;
  text: string;
  color: string;
  selectedColor: string;
}) {
  const { t } = useText();
  const reading = useReadingAloud(messageId);
  return (
    <ActionButton
      selected={reading}
      accessibilityLabel={reading ? t("mobile.chat.message.stopReading") : t("mobile.chat.message.readAloud")}
      accessibilityState={{ selected: reading }}
      onPress={() => {
        void haptics.selection();
        toggleReadAloud(messageId, text);
      }}
    >
      {reading ? <Square size={ICON_SIZE} color={selectedColor} /> : <Volume2 size={ICON_SIZE} color={color} />}
    </ActionButton>
  );
}

/**
 * The row under a message: its reactions, Copy, Read aloud, React, Reply, Select text and the time. A
 * phone has no hover, so the row always shows, and each action takes one tap.
 */
export function ChatMessageActions({
  align,
  copyText,
  createdAt,
  reactions,
  agentsById,
  onReact,
  onReply,
  onSelectText,
  selecting = false,
  readAloudId,
  channelReactions,
  viewer,
  pickerRequest = 0,
}: {
  align: "start" | "end";
  /** The text that Copy puts on the clipboard. Empty for a message of files only. */
  copyText: string;
  createdAt?: string;
  reactions?: readonly ConversationReaction[];
  agentsById: ReadonlyMap<string, MobileAgent>;
  /** Unset where a reaction cannot be saved. `null` removes the reader's reaction. */
  onReact?: (emoji: string | null) => Promise<void>;
  onReply?: () => void;
  /** Starts the selection of the text in the bubble, or ends it while `selecting`. */
  onSelectText?: () => void;
  selecting?: boolean;
  /** The message that Read aloud reads. Unset where the app cannot read aloud. */
  readAloudId?: string;
  /**
   * HoleA.I: set in a group chat. The people's reactions, one each, drawn as Signal's pills: one per
   * emoji with its count, the reader's own lit, and "+N" past three. `reactions` is unused there.
   */
  channelReactions?: readonly ChannelReaction[];
  /** The reader in a group chat: their member id and name, for their own reaction. */
  viewer?: { id: string; name: string } | null;
  /** Opens the emoji picker each time it grows, as a touch and hold on a group chat message does. */
  pickerRequest?: number;
}) {
  const { t, format } = useText();
  const [mutedColor, foregroundColor] = useThemeColor(["muted", "foreground"]);
  const muted = String(mutedColor);
  const { copy, copied } = useCopyMessage(copyText);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreEmoji, setMoreEmoji] = useState(false);
  // The reader's reaction shows at once. The host sends the saved list after it, and that list wins.
  const [pending, setPending] = useState<{
    emoji: string | null;
    over: readonly ConversationReaction[] | undefined;
  } | null>(null);
  const shown =
    pending && pending.over === reactions
      ? [
          ...(pending.emoji ? [{ emoji: pending.emoji, actor: { kind: "user" as const } }] : []),
          ...(reactions ?? []).filter((reaction) => reaction.actor.kind !== "user"),
        ]
      : (reactions ?? []);
  // A group chat: the reader's choice shows at once over the host's list, until the next list comes.
  const [pendingChannel, setPendingChannel] = useState<{
    emoji: string | null;
    over: readonly ChannelReaction[] | undefined;
  } | null>(null);
  const channelMode = channelReactions !== undefined;
  const viewerId = viewer?.id ?? null;
  const channelShown = useMemo(
    () =>
      channelMode && pendingChannel && pendingChannel.over === channelReactions && viewer
        ? applyChannelReaction(channelReactions, viewer, pendingChannel.emoji, Date.now())
        : (channelReactions ?? []),
    [channelMode, pendingChannel, channelReactions, viewer],
  );
  const channelGroups = useMemo(() => groupChannelReactions(channelShown, viewerId), [channelShown, viewerId]);
  const own = channelMode
    ? (channelShown.find((reaction) => reaction.memberId === viewerId)?.emoji ?? null)
    : (shown.find((reaction) => reaction.actor.kind === "user")?.emoji ?? null);
  const seenRequest = useRef(pickerRequest);
  useEffect(() => {
    if (pickerRequest === seenRequest.current) return;
    seenRequest.current = pickerRequest;
    if (onReact) {
      setPickerOpen(true);
      setMoreEmoji(false);
    }
  }, [pickerRequest, onReact]);

  const react = (emoji: string | null) => {
    if (!onReact) return;
    setPickerOpen(false);
    setMoreEmoji(false);
    if (channelMode) setPendingChannel({ emoji, over: channelReactions });
    else setPending({ emoji, over: reactions });
    void haptics.selection();
    onReact(emoji).catch((error: unknown) => {
      setPending(null);
      setPendingChannel(null);
      void haptics.notification("error");
      showFailureAlert(error, "turn", t("mobile.chat.message.reactionFailed"), t("mobile.chat.copyFailedMessage"));
    });
  };
  const time = useMemo(
    () => (createdAt ? format.date(new Date(createdAt), { timeStyle: "short" }) : null),
    [createdAt, format],
  );

  return (
    // The space under the row sets each message apart from the next one. Markers and activity rows
    // have no action row, so they keep the list's own smaller gap.
    <View className={`gap-1 pb-2 ${align === "end" ? "items-end self-end" : "items-start self-start"}`}>
      <View
        accessibilityRole="toolbar"
        accessibilityLabel={t("mobile.chat.message.actions")}
        className="flex-row items-center"
      >
        {channelMode
          ? channelGroups.slice(0, CHANNEL_REACTION_GROUPS_SHOWN).map((group) => (
              <Pressable
                key={group.emoji}
                accessibilityRole="button"
                accessibilityLabel={`${groupChatText.reactionPill(group.emoji, group.count, group.names)}. ${
                  group.mine ? groupChatText.removeReaction(group.emoji) : groupChatText.addSameReaction(group.emoji)
                }`}
                accessibilityState={{ selected: group.mine }}
                disabled={!onReact}
                onPress={() => react(group.mine ? null : group.emoji)}
                className={`mr-1 h-7 flex-row items-center gap-1 rounded-full px-2 ${
                  group.mine ? "bg-accent/25 border border-accent/60" : "bg-control"
                }`}
                style={({ pressed }) => (pressed ? PRESSED : undefined)}
              >
                <Typography type="body-sm">{group.emoji}</Typography>
                {group.count > 1 ? (
                  <Typography type="body-xs" className={group.mine ? "text-accent-text" : "text-muted"}>
                    {group.count}
                  </Typography>
                ) : null}
              </Pressable>
            ))
          : null}
        {channelMode && channelGroups.length > CHANNEL_REACTION_GROUPS_SHOWN ? (
          <View
            accessible
            accessibilityLabel={groupChatText.reactionMore(channelGroups.length - CHANNEL_REACTION_GROUPS_SHOWN)}
            className="mr-1 h-7 items-center justify-center rounded-full bg-control px-2"
          >
            <Typography type="body-xs" className="text-muted">
              +{channelGroups.length - CHANNEL_REACTION_GROUPS_SHOWN}
            </Typography>
          </View>
        ) : null}
        {(channelMode ? [] : shown).map((reaction) =>
          reaction.actor.kind === "user" && onReact ? (
            <ActionButton
              key="user"
              label
              accessibilityLabel={t("mobile.chat.message.removeReaction", { emoji: reaction.emoji })}
              onPress={() => react(null)}
            >
              <Typography>{reaction.emoji}</Typography>
            </ActionButton>
          ) : (
            <View
              key={reaction.actor.kind === "agent" ? `agent:${reaction.actor.agentId}` : "user"}
              accessible
              accessibilityRole="image"
              accessibilityLabel={
                reaction.actor.kind === "agent"
                  ? t("mobile.chat.message.agentReaction", {
                      name: agentsById.get(reaction.actor.agentId)?.name ?? "",
                      emoji: reaction.emoji,
                    })
                  : reaction.emoji
              }
              className="px-2"
            >
              <Typography>{reaction.emoji}</Typography>
            </View>
          ),
        )}
        {copyText ? (
          <ActionButton
            accessibilityLabel={copied ? t("mobile.chat.message.copied") : t("mobile.chat.message.copy")}
            onPress={() => void copy()}
          >
            {copied ? <Check size={ICON_SIZE} color={muted} /> : <Copy size={ICON_SIZE} color={muted} />}
          </ActionButton>
        ) : null}
        {readAloudId && copyText ? (
          <ReadAloudButton
            messageId={readAloudId}
            text={copyText}
            color={muted}
            selectedColor={String(foregroundColor)}
          />
        ) : null}
        {onReact ? (
          <ActionButton
            accessibilityLabel={t("mobile.chat.message.addReaction")}
            accessibilityState={{ expanded: pickerOpen }}
            onPress={() => {
              void haptics.selection();
              setPickerOpen((open) => !open);
              setMoreEmoji(false);
            }}
          >
            <SmilePlus size={ICON_SIZE} color={muted} />
          </ActionButton>
        ) : null}
        {onReply ? (
          <ActionButton
            accessibilityLabel={t("mobile.chat.message.reply")}
            onPress={() => {
              void haptics.selection();
              onReply();
            }}
          >
            <Reply size={ICON_SIZE} color={muted} />
          </ActionButton>
        ) : null}
        {onSelectText ? (
          <ActionButton
            // Drawn as pressed while the text is selected: a second tap ends the selection.
            selected={selecting}
            accessibilityLabel={t("mobile.chat.message.selectText")}
            accessibilityState={{ selected: selecting }}
            onPress={() => {
              void haptics.selection();
              onSelectText();
            }}
          >
            <TextSelect size={ICON_SIZE} color={selecting ? String(foregroundColor) : muted} />
          </ActionButton>
        ) : null}
        {time ? (
          <Typography.Paragraph type="body-xs" className="px-1 text-muted">
            {time}
          </Typography.Paragraph>
        ) : null}
      </View>
      {pickerOpen ? (
        <Animated.View
          entering={PICKER_IN}
          exiting={PICKER_OUT}
          accessibilityLabel={t("mobile.chat.message.addReaction")}
          className="flex-row flex-wrap items-center rounded-3xl bg-control/60 px-1"
          style={{ borderCurve: "continuous" }}
        >
          {[...MESSAGE_REACTIONS, ...(moreEmoji ? MORE_MESSAGE_REACTIONS : [])].map((emoji) => (
            <Button
              key={emoji}
              isIconOnly
              variant={emoji === own ? "secondary" : "ghost"}
              accessibilityLabel={t("mobile.chat.message.react", { emoji })}
              accessibilityState={{ selected: emoji === own }}
              onPress={() => react(emoji === own ? null : emoji)}
            >
              <Typography className="text-xl">{emoji}</Typography>
            </Button>
          ))}
          {moreEmoji ? null : (
            <Button
              isIconOnly
              variant="ghost"
              accessibilityLabel={t("mobile.chat.message.moreEmoji")}
              onPress={() => {
                void haptics.selection();
                setMoreEmoji(true);
              }}
            >
              <Plus size={ICON_SIZE} color={muted} />
            </Button>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}
