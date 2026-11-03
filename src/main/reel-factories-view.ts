import { REELS_FACTORY_BOARD_URL, type ReelFactoriesViewBounds } from "@openbot/contracts/ipc";
import { type BrowserWindow, shell, WebContentsView } from "electron";

/**
 * HoleA.I: the hole.fm Reels Factory board, shown inside the main window over the Reel Factories page.
 *
 * The board only lets hole.fm's own sites frame it (`frame-ancestors`), so the page cannot use an
 * iframe. A native view is a page of its own, not a frame, and it keeps its own sign-in in a persistent
 * session. It stays loaded while hidden, so the board opens again at once and keeps its place.
 */
export function createReelFactoriesView(getWindow: () => BrowserWindow | null) {
  let view: WebContentsView | null = null;
  let host: BrowserWindow | null = null;

  const ensure = (window: BrowserWindow): WebContentsView => {
    if (view && host === window && !view.webContents.isDestroyed()) return view;
    const next = new WebContentsView({
      webPreferences: {
        partition: "persist:reel-factories",
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    // A link the board opens in a new tab goes to the user's browser, not a second window.
    next.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("https://")) void shell.openExternal(url);
      return { action: "deny" };
    });
    next.webContents.on("will-navigate", (event, url) => {
      if (!url.startsWith("https://")) event.preventDefault();
    });
    window.contentView.addChildView(next);
    window.once("closed", () => {
      if (view === next) {
        view = null;
        host = null;
      }
    });
    void next.webContents.loadURL(REELS_FACTORY_BOARD_URL);
    view = next;
    host = window;
    return next;
  };

  return {
    /** Shows the board over `bounds`, given in the page's CSS pixels; null hides it. */
    set(bounds: ReelFactoriesViewBounds | null): void {
      const window = getWindow();
      if (!window || window.isDestroyed()) return;
      if (!bounds) {
        view?.setVisible(false);
        return;
      }
      const shown = ensure(window);
      // The interface size zooms the window's page, so its CSS pixels are not the window's pixels.
      const zoom = window.webContents.getZoomFactor();
      shown.setBounds({
        x: Math.round(bounds.x * zoom),
        y: Math.round(bounds.y * zoom),
        width: Math.max(0, Math.round(bounds.width * zoom)),
        height: Math.max(0, Math.round(bounds.height * zoom)),
      });
      shown.setVisible(true);
    },
    reload(): void {
      if (view && !view.webContents.isDestroyed()) view.webContents.reload();
    },
  };
}
