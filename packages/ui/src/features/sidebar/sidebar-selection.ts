import { createSignal } from "solid-js";

/**
 * HoleA.I (Vincent, Nov 3 2026): the bot app's sidebar multi-select. Ctrl+click (Cmd+click on macOS)
 * adds or removes a row, Shift+click adds the rows between the last pick and this one, Escape clears.
 */
const [selected, setSelected] = createSignal<readonly string[]>([]);
let anchor: string | undefined;

export const selectedAgentIds = selected;

export function clearAgentSelection() {
  anchor = undefined;
  setSelected([]);
}

/** Handles a click with a selection modifier. Returns false for a plain click, which opens the chat. */
export function selectAgentRow(event: MouseEvent, agentId: string, orderedIds: () => readonly string[]): boolean {
  const toggle = event.ctrlKey || event.metaKey;
  if (event.shiftKey && anchor !== undefined) {
    const order = orderedIds();
    const from = order.indexOf(anchor);
    const to = order.indexOf(agentId);
    if (from >= 0 && to >= 0) {
      const range = order.slice(Math.min(from, to), Math.max(from, to) + 1);
      setSelected((current) => [...new Set([...current, ...range])]);
      return true;
    }
  }
  if (!toggle && !event.shiftKey) {
    if (selected().length > 0) clearAgentSelection();
    return false;
  }
  anchor = agentId;
  setSelected((current) =>
    current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId],
  );
  return true;
}
