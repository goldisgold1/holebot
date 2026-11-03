import { AppWindow, Button, EyeOff, Pin, X } from "@openbot/ui";
import { onSettled, Show } from "solid-js";
import { useText } from "../../text";
import { useSidebarScope } from "./sidebar-scope";
import { clearAgentSelection, selectedAgentIds } from "./sidebar-selection";

/** The actions for the rows picked with Ctrl or Shift, at the foot of the sidebar. */
export function SidebarSelectionBar() {
  const { props } = useSidebarScope();
  const { t } = useText();
  onSettled(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedAgentIds().length > 0) clearAgentSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const each = (run: (agentId: string) => void) => {
    for (const agentId of selectedAgentIds()) run(agentId);
    clearAgentSelection();
  };
  return (
    <Show when={selectedAgentIds().length > 0}>
      <div class="sidebar-selection-bar" role="toolbar" aria-label={t("sidebar.selection.label")}>
        <span class="sidebar-selection-count">
          {t("sidebar.selection.count", { count: selectedAgentIds().length })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          title={t("sidebar.selection.pin")}
          aria-label={t("sidebar.selection.pin")}
          onClick={() => each((id) => props.onPin({ kind: "agent", id }))}
        >
          <Pin aria-hidden="true" />
        </Button>
        <Show when={props.onOpenAgentWindow}>
          <Button
            variant="ghost"
            size="icon-sm"
            title={t("sidebar.selection.openWindows")}
            aria-label={t("sidebar.selection.openWindows")}
            onClick={() => each((id) => props.onOpenAgentWindow?.(id))}
          >
            <AppWindow aria-hidden="true" />
          </Button>
        </Show>
        <Show when={props.onHideAgent}>
          <Button
            variant="ghost"
            size="icon-sm"
            title={t("sidebar.selection.hide")}
            aria-label={t("sidebar.selection.hide")}
            onClick={() => each((id) => props.onHideAgent?.(id))}
          >
            <EyeOff aria-hidden="true" />
          </Button>
        </Show>
        <Button
          variant="ghost"
          size="icon-sm"
          title={t("sidebar.selection.clear")}
          aria-label={t("sidebar.selection.clear")}
          onClick={clearAgentSelection}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </Show>
  );
}
