import { holdSettlePose } from "@openbot/ui/features/agents/bot-mark/settle-pose";
import { Sidebar } from "@openbot/ui/features/sidebar/Sidebar";
import type { SidebarAgentState } from "@openbot/ui/features/sidebar/sidebar-types";
import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { STORY_AGENTS, STORY_DIRECT_THREADS, STORY_PRESENCE } from "../../preview/fixtures";
import { defaultSidebarLayout } from "./sidebar-sections";

// As in the bot app, a working row says what its agent is doing now in place of the last message,
// and a row whose agent just finished says so for a while.
function renderSidebar(agentStates: Record<string, SidebarAgentState>, agentActivity: Record<string, string>) {
  const noop = vi.fn();
  return render(() => (
    <Sidebar
      serverName="Local"
      agents={STORY_AGENTS}
      activeAgentId="research"
      people={STORY_PRESENCE.members}
      directThreads={STORY_DIRECT_THREADS}
      activeDirectMemberId={null}
      agentStates={agentStates}
      agentActivity={agentActivity}
      agentMoods={{}}
      layout={defaultSidebarLayout()}
      collapsedSectionIds={[]}
      onMutateLayout={async () => undefined}
      onToggleSection={noop}
      pinnedItems={[]}
      peopleOrder={[]}
      onPin={noop}
      onUnpin={noop}
      onReorderPinned={noop}
      onReorderPeople={noop}
      onSelectAgent={noop}
      onSelectPerson={noop}
      onCreateAgent={noop}
      onEditAgent={noop}
      onDeleteAgent={async () => undefined}
      compact={false}
      onExpand={noop}
      onOpenSearch={noop}
      onOpenMarketplace={noop}
    />
  ));
}

const row = (container: HTMLElement, agentId: string) =>
  container.querySelector<HTMLElement>(`.agent-row[data-agent-id="${agentId}"]`);

describe("sidebar live step", () => {
  it("shows a working agent's current step and marks its avatar as working", () => {
    const { container } = renderSidebar({ chief: { kind: "working" } }, { chief: "Reading the brief" });
    const chief = row(container, "chief");
    expect(chief?.querySelector(".agent-row-live-step")?.textContent).toBe("Reading the brief");
    expect(chief?.querySelector(".agent-row-avatar")?.hasAttribute("data-working")).toBe(true);
  });

  it("says an agent finished just now once its turn completes", () => {
    holdSettlePose("sales-outbound", "finished");
    const { container } = renderSidebar({}, {});
    const sales = row(container, "sales");
    expect(sales?.querySelector(".agent-row-finished")?.textContent).toBe("Finished just now");
    expect(sales?.querySelector(".agent-row-live-step")).toBeNull();
  });
});
