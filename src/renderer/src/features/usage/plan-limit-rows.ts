import type { QuotaShare } from "@openbot/contracts/ipc";
import {
  accountUsageProviderRows,
  quotaShareWindows,
  withQuotaShares,
} from "@openbot/ui/features/account/account-usage-view";
import { useText } from "@openbot/ui/text";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { useAuth } from "../account/account-context";
import { useAgents } from "../agents/agents-context";
import { withHostAccountUsage } from "../agents/host-provider-accounts";
import { useServers } from "../servers/servers-context";

/** A finished turn changes the split; a burst of them reads it once. */
const SHARE_REFRESH_MS = 10_000;

/**
 * One row per provider account of the active server, for the rail rings. HoleA.I: each window also
 * carries what every agent spent of it, read from this computer's usage records.
 */
export function usePlanLimitRows() {
  const text = useText();
  let auth: ReturnType<typeof useAuth>;
  try {
    auth = useAuth();
  } catch {
    // HoleA.I: the web app has no account provider, so it shows no meters rather than failing the chat.
    return (): ReturnType<typeof withQuotaShares> => [];
  }
  const { agentStatus, hostAccountLimits, agentList } = useAgents();
  const { activeServerId } = useServers();
  const rows = createMemo(() =>
    accountUsageProviderRows(
      withHostAccountUsage(auth.accountUsage(), hostAccountLimits()),
      agentStatus().providers,
      text,
    ),
  );
  const windows = createMemo(() => quotaShareWindows(rows()), {
    equals: (left, right) => JSON.stringify(left) === JSON.stringify(right),
  });
  const [shares, setShares] = createSignal<QuotaShare[]>([]);
  let generation = 0;
  async function read() {
    const request = ++generation;
    const serverId = activeServerId();
    const wanted = windows();
    if (!serverId || wanted.length === 0) {
      setShares([]);
      return;
    }
    try {
      const result = await window.openbot.agent.getQuotaShares({ windows: wanted }, serverId);
      if (request === generation) setShares(result ?? []);
    } catch {
      // The split is extra: the meters still show without it.
      if (request === generation) setShares([]);
    }
  }
  createEffect(
    () => [activeServerId(), windows()] as const,
    () => {
      void read();
    },
  );
  let pending: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = window.openbot.agent.onScopedEvent(({ event }) => {
    if (event.type !== "turn-completed" || pending) return;
    pending = setTimeout(() => {
      pending = undefined;
      void read();
    }, SHARE_REFRESH_MS);
  });
  onCleanup(() => {
    generation++;
    unsubscribe();
    if (pending) clearTimeout(pending);
  });
  return createMemo(() => withQuotaShares(rows(), shares(), agentList()));
}
