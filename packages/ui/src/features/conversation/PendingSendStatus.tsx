import { Button } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

export interface PendingSendStatusProps {
  state: "waiting" | "sending" | "failed";
  /** Why the send failed, when the host or the connection said. */
  error?: string | null;
  /** The composer shows the update notice; keep recovery actions without a second error. */
  updateRequired?: boolean;
  /** The host drops a repeated send of this message, so Resend cannot store it twice. */
  retrySafe: boolean;
  /** Edit needs an empty composer, so the failed message replaces nothing the user wrote. */
  canEdit: boolean;
  onRetry: () => void;
  onEdit: () => void;
  onDismiss: () => void;
}

/**
 * The delivery line under a message the host has not stored yet, end-aligned under the bubble. A
 * send in flight shows nothing; a send queued behind another reads "Not delivered yet"; a failure
 * reads "Failed to send" with the text buttons Resend and Delete, then Edit. The status text is a
 * polite live region that stays while the send runs, so a reader hears the change without moving
 * focus. A message whose repeat the host cannot detect offers no Resend: the first send may have
 * arrived.
 */
export function PendingSendStatus(props: PendingSendStatusProps): JSX.Element {
  const { t } = useText();
  const failed = () => props.state === "failed";
  return (
    <div class="pending-send-status" data-state={props.state}>
      <span role="status" class="pending-send-label">
        <Show when={props.state === "waiting"}>
          <span class="pending-send-queued">{t("conversation.send.notDelivered")}</span>
        </Show>
        <Show when={failed() && !props.updateRequired}>
          {props.retrySafe ? t("conversation.send.failed") : t("chat.send.unconfirmed")}
          <Show when={props.error}>{(error) => <span class="pending-send-error">{error()}</span>}</Show>
        </Show>
      </span>
      <Show when={failed()}>
        <Show when={props.retrySafe && !props.updateRequired}>
          <Button variant="ghost" size="xs" class="pending-send-action" onClick={() => props.onRetry()}>
            {t("conversation.send.resend")}
          </Button>
        </Show>
        <Button variant="ghost" size="xs" class="pending-send-action" onClick={() => props.onDismiss()}>
          {t("conversation.send.delete")}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          class="pending-send-action"
          disabled={!props.canEdit}
          onClick={() => props.onEdit()}
        >
          {t("chat.send.edit")}
        </Button>
      </Show>
    </div>
  );
}
