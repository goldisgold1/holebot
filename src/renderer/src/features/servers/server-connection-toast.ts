import { toast } from "@openbot/ui";
import { currentText } from "@openbot/ui/text";
import { createEffect, onCleanup } from "solid-js";

/**
 * HoleA.I (from Vincent's bot app): a short drop reconnects with no notice. The notice shows only when
 * the workspace is still away after this time.
 */
const OUTAGE_NOTICE_DELAY_MS = 4000;

/** A retry changes the same notice. Only a recovered workspace earns a success notice. */
export function createServerConnectionToast(
  read: () => { id: string; name: string; ready: boolean; quiet: boolean } | null,
) {
  let serverId: string | null = null;
  let wasReady = false;
  let outage = false;
  let shown = false;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  const cancelNotice = () => {
    clearTimeout(noticeTimer);
    noticeTimer = undefined;
  };
  const id = () => `server-connection:${serverId}`;
  const restoredId = () => `${id()}:restored`;
  createEffect(read, (value) => {
    if (value?.id !== serverId) {
      toast.dismiss(id());
      toast.dismiss(restoredId());
      serverId = value?.id ?? null;
      wasReady = false;
      outage = false;
      shown = false;
      cancelNotice();
    }
    if (!value) return;
    const { t } = currentText();
    if (value.ready) {
      cancelNotice();
      toast.dismiss(id());
      if (outage && shown) toast.success(t("server.connection.restored", { name: value.name }), { id: restoredId() });
      wasReady = true;
      outage = false;
      shown = false;
    } else if (value.quiet) {
      cancelNotice();
      outage = false;
      shown = false;
      toast.dismiss(id());
    } else if (wasReady && !outage) {
      outage = true;
      const name = value.name;
      noticeTimer = setTimeout(() => {
        noticeTimer = undefined;
        shown = true;
        toast(t("server.connection.reconnecting", { name }), {
          id: id(),
          description: t("server.connection.cachedHint"),
          duration: Number.POSITIVE_INFINITY,
        });
      }, OUTAGE_NOTICE_DELAY_MS);
    }
  });
  onCleanup(() => {
    cancelNotice();
    toast.dismiss(id());
    toast.dismiss(restoredId());
  });
}
