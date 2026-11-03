import type { AttachmentSummary, ConversationReaction, InstalledSkill } from "@openbot/contracts/ipc";
import { CHANNEL_REACTION_GROUPS_SHOWN, type ChannelReactionGroup } from "@openbot/contracts/signal-port/reactions";
import {
  Bubble,
  BubbleContent,
  BubbleReactions,
  Button,
  ContextMenu,
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { createMemo, For, Show } from "solid-js";
import { avatarHeadColor } from "../../bloub-avatar";
import type { AgentMessage, AgentProfile } from "../../data";
import { useText } from "../../text";
import { AgentAvatar } from "../agents/AgentAvatar";
import type { AttachmentMediaSource } from "./AttachmentCards";
import type { MessageImageFile } from "./MarkdownMessageText";
import { conversationBubbleVariant, MessageBody } from "./MessageRendering";

/**
 * Who wrote a message, as much as a row needs to draw it.
 *
 * `you` draws neither a face nor a name: a chat does not tell the reader who they are. `member` is
 * another person in the chat. HoleA.I: as in a messenger, a member stands on the left with their face
 * and name, like an agent, and keeps a bubble in that person's colour. Everything else is an author
 * with an identity, whether it is an agent of this chat or a member of a channel.
 */
export interface ChatMessageAuthor {
  kind: "you" | "agent" | "member";
  name: string;
  /** Missing for an author the agent list no longer holds, and for the reader's own messages. */
  agent?: AgentProfile | undefined;
  /** The face to draw when the profile is gone: the author id keeps deleted agents apart. */
  avatarSeed?: string | undefined;
  /** HoleA.I: a member's own profile picture; without one the face comes from `avatarSeed`. */
  avatarUrl?: string | null | undefined;
}

export interface ChatMessageRowProps {
  message: AgentMessage;
  author: ChatMessageAuthor;
  /**
   * Whether the face stands beside the bubble and the name above it. The agent chat never shows a
   * face - one chat has one agent, and its name is in the header - but names another person once
   * for a run of their messages. A channel shows both once for a run of messages by one author.
   * `false` keeps an empty gutter where the face stands; leave it out when the row has no face.
   */
  showAuthor?: boolean | undefined;
  /**
   * Whether the face stands beside the bubble, apart from the name. A run of several messages names
   * its author on the first one and draws the face beside the last one, as a messenger does, so the
   * face marks where the run ends. Left out, the face follows `showAuthor`.
   */
  showFace?: boolean | undefined;
  /** Whether the time stands beside the author name. Without a name, the time is in the action row. */
  showTime?: boolean | undefined;
  animate?: boolean;
  agents: AgentProfile[];
  skills?: InstalledSkill[] | undefined;
  referencedMessage?: AgentMessage | undefined;
  /** Who wrote the quoted message. A chat with several authors has to name the one it quotes. */
  referencedAuthorName?: string | undefined;
  /** Opens the quoted message in the chat. */
  onOpenReference?: (() => void) | undefined;
  referenceState?: "loading" | "unavailable" | undefined;
  reactions?: readonly ConversationReaction[] | undefined;
  reactionOverflowCount?: number | undefined;
  /** HoleA.I: a group chat's reactions, grouped by emoji (Signal's pills). Drawn in place of `reactions`. */
  groupReactions?: readonly ChannelReactionGroup[] | undefined;
  /** Adds the reader's reaction with that emoji, or takes it back when it is theirs. */
  onToggleGroupReaction?: ((emoji: string) => void) | undefined;
  onRemoveReaction?: (() => void) | undefined;
  actions?: JSX.Element;
  /** Draws the right-click menu, a `MessageMenu`. Without it, right-click keeps the native menu. */
  menu?: (() => JSX.Element) | undefined;
  /** Extra content inside the bubble, under the body: a question prompt, a note about the message. */
  children?: JSX.Element;
  class?: string | undefined;
  "data-chat-search-message"?: string | undefined;
  onSelectAgent: (agentId: string) => void;
  onOpenLink: (url: string) => void;
  onPreview: (attachment: AttachmentSummary) => void;
  onAttachmentAction: (attachment: AttachmentSummary, action: "open" | "reveal" | "download") => void;
  onOpenSharedFile?: (path: string) => void;
  onOpenWorkspaceFile?: ((path: string) => void) | undefined;
  onOpenQuote?: ((messageId: string, text: string) => void) | undefined;
  onDownload?: ((attachment: AttachmentSummary) => void) | undefined;
  /** Loads the images and media of a client that gets no `previewUrl`. */
  mediaSource?: AttachmentMediaSource | undefined;
  /** Reads an image file that an agent message names, for a preview under the text. */
  loadImageFile?: ((file: MessageImageFile) => Promise<string | null>) | undefined;
  onDownloadImageFile?: ((file: MessageImageFile) => void) | undefined;
  /** The window draws the macOS window controls over the top start corner. The image viewer leaves room. */
  macWindowControls?: boolean | undefined;
}

/**
 * One message of a chat: the alignment, the face, the name, the bubble, its reactions, the action
 * row under the bubble.
 *
 * It is shared because the agent chat and the channel chat draw the same message. They differed on
 * every part around the bubble - the channel had no entrance animation, no streaming state on the
 * bubble and no toolbar - for as long as each wrote its own row, and this component is what stops
 * that from happening a third time. It reads no context and no store: what a caller knows about a
 * conversation arrives as a prop.
 */
export function ChatMessageRow(props: ChatMessageRowProps): JSX.Element {
  const { t } = useText();
  const own = () => props.author.kind === "you";
  const member = () => props.author.kind === "member";
  const person = () => own() || member();
  // A memo, because `Bubble` reads the variant more than once and it splits the whole body.
  const variant = createMemo(() => conversationBubbleVariant(props.message));
  const seed = () => props.author.agent?.avatarSeed ?? props.author.avatarSeed;
  // A colour literal in an inline style is refused by `check:ui`, and rightly: this is the agent's
  // own head colour, read through the same helper the action markers use, so a name matches the
  // face beside it.
  const authorStyle = () => {
    const currentSeed = seed();
    if (own() || currentSeed === undefined) return undefined;
    return `--message-author-color: ${avatarHeadColor(currentSeed, props.author.agent?.avatarHue ?? null)}`;
  };
  const rowClass = () => [
    "message-entry",
    {
      "message-entry-animated": props.animate === true,
      // HoleA.I: as in a messenger, only the reader stands on the right; another person stands on the
      // left with their face and name, like an agent, and keeps their own bubble colour.
      "message-entry-user": own(),
      "message-entry-agent": !own(),
      "message-entry-member": member(),
      "message-entry-with-author": props.showAuthor === true && !own(),
    },
    props.class,
  ];
  // The native menu copies selected text and links, and Shift opens Inspect Element. These cases
  // stop the event before the trigger's delegated handler, which would prevent its default, so the
  // native menu still opens. The keyboard opens the menu with a synthetic event, which always opens it.
  const onSelection = (event: MouseEvent) => {
    const selection = window.getSelection();
    return (
      selection !== null &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      [...selection.getRangeAt(0).getClientRects()].some(
        (rect) =>
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom,
      )
    );
  };
  const keepNativeMenu = (row: HTMLElement) => {
    // Chromium on macOS can select the word under the pointer before `contextmenu`, so the press
    // that opens a menu records the selection the user made before it.
    let pressOnSelection: boolean | undefined;
    row.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button === 2 || event.ctrlKey) pressOnSelection = onSelection(event);
      },
      { capture: true },
    );
    row.addEventListener(
      "contextmenu",
      (event) => {
        const selected = pressOnSelection ?? onSelection(event);
        pressOnSelection = undefined;
        if (!event.isTrusted) return;
        const link = event.target instanceof Element && event.target.closest("a[href]") !== null;
        if (event.shiftKey || link || selected) event.stopPropagation();
      },
      { capture: true },
    );
  };
  // A row in a chat with faces draws the face, or keeps its column empty so the bubbles stay in line.
  const face = () => (props.showAuthor === undefined || own() ? undefined : (props.showFace ?? props.showAuthor));
  const body = (): JSX.Element => (
    <>
      <Show when={face()}>
        <MessageAvatar class="message-author-avatar">
          <Show when={props.author.agent} fallback={<AgentAvatar seed={seed()} url={props.author.avatarUrl ?? null} />}>
            {(agent) => (
              <Button
                variant="ghost"
                class="message-author-avatar-button"
                aria-label={t("chat.row.openChat", { name: props.author.name })}
                onClick={() => props.onSelectAgent(agent().id)}
              >
                <AgentAvatar agent={agent()} seed={seed()} />
              </Button>
            )}
          </Show>
        </MessageAvatar>
      </Show>
      {/* A named row keeps its face column in its grid, so only a row without a name needs the spacer. */}
      <Show when={face() === false && props.showAuthor === false}>
        <div class="message-author-gutter" aria-hidden="true" />
      </Show>
      <MessageContent>
        <Show when={props.showAuthor && !own()}>
          <MessageHeader class="message-author-name">
            <Show when={props.author.agent} fallback={<span>{props.author.name}</span>}>
              {(agent) => (
                <Button
                  variant="ghost"
                  class="message-author-name-button"
                  aria-label={t("chat.row.openChat", { name: props.author.name })}
                  onClick={() => props.onSelectAgent(agent().id)}
                >
                  {props.author.name}
                </Button>
              )}
            </Show>
            <Show when={props.showTime}>
              <time class="message-time" datetime={props.message.createdAt}>
                {props.message.time}
              </time>
            </Show>
          </MessageHeader>
        </Show>
        <div class="message-shell">
          <Bubble
            class={member() ? "message-bubble-member" : undefined}
            align={own() ? "end" : "start"}
            variant={variant()}
            data-author={person() ? "user" : "assistant"}
            data-streaming={props.message.streaming === true ? "" : undefined}
          >
            <BubbleContent>
              <MessageBody
                animate={props.animate}
                message={props.message}
                referencedMessage={props.referencedMessage}
                referencedAuthorName={props.referencedAuthorName}
                onOpenReference={props.onOpenReference}
                referenceState={props.referenceState}
                agents={props.agents}
                skills={props.skills}
                onSelectAgent={props.onSelectAgent}
                onOpenLink={props.onOpenLink}
                onPreview={props.onPreview}
                onAttachmentAction={props.onAttachmentAction}
                onOpenSharedFile={props.onOpenSharedFile}
                onOpenWorkspaceFile={props.onOpenWorkspaceFile}
                onOpenQuote={props.onOpenQuote}
                onDownload={props.onDownload}
                mediaSource={props.mediaSource}
                loadImageFile={props.loadImageFile}
                onDownloadImageFile={props.onDownloadImageFile}
                macWindowControls={props.macWindowControls}
              />
              {props.children}
            </BubbleContent>
            <Show when={(props.groupReactions?.length ?? 0) > 0}>
              <BubbleReactions
                class="message-reaction-anchor"
                align={own() ? "start" : "end"}
                overflowCount={Math.max(0, (props.groupReactions?.length ?? 0) - CHANNEL_REACTION_GROUPS_SHOWN)}
                role="group"
                aria-label={t("chat.row.reactions", {
                  emoji: (props.groupReactions ?? []).map((group) => group.emoji).join(", "),
                })}
              >
                <For each={(props.groupReactions ?? []).slice(0, CHANNEL_REACTION_GROUPS_SHOWN)}>
                  {(group) => (
                    <Button
                      variant="ghost"
                      type="button"
                      class={["message-reaction-pill", { "message-reaction-pill-mine": group.mine }]}
                      title={`${group.names.join(", ")} ${group.emoji}`}
                      aria-pressed={group.mine ? "true" : "false"}
                      aria-label={`${group.names.join(", ")} ${group.emoji}`}
                      onClick={() => props.onToggleGroupReaction?.(group.emoji)}
                    >
                      <span aria-hidden="true">{group.emoji}</span>
                      <Show when={group.count > 1}>
                        <span class="message-reaction-count">{group.count}</span>
                      </Show>
                    </Button>
                  )}
                </For>
              </BubbleReactions>
            </Show>
            <Show when={!props.groupReactions && (props.reactions?.length ?? 0) > 0}>
              <BubbleReactions
                class="message-reaction-anchor"
                align={own() ? "start" : "end"}
                overflowCount={props.reactionOverflowCount}
                role="group"
                aria-label={t("chat.row.reactions", {
                  emoji: (props.reactions ?? []).map((reaction) => reaction.emoji).join(", "),
                })}
              >
                <For each={props.reactions ?? []}>
                  {(reaction) => (
                    <Show
                      when={reaction.actor.kind === "user"}
                      fallback={
                        <span
                          class="message-reaction-pill message-reaction-pill-readonly"
                          role="img"
                          aria-label={t("chat.row.agentReaction", {
                            name:
                              props.agents.find(
                                (agent) => reaction.actor.kind === "agent" && agent.id === reaction.actor.agentId,
                              )?.name ?? t("chat.message.agentFallback"),
                            emoji: reaction.emoji,
                          })}
                        >
                          <span aria-hidden="true">{reaction.emoji}</span>
                        </span>
                      }
                    >
                      <Button
                        variant="ghost"
                        type="button"
                        class="message-reaction-pill"
                        aria-label={t("chat.row.removeReaction", { emoji: reaction.emoji })}
                        onClick={() => props.onRemoveReaction?.()}
                      >
                        <span aria-hidden="true">{reaction.emoji}</span>
                      </Button>
                    </Show>
                  )}
                </For>
              </BubbleReactions>
            </Show>
          </Bubble>
        </div>
        {/* The actions and the time stand under the bubble. A named author shows the time beside the name. */}
        <div class="message-action-row">
          {props.actions}
          <Show when={!props.showAuthor || own()}>
            <time class="message-time" datetime={props.message.createdAt}>
              {props.message.time}
            </time>
          </Show>
        </div>
      </MessageContent>
    </>
  );
  return (
    <Show
      when={props.menu}
      fallback={
        <Message
          role="article"
          align={own() ? "end" : "start"}
          aria-label={t("chat.row.label", { name: props.author.name })}
          data-author={person() ? "user" : "assistant"}
          data-chat-search-message={props["data-chat-search-message"]}
          style={authorStyle()}
          class={rowClass()}
        >
          {body()}
        </Message>
      }
    >
      {(menu) => (
        <ContextMenu.Root modal={false}>
          <ContextMenu.Trigger
            as="div"
            ref={keepNativeMenu}
            aria-keyshortcuts="Shift+F10"
            onKeyDown={(event: KeyboardEvent & { currentTarget: HTMLElement }) => {
              if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
              event.preventDefault();
              const bounds = event.currentTarget.getBoundingClientRect();
              event.currentTarget.dispatchEvent(
                new MouseEvent("contextmenu", {
                  bubbles: true,
                  cancelable: true,
                  clientX: bounds.left,
                  clientY: bounds.top,
                }),
              );
            }}
            role="article"
            // The trigger is the row, so it draws the `Message` primitive's element itself:
            // `as={Message}` would spread Kobalte's own props onto the DOM.
            data-slot="message"
            data-align={own() ? "end" : "start"}
            aria-label={t("chat.row.label", { name: props.author.name })}
            data-author={person() ? "user" : "assistant"}
            data-chat-search-message={props["data-chat-search-message"]}
            style={authorStyle() ?? ""}
            class={["ui-message", ...rowClass()]}
          >
            {body()}
          </ContextMenu.Trigger>
          <ContextMenu.Portal>{menu()()}</ContextMenu.Portal>
        </ContextMenu.Root>
      )}
    </Show>
  );
}
