import { VoicePanel } from "@openbot/ui/features/conversation/VoicePanel";
import { Show, untrack } from "solid-js";
import { useConversationViewScope } from "./conversation-scope";

/**
 * The voice call with the chat's agent, under the chat header. The call begins when this mounts and
 * ends when it unmounts: Hang up closes it, and so does another agent or server (the header keys it).
 */
export function ConversationVoiceCall(callProps: { expanded: boolean; onExpandedChange: (expanded: boolean) => void }) {
  const { props, startVoiceConversation, closeSidePanelPane } = useConversationViewScope();
  const agentId = untrack(() => props.agent?.id);
  if (!agentId) return null;
  const conversation = startVoiceConversation(agentId);
  const startedAt = Date.now();
  return (
    <Show when={props.agent}>
      {(agent) => (
        <VoicePanel
          agent={agent()}
          phase={conversation.phase()}
          muted={conversation.muted()}
          heard={conversation.heard()}
          said={conversation.said()}
          levels={conversation.levels()}
          error={conversation.error()}
          onToggleMute={conversation.toggleMute}
          onInterrupt={conversation.interrupt}
          onEnd={() => closeSidePanelPane("voice")}
          expanded={callProps.expanded}
          onExpandedChange={callProps.onExpandedChange}
          startedAt={startedAt}
        />
      )}
    </Show>
  );
}
