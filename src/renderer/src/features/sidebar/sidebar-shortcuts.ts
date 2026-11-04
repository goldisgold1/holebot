/**
 * HoleA.I (from Vincent's bot app): the sidebar's keys. Ctrl+N (⌘N) starts a new agent, Ctrl+B (⌘B)
 * folds the sidebar to its rail and back, Alt+↑/↓ opens the agent above or below the open one, and
 * Alt+1–9 opens one of the first nine. Holding Alt for half a second shows those numbers on the rows.
 *
 * The bot app uses Ctrl+1–9 and a held Ctrl; here Ctrl+1–9 already switches servers, so the numbers
 * are on Alt.
 */

const HOLD_MS = 500;
const ROW_SELECTOR = ".agent-list .sidebar-pinned-row[data-pinned-agent-id], .agent-list .agent-row[data-agent-id]";

interface SidebarShortcutOptions {
  mac: () => boolean;
  newAgent: () => void;
  toggleCompact: () => void;
  selectAgent: (agentId: string) => void;
}

interface NavigableRow {
  element: HTMLElement;
  agentId: string;
}

function editable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && !["button", "checkbox", "radio"].includes(target.type))
  );
}

/** The agent rows a person can see, pins first, in the order the sidebar draws them. */
export function navigableAgentRows(root: ParentNode = document): NavigableRow[] {
  const seen = new Set<string>();
  const rows: NavigableRow[] = [];
  for (const element of root.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
    const agentId = element.dataset.pinnedAgentId ?? element.dataset.agentId;
    if (!agentId || seen.has(agentId) || element.closest("[inert]") || element.getClientRects().length === 0) continue;
    seen.add(agentId);
    rows.push({ element, agentId });
  }
  return rows;
}

function clearBadges(): void {
  for (const element of document.querySelectorAll<HTMLElement>("[data-shortcut-badge]")) {
    element.removeAttribute("data-shortcut-badge");
  }
}

function showBadges(mac: boolean): void {
  navigableAgentRows()
    .slice(0, 9)
    .forEach((row, index) => {
      row.element.setAttribute("data-shortcut-badge", `${mac ? "⌥" : "Alt+"}${index + 1}`);
    });
}

export function installSidebarShortcuts(options: SidebarShortcutOptions): () => void {
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  const endHold = () => {
    clearTimeout(holdTimer);
    holdTimer = undefined;
    clearBadges();
  };
  const open = (row: NavigableRow | undefined) => {
    if (!row) return;
    options.selectAgent(row.agentId);
    row.element.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    const mac = options.mac();
    const mod = mac ? event.metaKey : event.ctrlKey;
    const otherMod = mac ? event.ctrlKey : event.metaKey;

    if (event.key === "Alt") {
      if (!event.repeat && !mod && !otherMod && !event.shiftKey && holdTimer === undefined) {
        holdTimer = setTimeout(() => showBadges(mac), HOLD_MS);
      }
      return;
    }
    // Any other key ends the hold, except the ones the numbers are for.
    if (!(event.altKey && /^Digit[1-9]$/u.test(event.code))) endHold();

    if (mod && !otherMod && !event.altKey && !event.shiftKey && !event.repeat) {
      if (event.code === "KeyN") {
        event.preventDefault();
        options.newAgent();
      } else if (event.code === "KeyB") {
        event.preventDefault();
        options.toggleCompact();
      }
      return;
    }

    if (!event.altKey || mod || otherMod || event.shiftKey) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (
        editable(event.target) ||
        (event.target instanceof Element && event.target.closest("[role=listbox], [role=menu]"))
      ) {
        return;
      }
      const rows = navigableAgentRows();
      if (rows.length === 0) return;
      event.preventDefault();
      const current = rows.findIndex((row) => row.element.getAttribute("aria-pressed") === "true");
      const step = event.key === "ArrowUp" ? -1 : 1;
      const next = current < 0 ? 0 : Math.min(rows.length - 1, Math.max(0, current + step));
      if (next !== current) open(rows[next]);
      return;
    }
    const digit = /^Digit([1-9])$/u.exec(event.code)?.[1];
    // On macOS Option+digit types a character, so a text field keeps it.
    if (digit && !(mac && editable(event.target))) {
      const row = navigableAgentRows()[Number(digit) - 1];
      if (!row) return;
      event.preventDefault();
      open(row);
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Alt") endHold();
  };
  const onVisibility = () => {
    if (document.hidden) endHold();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", endHold);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    endHold();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", endHold);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
