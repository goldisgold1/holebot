import {
  type AgentRuntimeSnapshot,
  type ConversationReadState,
  IPC_ENDPOINTS,
  LOCAL_SERVER_ID,
} from "@openbot/contracts/ipc";
import type { AppTranslate } from "@openbot/i18n";
import {
  app,
  type BrowserWindow,
  globalShortcut,
  Menu,
  type MenuItemConstructorOptions,
  type NativeImage,
  Tray,
} from "electron";
import { showMainWindow } from "./main-window";
import { sendToRenderer } from "./renderer-ipc";
import { playFace } from "./tray/face-animation";
import { sentRosterTrayState, type TrayAgent, type TrayState, trayState } from "./tray/tray-agents";
import { createTrayImages, overlayBadge, type TrayFace, trayAssetsDirectory, withBadge } from "./tray/tray-images";
import { onTrayRoster, trayRoster } from "./tray/tray-roster";

export interface BackgroundTray {
  /** Shows the icon when OpenBot keeps running after its window closes, and removes it otherwise. */
  sync: (keepRunningInBackground: boolean) => void;
  /** Builds the menu again: a native label cannot be changed in place. */
  relabel: () => void;
  /** Shows the app icon in the logo color that the user chose. */
  setIcon: (icon: NativeImage) => void;
  destroy: () => void;
}

/** What the tray reads about the local agents. All of it is state the main process already holds. */
export interface BackgroundTrayAgents {
  snapshot: () => AgentRuntimeSnapshot;
  reads: () => Record<string, ConversationReadState>;
  /** Calls `listener` on every agent event; returns the way to stop. */
  subscribe: (listener: () => void) => () => void;
}

/** Agent events come in bursts, such as a streamed reply. One refresh covers each burst. */
const REFRESH_DELAY_MS = 1_000;
const UNREAD_MARK = "●";

/**
 * The tray icon of Windows and Linux. When the main window is hidden in the background, it is the
 * way back to the window, and the way to quit.
 *
 * HoleA.I (Vincent, Nov 3 2026): ported from the bot app's menubar tray. While an agent works, the
 * icon is that agent's face in its colour, blinking and glancing; otherwise it is the app icon. The
 * unread count is drawn into the icon (Windows has no tray title) and on the taskbar button. The menu
 * lists the 5 most recent agents, which Ctrl+Shift+1…5 also open.
 *
 * Linux desktops show the menu on a click and do not report the click, so the menu also opens the
 * window. A desktop with no tray, such as GNOME without an extension, shows nothing: a second
 * launch of OpenBot then shows the window.
 */
export function createBackgroundTray(options: {
  icon: NativeImage;
  translate: AppTranslate;
  open: () => void;
  quit: () => void;
  agents?: BackgroundTrayAgents;
  /** The main window, created when there is none. */
  mainWindow?: () => Promise<BrowserWindow>;
  /** The main window if there is one now, for the taskbar overlay. */
  currentWindow?: () => BrowserWindow | null;
}): BackgroundTray {
  let tray: Tray | null = null;
  let icon = options.icon;
  const images = createTrayImages(trayAssetsDirectory(app.isPackaged));
  const busySince = new Map<string, number>();
  let state: TrayState = { agents: [], face: null, unreadCount: 0 };
  let menuKey: string | null = null;
  let shortcutsKey: string | null = null;
  const shortcuts = new Set<number>();
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  // ---- The face ----
  let faceKey: string | null = null;
  let face: TrayFace | null = null;
  let frame = 0;
  let animation: { stop(): void } | null = null;
  const badgedFrames = new Map<number, NativeImage>();
  let badgedCount = 0;

  function currentImage(): NativeImage {
    if (badgedCount !== state.unreadCount) {
      badgedFrames.clear();
      badgedCount = state.unreadCount;
    }
    const base = face === null ? trayIcon(icon) : face.kind === "still" ? face.image : face.frames[frame];
    if (!base) return trayIcon(icon);
    const key = face?.kind === "animated" ? frame : -1;
    const cached = badgedFrames.get(key);
    if (cached) return cached;
    const image = withBadge(base, state.unreadCount);
    badgedFrames.set(key, image);
    return image;
  }

  function show(): void {
    tray?.setImage(currentImage());
  }

  function paintFace(): void {
    const next = state.face;
    const key =
      next === null
        ? null
        : `${next.agentId}/${next.avatar.shape}/${next.avatar.color}/${next.avatar.photo?.length ?? 0}`;
    if (key === faceKey) return;
    faceKey = key;
    animation?.stop();
    animation = null;
    badgedFrames.clear();
    face = next === null ? null : images.face(next.avatar);
    frame = 0;
    if (face?.kind === "animated" && tray) {
      animation = playFace({
        show: (index) => {
          frame = index;
          show();
        },
      });
      return;
    }
    show();
  }

  // ---- Opening an agent ----
  function openAgent(agentId: string): void {
    const ensure = options.mainWindow;
    if (!ensure) {
      options.open();
      return;
    }
    void ensure()
      .then((window) => {
        showMainWindow(window);
        const send = () =>
          sendToRenderer(window, IPC_ENDPOINTS.notifications.opened, {
            serverId: LOCAL_SERVER_ID,
            agentId,
            threadId: null,
          });
        if (window.webContents.isLoading()) window.webContents.once("did-finish-load", send);
        else send();
      })
      .catch(() => options.open());
  }

  function openSettings(): void {
    const ensure = options.mainWindow;
    if (!ensure) {
      options.open();
      return;
    }
    void ensure()
      .then((window) => {
        showMainWindow(window);
        const send = () => sendToRenderer(window, IPC_ENDPOINTS.app.openSettings);
        if (window.webContents.isLoading()) window.webContents.once("did-finish-load", send);
        else send();
      })
      .catch(() => options.open());
  }

  // ---- Ctrl+Shift+1…5 ----
  function unregisterShortcuts(): void {
    for (const slot of shortcuts) globalShortcut.unregister(accelerator(slot));
    shortcuts.clear();
    shortcutsKey = null;
  }

  function registerShortcuts(): void {
    const key = tray ? state.agents.map((agent) => agent.agentId).join("\n") : null;
    if (key === shortcutsKey) return;
    unregisterShortcuts();
    shortcutsKey = key;
    if (!tray) return;
    for (const agent of state.agents) {
      const combo = accelerator(agent.shortcutSlot);
      // A combination that another part of the app or another app holds stays theirs.
      if (globalShortcut.isRegistered(combo)) continue;
      const agentId = agent.agentId;
      if (globalShortcut.register(combo, () => openAgent(agentId))) shortcuts.add(agent.shortcutSlot);
    }
  }

  // ---- The menu ----
  function agentItem(agent: TrayAgent): MenuItemConstructorOptions {
    const glyph = agent.busy ? images.working(agent.avatar.color) : images.menuAvatar(agent.avatar);
    return {
      label: agent.unread ? `${UNREAD_MARK} ${agent.title}` : agent.title,
      ...(glyph ? { icon: glyph } : {}),
      ...(shortcuts.has(agent.shortcutSlot)
        ? { accelerator: accelerator(agent.shortcutSlot), registerAccelerator: false }
        : {}),
      click: () => openAgent(agent.agentId),
    };
  }

  function relabel(): void {
    if (!tray) return;
    const tooltip = options.translate("menu.trayTooltip");
    tray.setToolTip(state.unreadCount > 0 ? `${tooltip} (${state.unreadCount})` : tooltip);
    const template: MenuItemConstructorOptions[] = [];
    if (state.agents.length > 0) {
      for (const agent of state.agents) template.push(agentItem(agent));
      template.push({ type: "separator" });
    }
    template.push(
      { label: options.translate("menu.trayOpen"), click: options.open },
      { label: options.translate("menu.preferences"), click: openSettings },
      { type: "separator" },
      { label: options.translate("menu.trayQuit"), click: options.quit },
    );
    tray.setContextMenu(Menu.buildFromTemplate(template));
    menuKey = menuKeyOf();
  }

  function menuKeyOf(): string {
    return JSON.stringify([
      state.unreadCount,
      [...shortcuts],
      state.agents.map((agent) => [
        agent.agentId,
        agent.title,
        agent.unread,
        agent.busy,
        agent.avatar.shape,
        agent.avatar.color,
        agent.avatar.photo?.length ?? 0,
      ]),
    ]);
  }

  // ---- The unread count outside the tray ----
  let overlayCount = -1;
  function paintUnread(): void {
    if (overlayCount === state.unreadCount) return;
    if (process.platform === "win32") {
      const window = options.currentWindow?.();
      if (!window || window.isDestroyed()) return;
      window.setOverlayIcon(overlayBadge(state.unreadCount), state.unreadCount > 0 ? String(state.unreadCount) : "");
    } else {
      app.setBadgeCount(state.unreadCount);
    }
    overlayCount = state.unreadCount;
  }

  function refresh(): void {
    const sent = trayRoster();
    if (disposed || (!options.agents && !sent)) return;
    try {
      state = sent
        ? sentRosterTrayState(sent, busySince, Date.now())
        : options.agents
          ? trayState(options.agents.snapshot(), options.agents.reads(), busySince, Date.now())
          : state;
    } catch {
      return;
    }
    paintUnread();
    if (!tray) return;
    registerShortcuts();
    if (menuKeyOf() !== menuKey) relabel();
    paintFace();
    show();
  }

  function scheduleRefresh(): void {
    if (refreshTimer !== null || disposed) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      refresh();
    }, REFRESH_DELAY_MS);
  }

  const unsubscribe = options.agents?.subscribe(scheduleRefresh);
  const unsubscribeRoster = onTrayRoster(scheduleRefresh);
  // A new main window has no overlay yet; the next refresh paints it.
  const onWindowCreated = () => {
    overlayCount = -1;
    scheduleRefresh();
  };
  app.on("browser-window-created", onWindowCreated);
  refresh();

  function destroyTray(): void {
    animation?.stop();
    animation = null;
    faceKey = null;
    face = null;
    menuKey = null;
    unregisterShortcuts();
    tray?.destroy();
    tray = null;
  }

  return {
    sync: (keepRunningInBackground) => {
      if (!keepRunningInBackground) {
        destroyTray();
        return;
      }
      if (tray) return;
      tray = new Tray(trayIcon(icon));
      tray.on("click", options.open);
      registerShortcuts();
      relabel();
      paintFace();
      show();
    },
    relabel,
    setIcon: (next) => {
      icon = next;
      badgedFrames.clear();
      show();
    },
    destroy: () => {
      disposed = true;
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      refreshTimer = null;
      unsubscribe?.();
      unsubscribeRoster();
      app.off("browser-window-created", onWindowCreated);
      destroyTray();
    },
  };
}

function accelerator(slot: number): string {
  return `CommandOrControl+Shift+${String(slot)}`;
}

/** The app icon at the tray size, with a sharper copy for a scaled display. */
function trayIcon(source: NativeImage): NativeImage {
  const size = process.platform === "win32" ? 16 : 32;
  const icon = source.resize({ width: size, height: size, quality: "best" });
  icon.addRepresentation({
    scaleFactor: 2,
    buffer: source.resize({ width: size * 2, height: size * 2, quality: "best" }).toPNG(),
  });
  return icon;
}
