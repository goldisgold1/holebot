import {
  type ChannelMute,
  type ChatWindowTarget,
  canAdministerServer,
  type ReelFactoryLive,
} from "@openbot/contracts/ipc";
import { AGENT_HIDDEN_CAPABILITY } from "@openbot/contracts/team-protocol/current";
import { computeAgentAvatarMoods } from "@openbot/ui/features/agents/agent-avatar-mood";
import { Sidebar } from "@openbot/ui/features/sidebar/Sidebar";
import { SidebarCommunityCard } from "@openbot/ui/features/sidebar/SidebarCommunityCard";
import { SidebarMachineCard } from "@openbot/ui/features/sidebar/SidebarMachineCard";
import { SidebarMobileAppCard } from "@openbot/ui/features/sidebar/SidebarMobileAppCard";
import { SidebarStorageCard } from "@openbot/ui/features/sidebar/SidebarStorageCard";
import { computeSidebarAgentStates, sidebarChannelWaits } from "@openbot/ui/features/sidebar/sidebar-agent-states";
import { teamMemberName } from "@openbot/ui/features/team/TeamPersonAvatar";
import { useText } from "@openbot/ui/text";
import { createEffect, createMemo, createSignal, onSettled, Show } from "solid-js";
import { appPort } from "../../app-port";
import { type ChatHistoryEntry, chatHistoryKeys } from "../../chat-history";
import { useLayout } from "../../layout";
import { DirectConversation } from "../../lazy-views";
import { useNavigation } from "../../navigation";
import { usePlatform } from "../../platform";
import { useTurns } from "../../turns";
import { useAgentTasks } from "../agent-tasks/agent-tasks-context";
import { useAgentThreads } from "../agent-threads/agent-threads-context";
import { useAgentActions } from "../agents/agent-actions";
import { attentionByAgent } from "../agents/agent-runtime-snapshot";
import { agentThreadAttention } from "../agents/agent-thread-attention";
import { useAgents } from "../agents/agents-context";
import { useChannels } from "../channels/channels-context";
import { useConversation } from "../conversation/conversation-context";
import { useConversationController } from "../conversation/conversation-controller-context";
import { composerDraftKey } from "../conversation/conversation-keys";
import { useDirectMessages } from "../conversation/direct-messages-context";
import { useServerActions } from "../servers/server-actions";
import { serverRoleCanAdminister } from "../servers/server-capabilities";
import { useServerScope } from "../servers/server-scope";
import { useServerSettings } from "../servers/server-settings";
import { serverUpdateBadge, showServerUpdate } from "../servers/server-update-flow";
import { useServers } from "../servers/servers-context";
import { serversPort } from "../servers/servers-port";
import { useSettings } from "../settings/settings-context";
import { usePresence } from "../team/team-context";
import { SidebarUpdateIsland } from "../updates/SidebarUpdateIsland";
import { useWindowPage } from "../window/window-page-context";
import { createCommunityCardVisibility } from "./community-card";
import { createMachineCard } from "./machine-card";
import { SidebarAccountRow } from "./SidebarAccountRow";
import { useSidebar } from "./sidebar-context";
import { installSidebarShortcuts } from "./sidebar-shortcuts";
import { createStorageCard } from "./storage-card";

/** Dismissing the mobile app card is a choice of this computer, like the sidebar width. The key is
 * new with the Android release, so a computer that dismissed the iPhone-only card sees it once more. */
const MOBILE_APP_DISMISSED_STORAGE_KEY = "openbot:mobile-app-card-dismissed";
/** How long the sidebar waits after a key in the composer before its row shows the draft. */
const DRAFT_PREVIEW_DELAY_MS = 400;

/**
 * The list of Agents and people. It reads the most domains of any pane, and every
 * one of them for the same reason: a sidebar row shows who exists, who is
 * working, who has replied and who is pinned, which is four domains before any
 * of the actions on the row context menu.
 *
 * `peopleEnabled` arrives as a prop because the shell already computes it to
 * decide which pane renders. Deriving it a second time here would let the two
 * answers disagree for a frame.
 */
/** HoleA.I: the group chats this device hides from the sidebar, by channel id. */
const HIDDEN_CHANNELS_KEY = "holeai.sidebar.hiddenChannels";

function readHiddenChannels(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(HIDDEN_CHANNELS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

const REEL_FACTORY_LIVE_POLL_MS = 15_000;

export function WorkspaceSidebar(props: { peopleEnabled: boolean }) {
  const [hiddenChannelIds, setHiddenChannelIds] = createSignal(readHiddenChannels());
  const [channelMutes, setChannelMutes] = createSignal<ChannelMute[]>([]);
  void serversPort()
    .servers.channelMutes()
    .then(setChannelMutes)
    .catch(() => undefined);
  const setChannelHidden = (channelId: string, hidden: boolean) => {
    const next = hidden
      ? [...new Set([...hiddenChannelIds(), channelId])]
      : hiddenChannelIds().filter((id) => id !== channelId);
    setHiddenChannelIds(next);
    try {
      localStorage.setItem(HIDDEN_CHANNELS_KEY, JSON.stringify(next));
    } catch {
      // The list still holds for this run.
    }
  };
  const { t } = useText();
  const layout = useLayout();
  const windowPage = useWindowPage();
  const platform = usePlatform();
  const channels = useChannels();
  const serverScope = useServerScope();
  const { activeServer, activeServerId, activeServerSupportsCapability } = useServers();
  // The chats that main shows in a window of their own. Main sends the list on each change.
  const [chatWindows, setChatWindows] = createSignal<ChatWindowTarget[]>([]);
  onSettled(() => {
    const unsubscribe = appPort().onChatWindows(setChatWindows);
    void appPort()
      .getChatWindows()
      .then(setChatWindows)
      .catch(() => undefined);
    return unsubscribe;
  });
  // HoleA.I: the Reels Factory board's live jobs, for the Reel Worker steps and the Reel Factories row.
  // Read every 15 s; null while the board is not signed in.
  const [reelFactoryLive, setReelFactoryLive] = createSignal<ReelFactoryLive | null>(null);
  onSettled(() => {
    const read = () =>
      void appPort()
        .getReelFactoryLive()
        .then(setReelFactoryLive)
        .catch(() => undefined);
    read();
    const timer = window.setInterval(read, REEL_FACTORY_LIVE_POLL_MS);
    return () => window.clearInterval(timer);
  });
  const windowAgentIds = createMemo(
    () => new Set(chatWindows().flatMap((target) => (target.serverId === activeServerId() ? [target.agentId] : []))),
  );
  const { openServerSettings, serverSettingsOpen } = useServerSettings();
  const serverActions = useServerActions();
  const { openAppSettings, setSkillsMarketplaceOpen } = useSettings();
  const {
    agentList,
    agentListConnecting,
    agentListSettled,
    activeAgent,
    agentSetupDraft,
    duplicatingAgentIds,
    openAgentSetup,
    userHiddenAgents,
    userHiddenAgentIds,
  } = useAgents();
  const { editAgent, duplicateAgent, duplicateSection, duplicatingSectionIds, deleteAgent, setAgentHiddenByUser } =
    useAgentActions();
  // The host refuses a member: a hidden agent stops for every member, as a deleted one does.
  const hideAllowed = () =>
    activeServerSupportsCapability(AGENT_HIDDEN_CAPABILITY) && serverRoleCanAdminister(activeServer());
  const { activeTurns, queues, failedTurns, usageLimits, pendingPrompts, pendingApprovals, approvals, turnProgress } =
    useTurns();
  const agentActivity = createMemo(() =>
    Object.fromEntries(Object.entries(turnProgress()).map(([agentId, progress]) => [agentId, progress?.detail])),
  );
  const { unreadReplies, recentReplies, markAllAgentMessagesRead } = useConversation();
  // HoleA.I (from Vincent's bot app): the rows say "Draft: …" for unsent text. The composer changes the
  // drafts on every key, so the sidebar takes them a little after typing stops.
  const conversationController = useConversationController();
  const [agentDrafts, setAgentDrafts] = createSignal<Record<string, string>>({});
  createEffect(
    () => ({ drafts: conversationController.drafts(), serverId: activeServerId(), agents: agentList() }),
    ({ drafts, serverId, agents }) => {
      const timer = setTimeout(() => {
        const next: Record<string, string> = {};
        for (const agent of agents) {
          const text = drafts[composerDraftKey({ agentId: agent.id, serverId })]?.text.trim();
          if (text) next[agent.id] = text.replace(/\s+/gu, " ");
        }
        setAgentDrafts((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
      }, DRAFT_PREVIEW_DELAY_MS);
      return () => clearTimeout(timer);
    },
  );
  const { directPeople, teamPresence } = usePresence();
  const { activeDirectMember, activeDirectMemberId, directThreads } = useDirectMessages();
  const { selectAgent, selectDirectMember, setGlobalSearchVisibility, chatHistory } = useNavigation();
  const createAgent = () => {
    channels.close();
    openAgentSetup();
  };
  onSettled(() =>
    installSidebarShortcuts({
      mac: () => platform.appInfo()?.platform === "darwin",
      newAgent: createAgent,
      toggleCompact: () => (layout.leftPanelCompact() ? layout.expandSidebar() : layout.setSidebarCollapsed(true)),
      selectAgent: (agentId) => void selectAgent(agentId),
    }),
  );
  const agentTasks = useAgentTasks();
  const agentThreads = useAgentThreads();
  /**
   * Opens the agent's chat with a new thread. A host without threads has no such item, and neither has a
   * chat window: another agent opens in a window of its own, which does not get the new thread.
   */
  const newAgentThread = () =>
    agentTasks.available() && !platform.chatWindow
      ? (agentId: string) => {
          if (selectAgent(agentId)) agentThreads.startNew(agentId);
        }
      : undefined;
  /** The name of a chat as its sidebar row shows it. */
  const chatName = (entry: ChatHistoryEntry | undefined): { name: string } | null => {
    if (!entry) return null;
    if (entry.kind === "agent") return { name: agentList().find((agent) => agent.id === entry.id)?.name ?? "" };
    if (entry.kind === "channel") {
      return { name: channels.state.channels.find((channel) => channel.id === entry.id)?.name ?? "" };
    }
    const member = directPeople().find((person) => person.id === entry.id);
    return { name: member ? teamMemberName(member) : "" };
  };
  const {
    sidebarLayout,
    collapsedSidebarSectionIds,
    mutateSidebarLayout,
    toggleSidebarSection,
    pinnedSidebarItems,
    sidebarPeopleOrder,
    pinSidebarItem,
    unpinSidebarItem,
    reorderPinnedSidebarItems,
    reorderSidebarPeople,
  } = useSidebar();
  const [mobileAppDismissed, setMobileAppDismissed] = createSignal(
    window.localStorage.getItem(MOBILE_APP_DISMISSED_STORAGE_KEY) === "true",
  );
  const communityCard = createCommunityCardVisibility();
  const storageCard = createStorageCard(activeServer);
  const machineCard = createMachineCard(activeServer);
  // A clear in Server settings frees space and can change an alert level, so both cards read
  // again when settings close.
  createEffect(serverSettingsOpen, (open, wasOpen) => {
    if (!open && wasOpen) {
      storageCard.refresh();
      machineCard.refresh();
    }
  });
  // One warning card at a time. A disk machine card covers the disk, so it replaces the storage
  // card. A memory or CPU card gives way to a full disk, unless it is critical itself.
  const footerCard = createMemo(() => {
    const machine = machineCard.card();
    const storage = storageCard.card();
    if (machine && (machine.metric === "disk" || !storage || (machine.critical && storage.level !== "full")))
      return { kind: "machine" as const, card: machine };
    return storage ? { kind: "storage" as const, card: storage } : null;
  });
  const shownMachineCard = () => {
    const shown = footerCard();
    return shown?.kind === "machine" ? shown.card : null;
  };
  const shownStorageCard = () => {
    const shown = footerCard();
    return shown?.kind === "storage" ? shown.card : null;
  };
  // As the host picks it: the responsible member while an active admin, otherwise the owner.
  const machineRecipient = (memberId: string | null) => {
    const members = teamPresence().members;
    const member =
      members.find(
        (candidate) => candidate.id === memberId && !candidate.disabled && canAdministerServer(candidate.role),
      ) ?? members.find((candidate) => candidate.role === "owner");
    return member ? member.name?.trim() || member.username : null;
  };

  /* Channels reach the sidebar as data, not as a list of their own: they sit in the layout's
   * sections beside the agents, so the sidebar has to be able to order and group them. The Routines
   * view lists only agents: a channel has no routine canvas. */
  const channelsListed = () => channels.supported() && layout.sidebarView() !== "routines";
  /* Until a joined server lists channels, the frame's rows hold their place, so the agents below stay. */
  const sidebarChannels = () =>
    !channels.state.listed &&
    layout.sidebarView() !== "routines" &&
    (!serverScope.loaded() || channels.supported()) &&
    serverScope.frameChannels().length > 0
      ? serverScope.frameChannels()
      : channelsListed()
        ? channels.state.channels
        : [];
  const visibleChannels = createMemo(() => sidebarChannels().filter((channel) => !channel.archived));
  /* A channel can open while the Routines view is on: from search, a notification, or a selection
   * restored at start. Its row must be in the list, so the list goes back to the agents view. */
  createEffect(
    () => layout.sidebarView() === "routines" && channels.state.selectedId !== null,
    (channelOpenInRoutines) => {
      if (channelOpenInRoutines) layout.setSidebarView("agents");
    },
  );

  /* The turn events of a side thread reach only its thread list, so an agent that works in a side
   * thread is found there. */
  const workingTurns = createMemo(() => {
    const turns = { ...activeTurns() };
    for (const agent of agentList()) {
      const running = agentTasks.snapshot(agent.id)?.tasks.find((task) => task.state === "running");
      if (running && !turns[agent.id]) turns[agent.id] = running.activeTurnId ?? running.id;
    }
    return turns;
  });

  /* The agent conversation shows only the waits of the agent's own thread. A wait in a channel
   * thread stays out of "Needs you", because selecting the row cannot answer it. */
  const sidebarAgentStates = createMemo(() =>
    computeSidebarAgentStates({
      agentIds: agentList().map((agent) => agent.id),
      activeTurns: workingTurns(),
      queues: queues(),
      unreadReplies: unreadReplies(),
      recentReplies: recentReplies(),
      ...agentThreadAttention({ agents: agentList(), pendingPrompts: pendingPrompts(), approvals: approvals() }),
      failedTurns: failedTurns(),
      usageLimits: usageLimits(),
    }),
  );

  /* HoleA.I: the tray shows the agents of the server this window shows (the hole.fm VPS), not only
   * those of this computer: their face while busy, the unread badge and the recent-agent menu. Sent
   * only when it changes. */
  let sentTrayRoster = "";
  createEffect(
    () =>
      agentList().map((agent) => ({
        id: agent.id,
        name: agent.name,
        avatarSeed: agent.avatarSeed,
        avatarHue: agent.avatarHue,
        avatarUrl: agent.avatarUrl?.startsWith("data:image/") ? agent.avatarUrl : null,
        updatedAt: agent.updatedAt ?? null,
        notifications: agent.notifications,
        busy: sidebarAgentStates()[agent.id]?.kind === "working",
        unread: (unreadReplies()[agent.id] ?? 0) > 0,
      })),
    (roster) => {
      const key = JSON.stringify(roster);
      if (key === sentTrayRoster) return;
      sentTrayRoster = key;
      void appPort()
        .setTrayRoster(roster)
        .catch(() => undefined);
    },
  );

  /* A wait in a channel thread goes to the channel instead. Selecting the channel opens the view
   * that answers it. */
  const channelWaits = createMemo(() => {
    const prompts = Object.values(pendingPrompts());
    return sidebarChannelWaits({
      channels: visibleChannels(),
      prompts: prompts.flatMap((event) => (event?.type === "prompt" ? [event] : [])),
      takeovers: prompts.flatMap((event) => (event?.type === "browser-takeover-requested" ? [event.request] : [])),
      approvals: approvals(),
    });
  });

  /* The badge says what an agent is doing; the face says how it is going. `isAgentWorking` is
   * shared, and a routine mark only replaces the badge for that same agent. */
  const agentMoods = createMemo(() =>
    computeAgentAvatarMoods({
      agentIds: agentList().map((agent) => agent.id),
      activeTurns: workingTurns(),
      queues: queues(),
      failedTurns: failedTurns(),
      pendingPrompts: attentionByAgent(pendingPrompts(), agentList()),
      pendingApprovals: pendingApprovals(),
      recentReplies: recentReplies(),
    }),
  );

  return (
    <Sidebar
      channels={visibleChannels()}
      deletedChannels={sidebarChannels().filter((channel) => channel.archived)}
      activeChannelId={channels.state.selectedId}
      onSelectChannel={(id) => void channels.open(id)}
      onEditChannel={(id) => void channels.editChannel(id)}
      onDeleteChannel={channels.deletionSupported() ? channels.remove : undefined}
      onRestoreChannel={channels.deletionSupported() ? channels.restore : undefined}
      showingArchivedChannels={channelsListed() && channels.state.archived}
      onToggleArchivedChannels={channelsListed() ? channels.toggleArchived : undefined}
      onOpenReelFactories={() => windowPage.openReelFactories(null)}
      onCreateChannel={channelsListed() ? channels.create : undefined}
      onMarkAllRead={() => {
        void markAllAgentMessagesRead();
        void channels.markAllRead();
      }}
      hasUnread={
        agentList().some((agent) => !userHiddenAgentIds().has(agent.id) && (unreadReplies()[agent.id] ?? 0) > 0) ||
        channels.hasUnread()
      }
      view={layout.sidebarView()}
      serverName={activeServer()?.name ?? t("sidebar.topbar.localServer")}
      onOpenServerSettings={(trigger) => {
        const server = activeServer();
        if (server) openServerSettings(server.id, trigger);
      }}
      chatHistory={{
        back: chatName(chatHistory.previous()),
        forward: chatName(chatHistory.next()),
        keys: chatHistoryKeys(platform.appInfo()?.platform === "darwin"),
        onBack: chatHistory.goBack,
        onForward: chatHistory.goForward,
      }}
      serverUpdate={(() => {
        const server = activeServer();
        const badge = server ? serverUpdateBadge(server.id) : null;
        return server && badge ? { ...badge, onOpen: () => void showServerUpdate(server.id) } : undefined;
      })()}
      serverMenu={
        platform.appInfo()
          ? {
              servers: serverActions.orderedServers(),
              view: layout.serverView(),
              onViewChange: layout.setServerView,
              onSelect: serverActions.select,
              onAdd: serverActions.add,
              onCreateLocal: serverActions.addMenuCreateLocal(),
              addCreatesServer: serverActions.addCreatesServer(),
              hiddenLocal: serverActions.hiddenLocal(),
              ...serverActions.callbacks,
            }
          : undefined
      }
      agents={agentList()}
      activeAgentId={activeDirectMember() || channels.state.selectedId ? "" : (activeAgent()?.id ?? "")}
      showPeople={props.peopleEnabled}
      people={directPeople()}
      directThreads={directThreads()}
      activeDirectMemberId={activeDirectMemberId()}
      agentStates={sidebarAgentStates()}
      agentActivity={agentActivity()}
      agentDrafts={agentDrafts()}
      reelFactoryLive={reelFactoryLive()}
      channelWaits={channelWaits()}
      channelPreviewsPending={!channels.state.listed}
      agentMoods={agentMoods()}
      layout={sidebarLayout()}
      layoutMutable={activeServerSupportsCapability("sidebar-layout")}
      collapsedSectionIds={collapsedSidebarSectionIds()}
      onMutateLayout={mutateSidebarLayout}
      sectionDuplicateSupported={
        activeServerSupportsCapability("agent-duplication") && activeServerSupportsCapability("sidebar-layout")
      }
      duplicatingSectionIds={duplicatingSectionIds()}
      onDuplicateSection={duplicateSection}
      onToggleSection={toggleSidebarSection}
      pinnedItems={pinnedSidebarItems()}
      peopleOrder={sidebarPeopleOrder()}
      onPin={pinSidebarItem}
      onUnpin={unpinSidebarItem}
      onReorderPinned={reorderPinnedSidebarItems}
      onReorderPeople={reorderSidebarPeople}
      onSelectAgent={selectAgent}
      onSelectPerson={(memberId) => void selectDirectMember(memberId)}
      onPreloadDirectConversation={props.peopleEnabled ? () => void DirectConversation.preload() : undefined}
      onCreateAgent={createAgent}
      onEditAgent={editAgent}
      duplicateSupported={activeServerSupportsCapability("agent-duplication")}
      duplicatingAgentIds={duplicatingAgentIds()}
      onDuplicateAgent={duplicateAgent}
      onDeleteAgent={deleteAgent}
      userHiddenAgents={userHiddenAgents()}
      hiddenChannelIds={hiddenChannelIds()}
      mutedChannelIds={channelMutes()
        .filter((mute) => mute.serverId === activeServerId())
        .map((mute) => mute.channelId)}
      onSetChannelMuted={(channelId, muted, durationMs) =>
        void serversPort()
          .servers.setChannelMuted({ serverId: activeServerId(), channelId, muted, durationMs })
          .then(setChannelMutes)
          .catch(() => undefined)
      }
      onSetChannelHidden={setChannelHidden}
      onHideAgent={hideAllowed() ? (agentId) => void setAgentHiddenByUser(agentId, true) : undefined}
      onRestoreAgent={hideAllowed() ? (agentId) => void setAgentHiddenByUser(agentId, false) : undefined}
      onNewAgentThread={newAgentThread()}
      onOpenAgentWindow={
        platform.landingPreview
          ? undefined
          : (agentId) => void appPort().openChatWindow({ serverId: activeServerId(), agentId })
      }
      windowAgentIds={windowAgentIds()}
      compact={layout.leftPanelCompact()}
      onExpand={layout.expandSidebar}
      onOpenSearch={() => setGlobalSearchVisibility(true)}
      footer={
        <>
          {/* One card at a time. A machine over its alert level comes first, then a disk that is
           * almost full; the community card waits until the mobile app card is dismissed. */}
          <Show when={shownMachineCard()}>
            {(card) => (
              <SidebarMachineCard
                serverName={activeServer()?.name ?? ""}
                metric={card().metric}
                percent={card().percent}
                level={card().level}
                freeBytes={card().freeBytes}
                critical={card().critical}
                recipientName={machineRecipient(card().responsibleMemberId)}
                onOpenDetails={() => openServerSettings(card().serverId, null, "storage")}
                onDismiss={() => machineCard.dismiss(card().serverId, card())}
              />
            )}
          </Show>
          <Show when={shownStorageCard()}>
            {(card) => (
              <SidebarStorageCard
                level={card().level}
                serverName={activeServer()?.name ?? ""}
                freeBytes={card().freeBytes}
                totalBytes={card().totalBytes}
                onFreeUpSpace={() => openServerSettings(card().serverId, null, "storage")}
                onDismiss={() => storageCard.dismiss(card().serverId)}
              />
            )}
          </Show>
          <Show when={!platform.landingPreview && !footerCard() && !mobileAppDismissed()}>
            <SidebarMobileAppCard
              onOpenInstall={() => openAppSettings(null, "mobile-connect")}
              onDismiss={() => {
                window.localStorage.setItem(MOBILE_APP_DISMISSED_STORAGE_KEY, "true");
                setMobileAppDismissed(true);
              }}
            />
          </Show>
          <Show when={!platform.landingPreview && !footerCard() && mobileAppDismissed() && !communityCard.dismissed()}>
            <SidebarCommunityCard
              onJoinDiscord={() => void appPort().openExternal("discord")}
              onFollowX={() => void appPort().openExternal("x")}
              onDismiss={communityCard.dismiss}
            />
          </Show>
          <SidebarUpdateIsland />
          <SidebarAccountRow />
        </>
      }
      onOpenMarketplace={() => setSkillsMarketplaceOpen(true)}
      agentsConnecting={agentListConnecting()}
      emptyAction={
        agentList().length === 0 && agentListSettled()
          ? {
              label: t("sidebar.empty.firstAgent"),
              avatarSeed: agentSetupDraft().avatarSeed,
              avatarHue: agentSetupDraft().avatarHue,
              onSelect: () => {
                channels.close();
                openAgentSetup();
              },
            }
          : undefined
      }
    />
  );
}
