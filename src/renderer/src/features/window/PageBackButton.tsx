import { Button, ChevronLeft } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { onSettled, Show } from "solid-js";
import { useWindowPage } from "./window-page-context";

/**
 * HoleA.I: the clean look hides the page rail, which was the way back from Settings, Tasks, Usage and the
 * other pages. While one of them covers the chats, this button at the top left - and Escape - bring the
 * agents back.
 */
export function PageBackButton() {
  const text = useText();
  const windowPage = useWindowPage();
  const covered = () => windowPage.page() !== "agents";

  onSettled(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || !covered()) return;
      // Escape belongs to an open dialog, menu or popover first.
      if (document.querySelector("[aria-modal='true'], [data-expanded]")) return;
      windowPage.showAgents();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Show when={covered()}>
      <Button
        type="button"
        variant="ghost"
        class="page-back-button no-drag"
        title={text.t("app.rail.agents")}
        onClick={() => windowPage.showAgents()}
      >
        <ChevronLeft aria-hidden="true" />
        <span>{text.t("app.rail.agents")}</span>
      </Button>
    </Show>
  );
}
