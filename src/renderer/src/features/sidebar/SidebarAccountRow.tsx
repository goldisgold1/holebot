import {
  Button,
  CalendarClock,
  ChartArea,
  DropdownMenu,
  Ellipsis,
  IconButton,
  ListChecks,
  Settings,
  Store,
  Workflow,
} from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { useAuth } from "../account/account-context";
import { useSettings } from "../settings/settings-context";
import { useWindowPage } from "../window/window-page-context";

/**
 * HoleA.I: the foot of the sidebar, as in a messenger: who is using the app, a menu of the other pages
 * and Settings. It stands in for the page rail, which the clean look hides.
 */
export function SidebarAccountRow() {
  const text = useText();
  const auth = useAuth();
  const windowPage = useWindowPage();
  const { openAppSettings, setSkillsMarketplaceOpen } = useSettings();
  const name = () => {
    const account = auth.visibleSignedInAccount();
    return account?.name?.trim() || account?.email.split("@")[0] || "";
  };
  return (
    <div class="sidebar-account-row">
      <Button
        variant="ghost"
        type="button"
        class="sidebar-account-person no-drag"
        title={name()}
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
    </div>
  );
}
