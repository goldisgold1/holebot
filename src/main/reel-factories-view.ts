import {
  REELS_FACTORY_BOARD_URL,
  REELS_FACTORY_LIVE_URL,
  REELS_FACTORY_SIGN_IN_URL,
  type ReelFactoriesViewBounds,
  type ReelFactoryJob,
  type ReelFactoryLive,
} from "@openbot/contracts/ipc";
import { type DynamicRecord, isDynamicRecord } from "@openbot/contracts/runtime-values";
import { type BrowserWindow, session, shell, WebContentsView } from "electron";

const BOARD_PARTITION = "persist:reel-factories";
const FINISHED_JOB_STATES = new Set(["completed", "failed", "cancelled", "canceled", "archived", "done"]);
const FINISHED_STAGE_STATES = new Set(["done", "accepted", "skipped"]);

const EMPTY: DynamicRecord = {};
const record = (value: unknown): DynamicRecord => (isDynamicRecord(value) ? value : EMPTY);

/** `C2-PROD-20261027-EC13·C2-PROD-20261027-EC13-RV1` reads `EC13 · RV1`. */
function reelLabel(ecId: string): string {
  const ec = /EC-DRAFT-[0-9A-F]{4}|EC\d+/i.exec(ecId)?.[0] ?? ecId.slice(0, 16);
  const rv = /RV\d+/i.exec(ecId)?.[0];
  return rv ? `${ec} · ${rv}` : ec;
}

/** The board's live feed, cut to the jobs still in production and the stages each Reel reached. */
function readLiveFeed(value: unknown): ReelFactoryLive {
  const feed = record(value);
  const stages = Array.isArray(feed.stages) ? feed.stages.filter((stage) => typeof stage === "string") : [];
  const jobs: ReelFactoryJob[] = [];
  for (const raw of Array.isArray(feed.agents) ? feed.agents : []) {
    const job = record(raw);
    const state = typeof job.state === "string" ? job.state : "";
    if (typeof job.job_id !== "string" || FINISHED_JOB_STATES.has(state)) continue;
    const reels = (Array.isArray(job.reels) ? job.reels : []).slice(0, 20).map((rawReel) => {
      const reel = record(rawReel);
      const progress = record(reel.stages);
      const done = stages.filter(
        (stage) =>
          (Array.isArray(reel.done) && reel.done.includes(stage)) ||
          FINISHED_STAGE_STATES.has(String(record(progress[stage]).status ?? "")),
      );
      const running = stages.find((stage) => !done.includes(stage) && stage in progress);
      return {
        label: reelLabel(typeof reel.ec_id === "string" ? reel.ec_id : ""),
        done,
        current: running ?? stages.find((stage) => !done.includes(stage)) ?? null,
      };
    });
    jobs.push({ jobId: job.job_id.slice(0, 120), state: state.slice(0, 40), reels });
  }
  return { stages: stages.slice(0, 64), jobs: jobs.slice(0, 100) };
}

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
  let signingIn = false;

  const ensure = (window: BrowserWindow): WebContentsView => {
    if (view && host === window && !view.webContents.isDestroyed()) return view;
    const next = new WebContentsView({
      webPreferences: {
        partition: BOARD_PARTITION,
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
    // After Sign in, the dashboard opens its own home page. Once the sign-in form is gone, the view goes
    // back to the board, so nobody has to press Reload.
    const returnAfterSignIn = () => {
      if (!signingIn || next.webContents.isDestroyed()) return;
      void next.webContents
        .executeJavaScript('document.querySelector("input[type=password]") === null')
        .then((signedIn) => {
          if (!signedIn || !signingIn || next.webContents.isDestroyed()) return;
          signingIn = false;
          void next.webContents.loadURL(REELS_FACTORY_BOARD_URL);
        })
        .catch(() => undefined);
    };
    next.webContents.on("did-finish-load", returnAfterSignIn);
    next.webContents.on("did-navigate-in-page", returnAfterSignIn);
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
    /** Reloads the board, or goes back to it from the sign-in or any other dashboard page. */
    reload(): void {
      if (!view || view.webContents.isDestroyed()) return;
      signingIn = false;
      if (view.webContents.getURL().startsWith(REELS_FACTORY_BOARD_URL)) view.webContents.reload();
      else void view.webContents.loadURL(REELS_FACTORY_BOARD_URL);
    },
    /**
     * The board's live jobs, read in the board's own signed-in session so no other login is needed.
     * Null while that session is not signed in or the board does not answer.
     */
    async live(): Promise<ReelFactoryLive | null> {
      try {
        const response = await session.fromPartition(BOARD_PARTITION).fetch(REELS_FACTORY_LIVE_URL, {
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok || !(response.headers.get("content-type") ?? "").includes("json")) return null;
        return readLiveFeed(await response.json());
      } catch {
        return null;
      }
    },
    /** Opens the dashboard sign-in in the board's own session; Reload goes back to the board after. */
    signIn(): void {
      if (!view || view.webContents.isDestroyed()) return;
      signingIn = true;
      void view.webContents.loadURL(REELS_FACTORY_SIGN_IN_URL);
    },
  };
}
