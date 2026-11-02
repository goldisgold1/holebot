/**
 * Every section in the order the layout gives, plus the draft section a create is editing. The
 * draft sits after the list rather than inside it because it has no id yet, so nothing in the
 * layout order can place it.
 */

import { SIDEBAR_PEOPLE_SECTION_ID } from "@openbot/contracts/ipc";
import { For, Show } from "solid-js";
import { useText } from "../../text";
import { SidebarAgentSection } from "./SidebarAgentSection";
import { SidebarGroupChatsGroup } from "./SidebarGroupChatsGroup";
import { SidebarPeopleSection } from "./SidebarPeopleSection";
import { SidebarSectionEditor } from "./SidebarSectionEditor";
import { useSidebarScope } from "./sidebar-scope";

export function SidebarSectionList() {
  const { pending, props } = useSidebarScope();
  const { t } = useText();
  return (
    <>
      {/* HoleA.I: every agent folder first, then the chats with people, then the group chats. */}
      <For each={props.layout.order.filter((sectionId) => sectionId !== SIDEBAR_PEOPLE_SECTION_ID)}>
        {(sectionId) => <SidebarAgentSection sectionId={sectionId} />}
      </For>
      <Show when={props.layout.order.includes(SIDEBAR_PEOPLE_SECTION_ID)}>
        <SidebarPeopleSection sectionId={SIDEBAR_PEOPLE_SECTION_ID} />
      </Show>
      <SidebarGroupChatsGroup />
      <Show when={pending.sectionEditor?.target.kind === "create"}>
        <section class="sidebar-chat-group sidebar-section sidebar-section-draft" aria-label={t("sidebar.new.section")}>
          <SidebarSectionEditor />
        </section>
      </Show>
    </>
  );
}
