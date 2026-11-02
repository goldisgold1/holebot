import { Badge, Button, ChevronDown, Clock3, Lock, MotionTooltip } from "@openbot/ui";
import { ProviderModelPicker } from "@openbot/ui/components/ProviderModelPicker";
import type { AgentProfile } from "@openbot/ui/data";
import { AccountUsageDetails } from "@openbot/ui/features/account/AccountUsageDetails";
import type { AccountUsageProviderRow } from "@openbot/ui/features/account/account-usage-view";
import { AgentAvatar } from "@openbot/ui/features/agents/AgentAvatar";
import { agentAccessLockLabel } from "@openbot/ui/features/agents/agent-access";
import { RemoteDesktopIcon } from "@openbot/ui/features/conversation/ConversationIcons";
import { SidePanelToggle, type SidePanelToggleProps } from "@openbot/ui/features/conversation/SidePanel";
import { useText } from "@openbot/ui/text";
import type { ComponentProps, JSX } from "@solidjs/web";
import { For, Show } from "solid-js";

export interface ConversationHeaderProps {
  agent: AgentProfile | null | undefined;
  /** The title of a chat that has no one agent, such as a channel. It shows when `agent` is missing. */
  title?: JSX.Element | undefined;
  modelPicker: ComponentProps<typeof ProviderModelPicker>;
  /** The plan limits of the agent's provider account. Their bars sit beside the model picker. */
  usage?: ConversationHeaderUsage | undefined;
  /** A model, effort, provider or account chosen during the running turn. It applies from the next turn. */
  pendingModel?: ConversationHeaderPendingModel | undefined;
  onSettingsIntent: () => void;
  onOpenSettings: () => void;
  /** Set while a side thread is open: the agent's name then opens the agent's own chat, not its settings. */
  onOpenChat?: (() => void) | undefined;
  remoteControl?: ConversationHeaderRemoteControl | undefined;
  /** Missing when the chat has no side panel, such as a deleted channel. */
  sidePanel?: SidePanelToggleProps | undefined;
  /** The thread tabs of the agent, after its name. */
  threads?: JSX.Element | undefined;
  /**
   * Set when the agent has thread tabs: the agent's name is then the first tab, for the agent's own
   * chat, and is selected while that chat is open.
   */
  titleSelected?: boolean | undefined;
  /**
   * The voice call with the agent, while one runs: its popover hangs under the agent's name, and its
   * "on call" chip sits beside it when minimised.
   */
  voiceCall?: JSX.Element | undefined;
  /** Set while a call runs: a press on the agent's name opens or minimises the call instead. */
  onToggleVoiceCall?: (() => void) | undefined;
  /** The call's popover shows, rather than its chip. */
  voiceCallExpanded?: boolean | undefined;
}

export interface ConversationHeaderPendingModel {
  /** The model, and the effort when it changes too, of the running turn. */
  running: string;
  /** The same for the next turn. */
  next: string;
}

export interface ConversationHeaderUsage {
  row: AccountUsageProviderRow;
  /** Opens the Usage page. */
  onOpen: () => void;
}

export interface ConversationHeaderRemoteControl {
  enabled: boolean;
  active: boolean;
  visible: boolean;
  onOpen: (trigger: HTMLButtonElement) => void;
}

export function ConversationHeader(props: ConversationHeaderProps) {
  const { t } = useText();
  const titleTab = () => (props.titleSelected === undefined ? undefined : "");
  const titleSelected = () => (props.titleSelected ? "" : undefined);
  return (
    <header class="window-drag conversation-header">
      <div class="conversation-heading-group">
        {/* The identity island: the agent's face and name in a pill. The voice call hangs from it. */}
        <div class="conversation-identity" data-voice-call-anchor="">
          <Show when={props.agent} fallback={props.title}>
            {(agent) => (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                class="conversation-title no-drag"
                data-tab={titleTab()}
                data-selected={titleSelected()}
                aria-label={
                  props.onToggleVoiceCall
                    ? t("conversation.voice.label", { name: agent().name })
                    : props.onOpenChat
                      ? t("conversation.header.mainChat")
                      : t("conversation.header.settings")
                }
                aria-expanded={props.onToggleVoiceCall ? (props.voiceCallExpanded ? "true" : "false") : undefined}
                onPointerEnter={() => props.onOpenChat || props.onSettingsIntent()}
                onFocus={() => props.onOpenChat || props.onSettingsIntent()}
                onClick={() => (props.onToggleVoiceCall ?? props.onOpenChat ?? props.onOpenSettings)()}
              >
                <AgentAvatar agent={agent()} />
                <h1>{agent().name}</h1>
                <ChevronDown class="conversation-title-chevron" aria-hidden="true" />
              </Button>
            )}
          </Show>
          {props.voiceCall}
        </div>
        <Show when={props.agent && agentAccessLockLabel(props.agent, t)}>
          {(label) => (
            <span class="conversation-access-lock" role="img" aria-label={label()} title={label()}>
              <Lock aria-hidden="true" />
            </span>
          )}
        </Show>
        {props.threads}
      </div>
      <div class="conversation-header-actions no-drag">
        <Show when={props.agent && props.pendingModel}>
          {(change) => {
            const detail = () => t("conversation.header.modelNextTurnDetail", change());
            return (
              <Badge variant="info-light" class="conversation-model-pending" role="status" title={detail()}>
                <Clock3 aria-hidden="true" />
                {t("conversation.header.modelNextTurn")}
                <span class="sr-only">{detail()}</span>
              </Badge>
            );
          }}
        </Show>
        <Show when={props.agent && props.usage}>{(usage) => <HeaderUsage usage={usage()} />}</Show>
        <Show when={props.agent}>
          <ProviderModelPicker {...props.modelPicker} />
        </Show>
        <Show when={props.remoteControl}>
          {(control) => (
            <Button
              variant="ghost"
              type="button"
              class="header-panel-toggle remote-desktop-button"
              aria-label={t(control().active ? "conversation.header.resumeRemote" : "conversation.header.openRemote")}
              aria-expanded={control().visible ? "true" : "false"}
              disabled={!control().enabled}
              onClick={(event) => control().onOpen(event.currentTarget)}
              data-cuelume-tap="open"
            >
              <RemoteDesktopIcon />
              <Show when={control().active}>
                <span class="remote-desktop-button-dot" aria-hidden="true" />
              </Show>
            </Button>
          )}
        </Show>
        <Show when={props.sidePanel}>{(sidePanel) => <SidePanelToggle {...sidePanel()} />}</Show>
      </div>
    </header>
  );
}

/**
 * HoleA.I: the plan limits beside the model picker, one short bar per window (5 hours, then the
 * week), filled by what is left. Hover shows each window with its reset time; a click opens Usage.
 */
function HeaderUsage(props: { usage: ConversationHeaderUsage }) {
  const { t } = useText();
  const windows = () => props.usage.row.ringWindows.slice(0, 2);
  const label = () =>
    windows()
      .map((window) => t("account.usage.row.window", { window: window.label, percent: window.remainingPercent }))
      .join(", ");
  return (
    <MotionTooltip
      content={
        <AccountUsageDetails
          rows={[props.usage.row]}
          loading={false}
          error={null}
          refreshActive={false}
          refreshDisabled
          onRefresh={() => undefined}
          title={<h2 class="account-usage-popover-title">{t("account.usage.title")}</h2>}
        />
      }
      class="ui-popover-menu-surface account-usage-popover header-usage-card"
      placement="bottom-end"
      openDelay={250}
      closeDelay={75}
    >
      <Button
        variant="ghost"
        type="button"
        class="header-usage"
        aria-label={`${t("account.usage.title")}: ${label()}`}
        onClick={() => props.usage.onOpen()}
      >
        <For each={windows()} keyed={false}>
          {(window) => (
            <span class="header-usage-window">
              <span class="header-usage-label" aria-hidden="true">
                {window().label}
              </span>
              <span class="header-usage-track" aria-hidden="true">
                <span
                  class="header-usage-fill"
                  data-usage-tone={window().tone}
                  style={{ width: `${window().remainingPercent}%` }}
                />
              </span>
            </span>
          )}
        </For>
      </Button>
    </MotionTooltip>
  );
}
