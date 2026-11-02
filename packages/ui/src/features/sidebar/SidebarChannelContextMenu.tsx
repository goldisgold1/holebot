/** The right-click menu on a channel, in the pinned strip and in a section alike. */

import type { ChannelSummary } from "@openbot/contracts/ipc";
import { Bell, BellOff, ChevronRight, ContextMenu, EyeOff, Hash, Pin, PinOff, RotateCcw } from "@openbot/ui";
import { For, Show } from "solid-js";
import { useText } from "../../text";
import { DeleteIcon, EditIcon } from "./SidebarIcons";
import { SidebarMoveToSubmenu } from "./SidebarMoveToSubmenu";
import type { SidebarPinnedItem } from "./sidebar-pins";
import { useSidebarScope } from "./sidebar-scope";

const HOUR = 60 * 60 * 1000;
const CHANNEL_MUTE_CHOICES = [
  { label: "sidebar.channelMenu.mute1h", durationMs: HOUR },
  { label: "sidebar.channelMenu.mute8h", durationMs: 8 * HOUR },
  { label: "sidebar.channelMenu.mute1d", durationMs: 24 * HOUR },
  { label: "sidebar.channelMenu.mute7d", durationMs: 7 * 24 * HOUR },
  { label: "sidebar.channelMenu.muteAlways", durationMs: null },
] as const;

export function SidebarChannelContextMenu(menuProps: {
  channel: ChannelSummary;
  pinned: boolean;
  userHidden?: boolean | undefined;
}) {
  const { openDelete, props } = useSidebarScope();
  const { t } = useText();
  const ref = (): SidebarPinnedItem => ({ kind: "channel", id: menuProps.channel.id });
  return (
    <ContextMenu.Portal>
      <ContextMenu.Content class="agent-context-menu" aria-label={t("sidebar.channelMenu.label")}>
        <Show when={props.onCreateChannel}>
          <ContextMenu.Item onSelect={() => props.onCreateChannel?.()}>
            <Hash class="agent-context-icon size-4" aria-hidden="true" />
            <span>{t("sidebar.new.channel")}</span>
          </ContextMenu.Item>
        </Show>
        <ContextMenu.Item
          data-cuelume-tap="toggle"
          onSelect={() => (menuProps.pinned ? props.onUnpin(ref()) : props.onPin(ref()))}
        >
          <Show when={menuProps.pinned} fallback={<Pin class="agent-context-icon size-4" aria-hidden="true" />}>
            <PinOff class="agent-context-icon size-4" aria-hidden="true" />
          </Show>
          <span>{menuProps.pinned ? t("sidebar.unpin") : t("sidebar.pin")}</span>
        </ContextMenu.Item>
        <Show when={props.onSetChannelHidden && !menuProps.pinned}>
          <ContextMenu.Item
            onSelectAfterClose={() => props.onSetChannelHidden?.(menuProps.channel.id, !menuProps.userHidden)}
          >
            <Show
              when={menuProps.userHidden}
              fallback={<EyeOff class="agent-context-icon size-4" aria-hidden="true" />}
            >
              <RotateCcw class="agent-context-icon size-4" aria-hidden="true" />
            </Show>
            <span>{menuProps.userHidden ? t("sidebar.channelMenu.show") : t("sidebar.channelMenu.hide")}</span>
          </ContextMenu.Item>
        </Show>
        <Show when={props.onSetChannelMuted}>
          <Show
            when={props.mutedChannelIds?.includes(menuProps.channel.id)}
            fallback={
              <ContextMenu.Sub>
                <ContextMenu.SubTrigger>
                  <BellOff class="agent-context-icon size-4" aria-hidden="true" />
                  <span>{t("sidebar.channelMenu.mute")}</span>
                  <ChevronRight class="agent-context-submenu-chevron size-4" aria-hidden="true" />
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.SubContent
                    class="ui-action-menu agent-context-menu agent-context-submenu"
                    aria-label={t("sidebar.channelMenu.mute")}
                  >
                    {/* Signal's choices: 1 hour, 8 hours, 1 day, 7 days, always. */}
                    <For each={CHANNEL_MUTE_CHOICES}>
                      {(choice) => (
                        <ContextMenu.Item
                          onSelect={() => props.onSetChannelMuted?.(menuProps.channel.id, true, choice.durationMs)}
                        >
                          <span>{t(choice.label)}</span>
                        </ContextMenu.Item>
                      )}
                    </For>
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>
            }
          >
            <ContextMenu.Item onSelect={() => props.onSetChannelMuted?.(menuProps.channel.id, false, null)}>
              <Bell class="agent-context-icon size-4" aria-hidden="true" />
              <span>{t("sidebar.channelMenu.unmute")}</span>
            </ContextMenu.Item>
          </Show>
        </Show>
        <SidebarMoveToSubmenu chatId={menuProps.channel.id} />
        <ContextMenu.Item onSelect={() => props.onEditChannel?.(menuProps.channel.id)}>
          <EditIcon />
          <span>{t("sidebar.channelMenu.edit")}</span>
        </ContextMenu.Item>
        <Show when={props.onDeleteChannel}>
          <ContextMenu.Separator />
          <ContextMenu.Item
            class="ui-action-menu-danger agent-context-danger"
            onSelect={() => openDelete("channel", menuProps.channel.id)}
          >
            <DeleteIcon />
            <span>{t("sidebar.channelMenu.delete")}</span>
          </ContextMenu.Item>
        </Show>
      </ContextMenu.Content>
    </ContextMenu.Portal>
  );
}

/** The right-click menu on a row in Deleted channels. */
export function SidebarDeletedChannelContextMenu(menuProps: { channel: ChannelSummary }) {
  const { props } = useSidebarScope();
  const { t } = useText();
  return (
    <ContextMenu.Portal>
      <ContextMenu.Content class="agent-context-menu" aria-label={t("sidebar.channelMenu.label")}>
        <ContextMenu.Item onSelectAfterClose={() => props.onRestoreChannel?.(menuProps.channel.id)}>
          <RotateCcw class="agent-context-icon size-4" aria-hidden="true" />
          <span>{t("sidebar.channelMenu.restore")}</span>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Portal>
  );
}
