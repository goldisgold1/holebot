/**
 * HoleA.I: "Group chats", after every agent section. The agents are always first; a group chat that
 * is not pinned or hidden is listed here instead of in an agent folder. Like "Hidden", it is not a
 * section of the layout: it has no drag target and no section menu. Its collapsed state is kept in
 * the same per-scope storage as the sections.
 */

import { Button, ChevronDown } from "@openbot/ui";
import { For, Show } from "solid-js";
import { useText } from "../../text";
import { SidebarChannelRow } from "./SidebarChannelRow";
import { useSidebarScope } from "./sidebar-scope";
import { SIDEBAR_GROUP_CHATS_ID } from "./sidebar-types";

const BODY_ID = "sidebar-group-chats-body";

export function SidebarGroupChatsGroup() {
  const { groupChats, props, sectionIsCollapsed } = useSidebarScope();
  const { t } = useText();
  const open = () => !sectionIsCollapsed(SIDEBAR_GROUP_CHATS_ID);
  return (
    <Show when={groupChats().length > 0}>
      <section class="sidebar-chat-group sidebar-section" aria-label={t("sidebar.groupChats.title")}>
        <header>
          <Button
            variant="ghost"
            type="button"
            class="sidebar-section-toggle"
            aria-expanded={open() ? "true" : "false"}
            aria-controls={BODY_ID}
            data-cuelume-open={open() ? undefined : ""}
            data-cuelume-close={open() ? "" : undefined}
            data-cuelume-emphasis="subtle"
            onClick={() => props.onToggleSection(SIDEBAR_GROUP_CHATS_ID)}
          >
            <span class="sidebar-section-name">{t("sidebar.groupChats.title")}</span>
            <ChevronDown
              class={`sidebar-section-chevron size-4${open() ? "" : " sidebar-section-chevron-collapsed"}`}
              aria-hidden="true"
            />
          </Button>
        </header>
        <div
          class="sidebar-section-collapse"
          data-collapsed={open() ? undefined : ""}
          aria-hidden={open() ? undefined : "true"}
          inert={open() ? undefined : true}
        >
          <div id={BODY_ID} class="sidebar-section-body">
            <For each={groupChats()}>
              {(item) => (item.kind === "channel" ? <SidebarChannelRow channel={item.channel} /> : null)}
            </For>
          </div>
        </div>
      </section>
    </Show>
  );
}
