import {
  Button,
  CalendarClock,
  ChartArea,
  ConfirmDialog,
  DropdownMenu,
  Ellipsis,
  IconButton,
  ListChecks,
  LogOut,
  Settings,
  Store,
  UserPlus,
  Workflow,
} from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createSignal, Show } from "solid-js";
import { useAuth } from "../account/account-context";
import { useServerSettings } from "../servers/server-settings";
import { useServers } from "../servers/servers-context";
import { useSettings } from "../settings/settings-context";
import { useWindowPage } from "../window/window-page-context";

/**
 * HoleA.I: the foot of the sidebar, as in a messenger: who is using the app, a menu of the other pages
 * and Settings. It stands in for the page rail, which the clean look hides. The menu also invites people
 * to the active server and signs out, so neither hides deep in Settings.
 */
export function SidebarAccountRow() {
  const text = useText();
  const auth = useAuth();
  const windowPage = useWindowPage();
  const { openAppSettings, setSkillsMarketplaceOpen } = useSettings();
  const { activeServer } = useServers();
  const { openServerSettings } = useServerSettings();
  const [confirmingSignOut, setConfirmingSignOut] = createSignal(false);
  const name = () => {
    const account = auth.visibleSignedInAccount();
    return account?.name?.trim() || account?.email.split("@")[0] || "";
  };
  const email = () => auth.visibleSignedInAccount()?.email ?? "";
  // Only an owner or admin of a remote server can invite; the local server has no members.
  const inviteServerId = () => {
    const server = activeServer();
    return server?.kind === "remote" && (server.role === "owner" || server.role === "admin") ? server.id : null;
  };
  return (
    <div class="sidebar-account-row">
      <Button
        variant="ghost"
        type="button"
        class="sidebar-account-person no-drag"
        title={email() ? `${name()} · ${email()}` : name()}
        onClick={(event) => openAppSettings(event.currentTarget, "profile")}
      >
        <span class="sidebar-account-initial" aria-hidden="true">
          {name().slice(0, 1).toUpperCase()}
        </span>
        <span class="sidebar-account-name">{name()}</span>
      </Button>
      <DropdownMenu.Root placement="top-end" gutter={6}>
        <DropdownMenu.Trigger
          class="sidebar-icon-button sidebar-account-more no-drag"
          aria-label={text.t("app.rail.more")}
        >
          <Ellipsis aria-hidden="true" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelectAfterClose={() => windowPage.openWorkflows(null)}>
              <Workflow aria-hidden="true" />
              {text.t("app.rail.workflows")}
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelectAfterClose={() => windowPage.openTasks(null)}>
              <ListChecks aria-hidden="true" />
              {text.t("app.rail.tasks")}
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelectAfterClose={() => windowPage.openSchedule(null)}>
              <CalendarClock aria-hidden="true" />
              {text.t("app.rail.schedule")}
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelectAfterClose={() => windowPage.openUsage(null)}>
              <ChartArea aria-hidden="true" />
              {text.t("app.rail.usage")}
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelectAfterClose={() => setSkillsMarketplaceOpen(true)}>
              <Store aria-hidden="true" />
              {text.t("app.rail.marketplace")}
            </DropdownMenu.Item>
            <Show when={inviteServerId()}>
              {(serverId) => (
                <DropdownMenu.Item onSelectAfterClose={() => openServerSettings(serverId(), null, "members")}>
                  <UserPlus aria-hidden="true" />
                  {text.t("server.invite.title")}
                </DropdownMenu.Item>
              )}
            </Show>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onSelectAfterClose={() => setConfirmingSignOut(true)}>
              <LogOut aria-hidden="true" />
              {text.t("account.menu.signOut")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <IconButton
        variant="ghost"
        type="button"
        class="sidebar-icon-button no-drag"
        label={text.t("app.rail.settings")}
        onClick={(event) => windowPage.openSettings(event.currentTarget)}
      >
        <Settings aria-hidden="true" />
      </IconButton>
      <ConfirmDialog
        open={confirmingSignOut()}
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={async () => {
          // As in Settings › Profile: the sign-out returns the window to the sign-in screen.
          await auth.logoutCentralAccount();
          setConfirmingSignOut(false);
        }}
        tone="default"
        icon={<LogOut />}
        title={text.t("settings.profile.signOutConfirm.title")}
        description={text.t("settings.profile.signOutConfirm.description")}
        confirmLabel={text.t("account.menu.signOut")}
        pendingLabel={text.t("account.menu.signingOut")}
        initialFocus="cancel"
      />
    </div>
  );
}
