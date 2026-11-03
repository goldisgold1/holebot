import { REELS_FACTORY_BOARD_URL } from "@openbot/contracts/ipc";
import { Button, ExternalLink, Factory, RefreshCw } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { onCleanup, onSettled } from "solid-js";
import { appPort } from "../../app-port";

/**
 * HoleA.I: the hole.fm Reels Factory board inside the window. Main draws the board as a native view
 * over the body of this page (see `reel-factories-view.ts`), so the page only reports where that is.
 */
export function ReelFactoriesPage() {
  const { t } = useText();
  let body: HTMLDivElement | undefined;
  let frame = 0;

  const place = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!body?.isConnected) return;
      const rect = body.getBoundingClientRect();
      void appPort().setReelFactoriesView({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    });
  };

  onSettled(() => {
    if (!body) return;
    const observer = new ResizeObserver(place);
    observer.observe(body);
    window.addEventListener("resize", place);
    place();
    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      cancelAnimationFrame(frame);
      void appPort().setReelFactoriesView(null);
    });
  });

  return (
    <section class="reel-factories-page" aria-label={t("sidebar.reelFactories.title")}>
      <header class="reel-factories-toolbar">
        <span class="reel-factories-mark" aria-hidden="true">
          <Factory class="size-4" />
        </span>
        <h1 class="reel-factories-heading">{t("sidebar.reelFactories.title")}</h1>
        <span class="reel-factories-spacer" />
        <Button variant="ghost" size="sm" onClick={() => void appPort().reloadReelFactoriesView()}>
          <RefreshCw class="size-4" aria-hidden="true" />
          {t("sidebar.reelFactories.reload")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void appPort().openUrl(REELS_FACTORY_BOARD_URL)}>
          <ExternalLink class="size-4" aria-hidden="true" />
          {t("sidebar.reelFactories.openBrowser")}
        </Button>
      </header>
      <div
        ref={(element) => {
          body = element;
        }}
        class="reel-factories-body"
      >
        <p class="reel-factories-loading">{t("sidebar.reelFactories.loading")}</p>
      </div>
    </section>
  );
}
