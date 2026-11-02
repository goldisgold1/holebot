import type { ChatMessage } from "./chat-messages";

/** The corner radius of a bubble, and of the corners where it joins the next bubble of its run. */
export const BUBBLE_RADIUS = 18;
export const BUBBLE_TUCKED_RADIUS = 6;
/** A bubble is at most this part of the list width, and always leaves this gap on the far side. */
export const BUBBLE_MAX_FRACTION = 0.9;
export const BUBBLE_FAR_GUTTER = 44;

/** Whether a bubble joins the bubble of the same speaker above it and below it. */
export interface BubbleJoins {
  above: boolean;
  below: boolean;
}

type Row = ChatMessage | { id: string; kind: "exchange-group" };

/** A text bubble that can sit in a run: files, generated images, replies and failures break runs. */
function runText(row: Row): Extract<ChatMessage, { kind: "message" }> | null {
  if (row.kind !== "message" || !row.body.trim() || row.attachments?.length || row.imageGeneration) return null;
  return row;
}

function sameSpeaker(above: Row, below: Row, startsTurn: (id: string) => boolean): boolean {
  const upper = runText(above);
  const lower = runText(below);
  return (
    upper !== null &&
    lower !== null &&
    upper.author === lower.author &&
    upper.speaker?.id === lower.speaker?.id &&
    upper.sender?.id === lower.sender?.id &&
    upper.status !== "failed" &&
    !lower.replyToMessageId &&
    // The steps row of a turn sits above its first answer.
    !startsTurn(lower.id)
  );
}

/**
 * Consecutive text messages from one speaker read as one block: the corners where two of their
 * bubbles meet are tucked on the speaker's side. Only rows that join are in the map.
 */
export function bubbleRuns(
  rows: readonly Row[],
  startsTurn: (id: string) => boolean = () => false,
): ReadonlyMap<string, BubbleJoins> {
  const joins = new Map<string, BubbleJoins>();
  for (let index = 1; index < rows.length; index += 1) {
    const above = rows[index - 1];
    const below = rows[index];
    if (!above || !below || !sameSpeaker(above, below, startsTurn)) continue;
    joins.set(above.id, { above: joins.get(above.id)?.above ?? false, below: true });
    joins.set(below.id, { above: true, below: false });
  }
  return joins;
}

/** The corner radii of a bubble on the speaker's side of the chat. */
export function bubbleCorners(side: "start" | "end", joinsAbove: boolean, joinsBelow: boolean) {
  const top = joinsAbove ? BUBBLE_TUCKED_RADIUS : BUBBLE_RADIUS;
  const bottom = joinsBelow ? BUBBLE_TUCKED_RADIUS : BUBBLE_RADIUS;
  return side === "end"
    ? {
        borderTopLeftRadius: BUBBLE_RADIUS,
        borderBottomLeftRadius: BUBBLE_RADIUS,
        borderTopRightRadius: top,
        borderBottomRightRadius: bottom,
      }
    : {
        borderTopLeftRadius: top,
        borderBottomLeftRadius: bottom,
        borderTopRightRadius: BUBBLE_RADIUS,
        borderBottomRightRadius: BUBBLE_RADIUS,
      };
}

/** The widest a bubble may be in a list of this width. */
export function bubbleMaxWidth(listWidth: number): number {
  return Math.max(0, Math.min(listWidth * BUBBLE_MAX_FRACTION, listWidth - BUBBLE_FAR_GUTTER));
}
