import type { RespondToPromptInput } from "@openbot/contracts/ipc";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatView } from "@/features/chat/components/chat-view";
import { useLeaveChat } from "@/features/chat/components/use-leave-chat";
import { useQuestionPrompt } from "@/features/chat/components/use-question-prompt";
import { projectChannelMessages } from "@/features/chat/model/chat-messages";
import { useServerMembers } from "@/features/servers/model/use-server-members";
import { useApprovalRequests, useBrowserRequests } from "@/features/workspace/components/use-live-workspace";
import { useMobileWorkspaceSelector } from "@/features/workspace/context/mobile-workspace-context";
import type { MobileAgentActivity, MobileAgentWaitReason } from "@/features/workspace/model/agent-activity";
import { showsOnline } from "@/features/workspace/model/server-status";
import { useText } from "@/shared/lib/text";
import { useChannels } from "../components/use-channels";
import { channelTaskActivities, channelTasksNeedingAction } from "../model/channel-task-actions";

export function ChannelChatScreen() {
  const { channelId, serverId } = useLocalSearchParams<{ channelId: string; serverId: string }>();
  return <ChannelChat key={`${serverId}:${channelId}`} channelId={channelId} serverId={serverId} />;
}

function ChannelChat({ channelId, serverId }: { channelId: string; serverId: string }) {
  const { t } = useText();
  const leaveChat = useLeaveChat();
  const agents = useMobileWorkspaceSelector((current) => current.agents);
  const server = useMobileWorkspaceSelector((current) => current.servers.find((item) => item.id === serverId));
  // A sheet removes focus, but the chat remains mounted behind it. Release history
  // only when this route unmounts; the workspace pauses network reads in the background.
  const state = useChannels(serverId, channelId);
  const page = state.pages.get(channelId);
  const summary = state.channels.find((item) => item.id === channelId);
  const channel = summary ?? page?.channel;
  const online = server?.state === "online";
  const archived = Boolean(channel?.archived);
  const serverAgents = useMemo(() => agents.filter((agent) => agent.serverId === serverId), [agents, serverId]);
  const members = useMemo(
    () => serverAgents.filter((agent) => channel?.members.some((member) => member.agentId === agent.id)),
    [serverAgents, channel?.members],
  );
  const messages = useMemo(
    () => projectChannelMessages(page?.messages ?? [], server?.membershipId ?? null),
    [page?.messages, server?.membershipId],
  );
  // A host with channel-attention-v1 names the thread of each member in this channel. A request on
  // one of them belongs here, and not in the agent's own chat.
  const threadIds = useMemo(
    () => (summary?.threads?.length ? new Set(summary.threads.map((thread) => thread.threadId)) : null),
    [summary?.threads],
  );
  const serverApprovals = useApprovalRequests(serverId);
  const approvals = useMemo(() => {
    if (archived) return [];
    if (threadIds) return serverApprovals.filter((approval) => threadIds.has(approval.threadId));
    // An older host: as on the desktop, a member's approval belongs here while that member runs a task of this channel.
    const workers = new Set(
      (page?.tasks ?? []).flatMap((task) => (task.state === "running" && task.ownerAgentId ? [task.ownerAgentId] : [])),
    );
    return serverApprovals.filter((approval) => workers.has(approval.agentId));
  }, [serverApprovals, archived, threadIds, page?.tasks]);
  const serverBrowserRequests = useBrowserRequests(serverId);
  // A member that asks in this channel waits for the person, and its row says what for.
  const activities = useMemo(() => {
    if (!online || archived) return [];
    const working = channelTaskActivities(page?.tasks ?? [], page?.messages ?? [], channel?.leadAgentId ?? null);
    const waits = new Map<string, MobileAgentWaitReason>();
    for (const approval of approvals) waits.set(approval.agentId, "approval");
    for (const request of serverBrowserRequests)
      if (threadIds?.has(request.threadId)) waits.set(request.agentId, "takeover");
    for (const entry of page?.messages ?? [])
      if (
        entry.author.kind === "agent" &&
        !entry.superseded &&
        entry.message.questionPrompt &&
        !entry.message.questionPrompt.resolution
      )
        waits.set(entry.author.id, "question");
    if (waits.size === 0) return working;
    const waiting = (activity: MobileAgentActivity, reason: MobileAgentWaitReason): MobileAgentActivity => ({
      ...activity,
      phase: "waiting",
      detail: null,
      reason,
    });
    const next = working.map((activity) => {
      const reason = activity.agentId ? waits.get(activity.agentId) : undefined;
      return reason ? waiting(activity, reason) : activity;
    });
    for (const [agentId, reason] of waits)
      if (!next.some((activity) => activity.agentId === agentId))
        next.push(waiting({ agentId, turnId: null, phase: "working", detail: null }, reason));
    return next;
  }, [
    online,
    archived,
    channel?.leadAgentId,
    page?.tasks,
    page?.messages,
    approvals,
    serverBrowserRequests,
    threadIds,
  ]);
  const [olderLoading, setOlderLoading] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const readThrough = useRef(0);
  const throughSequence = page?.throughSequence ?? 0;
  const store = state.store;
  const markRead = useCallback(() => {
    if (throughSequence <= readThrough.current) return;
    readThrough.current = throughSequence;
    void store
      .command(serverId, { type: "read", operationId: Crypto.randomUUID(), channelId, throughSequence })
      .catch(() => {
        readThrough.current = 0;
      });
  }, [store, serverId, channelId, throughSequence]);
  const fetchHistory = useCallback(() => {
    void store.refresh(serverId);
  }, [store, serverId]);
  const loadOlder = useCallback(() => {
    if (olderLoading) return;
    setOlderLoading(true);
    setOlderError(false);
    void store
      .older(serverId, channelId)
      .catch(() => setOlderError(true))
      .finally(() => setOlderLoading(false));
  }, [store, serverId, channelId, olderLoading]);
  // The phone keeps a message while the server is offline and sends it when it is back.
  const canSend = Boolean(channel) && !archived;
  const [selectedPromptId, selectPrompt] = useState<string | null>(null);
  const pendingPrompts = messages.filter((message) => message.kind === "question" && !message.prompt.resolution);
  const activePrompt = pendingPrompts.find((message) => message.id === selectedPromptId) ?? pendingPrompts[0];
  const promptAuthor = page?.messages.find((message) => message.id === activePrompt?.id)?.author;
  const respondToPrompt = useCallback(
    (agentId: string, input: RespondToPromptInput) => store.respondToPrompt(serverId, channelId, agentId, input),
    [store, serverId, channelId],
  );
  const questionForm = useQuestionPrompt(
    promptAuthor?.kind === "agent" ? promptAuthor.id : "",
    activePrompt?.kind === "question" ? activePrompt : undefined,
    showsOnline(server) && canSend,
    respondToPrompt,
  );
  // A voice conversation in the channel shows the leader, then the member that gets the task, and
  // reads the first answer.
  const liveChannel = useMemo(
    () => ({ messages: page?.messages ?? [], tasks: page?.tasks ?? [], leadAgentId: channel?.leadAgentId ?? null }),
    [page?.messages, page?.tasks, channel?.leadAgentId],
  );
  // HoleA.I: the group chat features after Signal, as on the desktop.
  const memberId = server?.membershipId ?? null;
  const people = useServerMembers(serverId).members.data;
  const mentionPeople = useMemo(
    () =>
      (people ?? [])
        .filter((person) => person.status === "active" && person.membershipId !== memberId)
        .map((person) => ({ id: person.membershipId, name: person.name?.trim() || person.email.split("@")[0] || "" }))
        .filter((person) => person.name),
    [people, memberId],
  );
  const viewerName = (people ?? []).find((person) => person.membershipId === memberId)?.name?.trim() || "You";
  const viewer = useMemo(() => (memberId ? { id: memberId, name: viewerName } : null), [memberId, viewerName]);
  const reactInChannel = useCallback(
    async (messageId: string, emoji: string | null) => {
      await store.command(serverId, { type: "react", operationId: Crypto.randomUUID(), channelId, messageId, emoji });
    },
    [store, serverId, channelId],
  );
  const typingNames = useMemo(
    () => (page?.typing ?? []).filter((member) => member.memberId !== memberId).map((member) => member.name),
    [page?.typing, memberId],
  );
  // Signal's rhythm: "started" again every 10 s while the keys move, "stopped" after 3 s without one
  // or when the field empties. A host without the command answers with an error, which stops nothing.
  const typing = useRef<{ active: boolean; sentAt: number; idle: ReturnType<typeof setTimeout> | null }>({
    active: false,
    sentAt: 0,
    idle: null,
  });
  const sendTyping = useCallback(
    (active: boolean) => {
      void store
        .command(serverId, { type: "typing", operationId: Crypto.randomUUID(), channelId, typing: active })
        .catch(() => undefined);
    },
    [store, serverId, channelId],
  );
  const onDraftChange = useCallback(
    (draft: string) => {
      const state = typing.current;
      if (state.idle) clearTimeout(state.idle);
      state.idle = null;
      if (!draft.trim() || archived || !online) {
        if (state.active) sendTyping(false);
        state.active = false;
        return;
      }
      const now = Date.now();
      if (!state.active || now - state.sentAt >= 10_000) {
        state.active = true;
        state.sentAt = now;
        sendTyping(true);
      }
      state.idle = setTimeout(() => {
        state.idle = null;
        if (state.active) sendTyping(false);
        state.active = false;
      }, 3_000);
    },
    [sendTyping, archived, online],
  );
  useEffect(
    () => () => {
      const state = typing.current;
      if (state.idle) clearTimeout(state.idle);
      if (state.active) sendTyping(false);
    },
    [sendTyping],
  );
  // The unread messages that mention the reader when the chat opened; the @ goes to each in turn.
  const unreadAtOpen = useRef<number | null>(null);
  if (unreadAtOpen.current === null && summary) unreadAtOpen.current = summary.unreadCount;
  const [visitedMentions, setVisitedMentions] = useState<ReadonlySet<string>>(() => new Set());
  const unreadMentionIds = useMemo(() => {
    const count = unreadAtOpen.current ?? 0;
    if (!memberId || count === 0 || !page) return [];
    const marker = `(member:${memberId})`;
    return page.messages
      .filter((entry) => !(entry.author.kind === "member" && entry.author.id === memberId))
      .slice(-count)
      .filter((entry) => entry.message.text.includes(marker) && !visitedMentions.has(entry.id))
      .map((entry) => entry.id);
  }, [memberId, page, visitedMentions]);
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null);
  const mentionJump = useMemo(
    () =>
      unreadMentionIds.length > 0
        ? {
            count: unreadMentionIds.length,
            onPress: () => {
              const next = unreadMentionIds[0];
              if (!next) return;
              setFocusMessageId(next);
              setVisitedMentions((current) => new Set([...current, next]));
            },
          }
        : null,
    [unreadMentionIds],
  );
  const name = channel?.name ?? t("mobile.channel.chat.fallbackName");
  const target = useMemo(
    () => ({ kind: "channel" as const, id: channelId, serverId, name, members }),
    [channelId, serverId, name, members],
  );
  return (
    <ChatView
      target={target}
      agents={serverAgents}
      mentionAgents={members}
      projectedMessages={messages}
      referenceMessages={messages}
      ready={Boolean(page)}
      historyLoadFailed={Boolean(state.error) || (!state.loading && !channel)}
      canSend={canSend}
      readOnly={archived}
      notice={archived ? t("mobile.channel.chat.deletedNotice") : null}
      activities={activities}
      activeTurnId={null}
      liveChannel={liveChannel}
      questionForm={questionForm}
      onSelectQuestion={selectPrompt}
      approvals={approvals}
      channelThreadIds={threadIds}
      readBoundary={throughSequence ? String(throughSequence) : null}
      markRead={markRead}
      fetchHistory={fetchHistory}
      hasOlder={page?.olderCursor != null}
      olderLoading={olderLoading}
      olderError={olderError}
      loadOlder={loadOlder}
      needsAction={channelTasksNeedingAction(page?.tasks ?? []).length > 0}
      channelLeadAgentId={channel?.leadAgentId ?? null}
      channelViewer={viewer}
      reactInChannel={archived ? undefined : reactInChannel}
      mentionPeople={mentionPeople}
      typingNames={typingNames}
      onDraftChange={onDraftChange}
      mentionJump={mentionJump}
      focusMessageId={focusMessageId}
      onFocusPlaced={() => setFocusMessageId(null)}
      onLeave={leaveChat}
    />
  );
}
