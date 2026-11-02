import { ArrowLeft, ArrowLeftRight, Button } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { createUniqueId, For, onSettled, Show } from "solid-js";
import type { AgentProfile } from "../../data";
import { useText } from "../../text";
import { AgentAvatar } from "../agents/AgentAvatar";

/** The messages between this chat's agent and the agents it talked to, as one exchange row opens them. */
export interface AgentExchange {
  /** The agent whose chat this is: the sender of the outgoing messages. */
  selfAgentId: string | undefined;
  /** The other agents of the exchange, in the order they first appear. */
  peerAgentIds: readonly string[];
  /** The exchange ids of the messages, oldest first. Only messages whose text the chat has. */
  messageIds: readonly string[];
}

interface AgentExchangeViewProps {
  exchange: AgentExchange;
  agents: AgentProfile[];
  /** The name of the chat the view covers, for "Back to {name}". */
  returnName: string;
  /** Draws one message of the exchange as a chat bubble, by its exchange id. */
  renderMessage: (messageId: string) => JSX.Element;
  onClose: () => void;
}

/**
 * A full-pane view of the messages between two agents. It covers the chat while it is open, so a
 * long talk between agents does not fill the chat. "Back to {name}" and Escape return to the chat.
 */
export function AgentExchangeView(props: AgentExchangeViewProps) {
  const { t } = useText();
  const agent = (agentId: string | undefined) => props.agents.find((candidate) => candidate.id === agentId);
  const self = () => agent(props.exchange.selfAgentId);
  const peers = () => props.exchange.peerAgentIds.map((agentId) => agent(agentId));
  const selfName = () => self()?.name ?? t("chat.marker.unavailableAgent");
  const peersName = () => {
    const list = peers();
    if (list.length === 1) return list[0]?.name ?? t("chat.marker.unavailableAgent");
    return t("chat.marker.agentCount", { count: list.length });
  };
  const titleId = createUniqueId();
  let backButton: HTMLButtonElement | undefined;
  onSettled(() => {
    // The view takes the focus from the row that opened it; the host gives it back on close.
    backButton?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // A menu or dialog over the view closes first.
      if (event.target instanceof Element && event.target.closest("[role=menu], [role=dialog]")) return;
      event.preventDefault();
      props.onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  return (
    <section class="agent-exchange-view" aria-labelledby={titleId}>
      <header class="agent-exchange-header">
        <Button
          ref={backButton}
          variant="ghost"
          size="sm"
          type="button"
          class="agent-exchange-back"
          data-cuelume-tap="close"
          onClick={() => props.onClose()}
        >
          <ArrowLeft aria-hidden="true" />
          <span>{t("chat.exchange.back", { name: props.returnName })}</span>
        </Button>
        <h2
          id={titleId}
          class="agent-exchange-title"
          aria-label={t("chat.exchange.title", { a: selfName(), b: peersName() })}
        >
          <span class="agent-exchange-party" aria-hidden="true">
            <AgentAvatar agent={self()} class="agent-exchange-face" />
            <span class="agent-exchange-name">{selfName()}</span>
          </span>
          <ArrowLeftRight class="agent-exchange-arrows" aria-hidden="true" />
          <span class="agent-exchange-party" aria-hidden="true">
            <span class="agent-exchange-faces">
              <For each={peers().slice(0, 3)}>{(peer) => <AgentAvatar agent={peer} class="agent-exchange-face" />}</For>
            </span>
            <span class="agent-exchange-name">{peersName()}</span>
          </span>
        </h2>
      </header>
      <div class="agent-exchange-scroll">
        <Show
          when={props.exchange.messageIds.length > 0}
          fallback={<p class="agent-exchange-empty">{t("chat.exchange.empty")}</p>}
        >
          <ol
            class="agent-exchange-messages"
            aria-label={t("chat.exchange.messages", { a: selfName(), b: peersName() })}
          >
            <For each={props.exchange.messageIds}>
              {(messageId) => <li class="agent-exchange-message">{props.renderMessage(messageId)}</li>}
            </For>
          </ol>
        </Show>
      </div>
    </section>
  );
}
