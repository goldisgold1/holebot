import { ProviderLogo } from "@openbot/brand";
import { avatarHeadColor } from "@openbot/ui/bloub-avatar";
import { formatUsageResetIn } from "@openbot/ui/features/account/account-usage-view";
import { AgentAvatar } from "@openbot/ui/features/agents/AgentAvatar";
import { useText } from "@openbot/ui/text";
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { usePlanLimitRows } from "./plan-limit-rows";

/** The reset countdown shows minutes, so a half-minute tick keeps it current. */
const RESET_CLOCK_MS = 30_000;

/**
 * HoleA.I: the plan limits of this computer's providers, each window split by the agents that used it.
 * Each agent shows the points of the limit it used and its part of what the window spent. Nothing
 * shows until a window has a split, so a server with no plan readings keeps the page as it was.
 */
export function UsageLimitsByAgent() {
  const text = useText();
  const { t, format } = text;
  const rows = usePlanLimitRows();
  const [now, setNow] = createSignal(Date.now());
  const clock = window.setInterval(() => setNow(Date.now()), RESET_CLOCK_MS);
  onCleanup(() => window.clearInterval(clock));
  const providers = createMemo(() =>
    rows()
      .map((row) => ({ row, windows: row.windows.filter((window) => window.agents.length > 0) }))
      .filter((entry) => entry.windows.length > 0),
  );
  const percent = (value: number) => format.percent(value / 100, { maximumFractionDigits: value < 10 ? 1 : 0 });
  return (
    <Show when={providers().length > 0}>
      <section class="usage-limits" aria-label={t("usage.limits.title")}>
        <div class="agent-usage-section-header">
          <h3>{t("usage.limits.title")}</h3>
        </div>
        <div class="usage-limits-grid">
          <For each={providers()}>
            {(entry) => (
              <For each={entry.windows}>
                {(limit) => (
                  <article class="usage-limit-card" data-usage-tone={limit.tone}>
                    <header class="usage-limit-head">
                      <ProviderLogo provider={entry.row.provider} class="usage-limit-logo" />
                      <span class="usage-limit-name">
                        <strong>{entry.row.name}</strong>
                        <span>{limit.label}</span>
                      </span>
                      <span class="usage-limit-used">
                        <strong>{percent(100 - limit.remainingPercent)}</strong>
                        <span>
                          {t("usage.limits.used")}
                          <Show when={formatUsageResetIn(limit.resetsAt, now(), text)}>
                            {(reset) => <> · {t("usage.limits.resetsIn", { time: reset() })}</>}
                          </Show>
                        </span>
                      </span>
                    </header>
                    <span class="usage-limit-bar" aria-hidden="true">
                      <For each={limit.agents}>
                        {(agent) => (
                          <span
                            class="usage-limit-segment"
                            style={{
                              "inline-size": `${agent.limitPercent}%`,
                              background: avatarHeadColor(agent.avatarSeed, agent.avatarHue),
                            }}
                          />
                        )}
                      </For>
                    </span>
                    <ol class="usage-limit-agents">
                      <For each={limit.agents}>
                        {(agent) => (
                          <li class="usage-limit-agent">
                            <AgentAvatar
                              seed={agent.avatarSeed}
                              hue={agent.avatarHue}
                              url={agent.avatarUrl}
                              motion="hover"
                              class="usage-limit-avatar"
                            />
                            <span class="usage-limit-agent-name">{agent.name}</span>
                            <span class="usage-limit-agent-share">
                              {t("usage.limits.ofUsage", {
                                share: format.percent(agent.usageShare, { maximumFractionDigits: 0 }),
                              })}
                            </span>
                            <strong class="usage-limit-agent-percent">{percent(agent.limitPercent)}</strong>
                          </li>
                        )}
                      </For>
                    </ol>
                  </article>
                )}
              </For>
            )}
          </For>
        </div>
      </section>
    </Show>
  );
}
