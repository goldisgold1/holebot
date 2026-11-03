import type { TrayRosterAgent } from "@openbot/contracts/ipc";

/**
 * HoleA.I (Vincent, Nov 3 2026): the agents the main window last sent for the tray. While a window
 * sends them, the tray shows those (the server it shows, such as the hole.fm VPS) in place of the
 * agents of this computer.
 */
let roster: TrayRosterAgent[] | null = null;
const listeners = new Set<() => void>();

export function setTrayRoster(next: TrayRosterAgent[] | null): void {
  roster = next;
  for (const listener of listeners) listener();
}

export function trayRoster(): TrayRosterAgent[] | null {
  return roster;
}

export function onTrayRoster(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
