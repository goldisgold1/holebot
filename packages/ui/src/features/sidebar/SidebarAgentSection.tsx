/**
 * One section - the unassigned one included. A custom section stays visible while empty so it can
 * be dropped into.
 *
 * The unassigned section keeps its heading only once a custom section exists. Before that it is the
 * whole list, and "Unassigned" names it against nothing.
 */

import { SIDEBAR_UNASSIGNED_SECTION_ID } from "@openbot/contracts/ipc";
import { createMemo, For, Match, Show, Switch } from "solid-js";
import type { AgentProfile } from "../../data";
import { useText } from "../../text";
import { SidebarAgentRow } from "./SidebarAgentRow";
import { SidebarChannelRow } from "./SidebarChannelRow";
import { SidebarSectionHeader } from "./SidebarSectionHeader";
import { useSidebarScope } from "./sidebar-scope";

export function SidebarAgentSection(sectionProps: { sectionId: string }) {
  const { customSectionById, dragOffset, filteredChatsBySection, props, sectionDragClasses, sectionIsCollapsed } =
    useSidebarScope();
  const { t } = useText();
  const sectionId = () => sectionProps.sectionId;
  const chats = () => filteredChatsBySection().get(sectionId()) ?? [];
  const custom = () => customSectionById().get(sectionId());
  const name = () =>
    sectionId() === SIDEBAR_UNASSIGNED_SECTION_ID ? t("sidebar.section.unassigned") : (custom()?.name ?? "");
  const headed = () => Boolean(custom()) || props.layout.sections.length > 0;
  // HoleA.I: an agent that another agent spawned sits under that agent's row, wherever its own
  // section is. A pinned or hidden parent has no row here, so its workers keep their own place.
  const sectionAgents = createMemo(() => {
    const agents = new Map<string, AgentProfile>();
    for (const list of filteredChatsBySection().values())
      for (const chat of list) if (chat.kind === "agent") agents.set(chat.agent.id, chat.agent);
    return agents;
  });
  const nestedUnderParent = (agent: AgentProfile) =>
    agent.spawnedBy !== undefined && agent.spawnedBy !== agent.id && sectionAgents().has(agent.spawnedBy);
  const spawnedBy = (parentId: string) =>
    [...sectionAgents().values()].filter((agent) => agent.spawnedBy === parentId && agent.id !== parentId);
  const collapsed = () => headed() && sectionIsCollapsed(sectionId());
  return (
    <Show when={name() && (chats().length > 0 || custom())}>
      <section
        class={["sidebar-chat-group sidebar-section", sectionDragClasses(sectionId())]}
        style={`--sidebar-drag-y: ${dragOffset(sectionId()).y}px;`}
        aria-label={name()}
        data-section-id={sectionId()}
      >
        <Show when={headed()}>
          <SidebarSectionHeader sectionId={sectionId()} name={name()} />
        </Show>
        <div
          class="sidebar-section-collapse"
          data-collapsed={collapsed() ? "" : undefined}
          aria-hidden={collapsed() ? "true" : undefined}
          inert={collapsed() ? true : undefined}
        >
          <div id={`sidebar-section-body-${sectionId()}`} class="sidebar-section-body">
            <For each={chats()}>
              {(chat) => (
                <Switch>
                  <Match when={chat.kind === "agent" ? chat.agent : undefined}>
                    {(agent) => (
                      <Show when={!nestedUnderParent(agent())}>
                        <SidebarAgentRow agent={agent()} />
                        <Show when={spawnedBy(agent().id).length > 0}>
                          <ul
                            class="sidebar-spawned-agents"
                            aria-label={t("sidebar.spawned.label", { name: agent().name })}
                          >
                            <For each={spawnedBy(agent().id)}>
                              {(child) => (
                                <li class="sidebar-spawned-agent">
                                  <SidebarAgentRow agent={child} spawned />
                                </li>
                              )}
                            </For>
                          </ul>
                        </Show>
                      </Show>
                    )}
                  </Match>
                  <Match when={chat.kind === "channel" ? chat.channel : undefined}>
                    {(channel) => <SidebarChannelRow channel={channel()} />}
                  </Match>
                </Switch>
              )}
            </For>
          </div>
        </div>
      </section>
    </Show>
  );
}
