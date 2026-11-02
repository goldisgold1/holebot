import { ProviderLogo } from "@openbot/brand";
import { Button, Gauge, RefreshCw } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { createSignal, For, onCleanup, Show } from "solid-js";
import { avatarHeadColor } from "../../bloub-avatar";
import { useText } from "../../text";
import { AgentAvatar } from "../agents/AgentAvatar";
import {
  type AccountUsageAgentShare,
  type AccountUsageProviderRow,
  type AccountUsageWindowRow,
  accountUsageRowKey,
  accountUsageRowLabel,
  formatUsageResetIn,
} from "./account-usage-view";

/** The reset countdown shows minutes, so a half-minute tick keeps it current. */
const RESET_CLOCK_MS = 30_000;

export function AccountUsageDetails(props: {
  rows: AccountUsageProviderRow[];
  loading: boolean;
  error: string | null;
  refreshActive: boolean;
  refreshDisabled: boolean;
  onRefresh: () => void;
  title: JSX.Element;
}) {
  const text = useText();
  const { t } = text;
  const empty = () => !props.loading && props.rows.length === 0;
  const [now, setNow] = createSignal(Date.now());
  const clock = window.setInterval(() => setNow(Date.now()), RESET_CLOCK_MS);
  onCleanup(() => window.clearInterval(clock));
  return (
    <>
      <header class="account-usage-popover-header">
        <div class="account-usage-popover-heading">
          <Gauge aria-hidden="true" />
          {props.title}
        </div>
        <Button
          variant="ghost"
          type="button"
          size="icon-sm"
          class="account-usage-refresh"
          aria-label={
            props.refreshActive
              ? t("account.usage.refreshing")
              : props.error
                ? t("common.tryAgain")
                : t("account.usage.refresh")
          }
          title={t("account.usage.refreshTitle")}
          onClick={props.onRefresh}
          disabled={props.refreshDisabled}
        >
          <RefreshCw class={props.refreshActive ? "icon-spinning" : ""} aria-hidden="true" />
        </Button>
      </header>
      <Show when={props.loading && props.rows.length === 0}>
        <p class="account-usage-empty" role="status">
          {t("account.usage.loading")}
        </p>
      </Show>
      <Show when={empty()}>
        <p class="account-usage-empty" role="status">
          {t("account.usage.empty")}
        </p>
      </Show>
      <Show when={props.rows.length > 0}>
        <ul class="account-usage-providers" aria-label={t("account.usage.providers")}>
          <For each={props.rows} keyed={accountUsageRowKey}>
            {(row) => (
              <li class="account-usage-provider" aria-label={accountUsageRowLabel(row(), text, props.loading)}>
                <ProviderLogo provider={row().provider} class="account-usage-provider-logo" />
                <Show
                  when={row().windows.length > 0}
                  fallback={
                    <>
                      <span class="account-usage-provider-copy">
                        <strong class="account-usage-provider-name">{row().name}</strong>
                        <span class="account-usage-provider-meta">
                          {!row().reportsUsage
                            ? t("account.usage.providerNotReported")
                            : props.loading
                              ? t("account.usage.window.limit")
                              : t("account.usage.notReported")}
                        </span>
                      </span>
                      <strong class="account-usage-provider-remaining">
                        {!row().reportsUsage
                          ? t("account.usage.value.notReported")
                          : props.loading
                            ? t("account.usage.value.loading")
                            : t("account.usage.value.unavailable")}
                      </strong>
                    </>
                  }
                >
                  <strong class="account-usage-provider-name">{row().name}</strong>
                  <AccountUsageWindowList windows={row().windows} now={now()} />
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={props.error}>{(message) => <p class="account-usage-popover-error">{message()}</p>}</Show>
    </>
  );
}

/** The most agents a window names; the rest share one "+n" chip. */
const SPLIT_AGENTS = 3;

/**
 * HoleA.I: who used a window. A thin bar under the meter splits its used part by agent, and the chips
 * name the largest, each with the points of the limit it used.
 */
function AccountUsageAgentSplit(props: { agents: readonly AccountUsageAgentShare[]; window: string }) {
  const text = useText();
  const { t, format } = text;
  const percent = (value: number) => format.percent(value / 100, { maximumFractionDigits: value < 10 ? 1 : 0 });
  const shown = () => props.agents.slice(0, SPLIT_AGENTS);
  const rest = () => props.agents.slice(SPLIT_AGENTS);
  const restPercent = () => rest().reduce((total, agent) => total + agent.limitPercent, 0);
  return (
    <span class="account-usage-agents">
      <span class="sr-only">{t("account.usage.agents.label", { window: props.window })}</span>
      <span class="account-usage-agents-bar" aria-hidden="true">
        <For each={props.agents}>
          {(agent) => (
            <span
              class="account-usage-agents-segment"
              style={{
                "inline-size": `${agent.limitPercent}%`,
                background: avatarHeadColor(agent.avatarSeed, agent.avatarHue),
              }}
            />
          )}
        </For>
      </span>
      <span class="account-usage-agents-list">
        <For each={shown()}>
          {(agent) => (
            <span
              class="account-usage-agent"
              title={t("account.usage.agents.title", {
                name: agent.name,
                limit: percent(agent.limitPercent),
                share: format.percent(agent.usageShare, { maximumFractionDigits: 0 }),
                window: props.window,
              })}
            >
              <AgentAvatar
                seed={agent.avatarSeed}
                hue={agent.avatarHue}
                url={agent.avatarUrl}
                motion="hover"
                class="account-usage-agent-avatar"
              />
              <span class="account-usage-agent-name">{agent.name}</span>
              <strong class="account-usage-agent-percent">{percent(agent.limitPercent)}</strong>
            </span>
          )}
        </For>
        <Show when={rest().length > 0}>
          <span class="account-usage-agent account-usage-agent-more">
            {t("account.usage.agents.more", { count: rest().length, percent: percent(restPercent()) })}
          </span>
        </Show>
      </span>
    </span>
  );
}

/** The limit windows of one account: a bar, the amount left and the time to the reset of each. */
export function AccountUsageWindowList(props: { windows: readonly AccountUsageWindowRow[]; now: number }) {
  const text = useText();
  const { t } = text;
  return (
    <span class="account-usage-windows">
      <For each={props.windows}>
        {(usageWindow) => (
          <span class="account-usage-window" data-usage-tone={usageWindow.tone}>
            <span class="account-usage-window-label">{usageWindow.label}</span>
            <span class="account-usage-window-bar" aria-hidden="true">
              <span class="account-usage-window-fill" style={{ "inline-size": `${usageWindow.remainingPercent}%` }} />
            </span>
            <strong class="account-usage-window-remaining">
              {text.format.percent(usageWindow.remainingPercent / 100)}
            </strong>
            <span
              class="account-usage-window-reset"
              title={
                usageWindow.resetsAtLabel ? t("account.usage.resetsAt", { time: usageWindow.resetsAtLabel }) : undefined
              }
            >
              {formatUsageResetIn(usageWindow.resetsAt, props.now, text)}
            </span>
            <Show when={usageWindow.agents.length > 0}>
              <AccountUsageAgentSplit agents={usageWindow.agents} window={usageWindow.label} />
            </Show>
          </span>
        )}
      </For>
    </span>
  );
}
