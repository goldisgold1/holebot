import { Button, Check, Monitor, Plus, Server, SettingsSection, Text } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { For, Show } from "solid-js";
import { useServerActions } from "../servers/server-actions";

/**
 * HoleA.I: every server this app knows, with a switch, its own settings (members, transfer, updates)
 * and Add server. The sidebar hides its server menu while there is one server, so this is the way in.
 */
export function SettingsServersTab() {
  const { t } = useText();
  const { orderedServers, select, add, callbacks } = useServerActions();
  return (
    <SettingsSection
      title={t("settings.servers.title")}
      description={t("settings.servers.description")}
      actions={
        <Button type="button" size="sm" data-settings-row="settings.servers.add" onClick={() => add()}>
          <Plus aria-hidden="true" />
          {t("settings.servers.add")}
        </Button>
      }
    >
      <ul class="settings-servers" data-settings-row="settings.servers.title">
        <For each={orderedServers()}>
          {(server) => (
            <li class="settings-server" data-active={server.active ? "" : undefined}>
              <span class="settings-server-icon" aria-hidden="true">
                {server.kind === "local" ? <Monitor /> : <Server />}
              </span>
              <span class="settings-server-copy">
                <Text as="span" variant="body" class="settings-server-name">
                  {server.name}
                </Text>
                <Text as="span" variant="caption" tone="muted">
                  {server.kind === "local" ? t("settings.servers.local") : t("settings.servers.remote")}
                </Text>
              </span>
              <Show
                when={!server.active}
                fallback={
                  <span class="settings-server-current">
                    <Check aria-hidden="true" />
                    {t("settings.servers.active")}
                  </span>
                }
              >
                <Button type="button" size="sm" variant="outline" onClick={() => select(server.id)}>
                  {t("settings.servers.switch")}
                </Button>
              </Show>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(event) => callbacks.onOpenSettings(server.id, event.currentTarget)}
              >
                {t("settings.servers.settings")}
              </Button>
            </li>
          )}
        </For>
      </ul>
    </SettingsSection>
  );
}
