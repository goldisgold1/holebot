import type { AppTextKey } from "@openbot/i18n";
import { Dialog, Kbd } from "@openbot/ui";
import { For } from "solid-js";
import { useText } from "../../text";

/**
 * HoleA.I (Vincent, Nov 3 2026): the bot app's keyboard shortcuts sheet. Ctrl+/ (Cmd+/ on macOS) opens
 * one list of every shortcut the app has, grouped by where it works.
 */
interface Shortcut {
  label: AppTextKey;
  /** The keys, with "Mod" for Ctrl or Cmd. */
  keys: readonly string[];
}

const SHORTCUT_GROUPS: readonly { title: AppTextKey; shortcuts: readonly Shortcut[] }[] = [
  {
    title: "settings.shortcuts.group.general",
    shortcuts: [
      { label: "settings.shortcuts.search", keys: ["Mod", "K"] },
      { label: "settings.shortcuts.newAgent", keys: ["Mod", "N"] },
      { label: "settings.shortcuts.settings", keys: ["Mod", ","] },
      { label: "settings.shortcuts.stopAll", keys: ["Mod", "."] },
      { label: "settings.shortcuts.switchServer", keys: ["Mod", "1–9"] },
      { label: "settings.shortcuts.recentAgent", keys: ["Ctrl", "Shift", "1–5"] },
      { label: "settings.shortcuts.sheet", keys: ["Mod", "/"] },
      { label: "settings.shortcuts.switchAgent", keys: ["Alt", "↑/↓"] },
      { label: "settings.shortcuts.goToAgent", keys: ["Alt", "1–9"] },
    ],
  },
  {
    title: "settings.shortcuts.group.chat",
    shortcuts: [
      { label: "settings.shortcuts.findInChat", keys: ["Mod", "F"] },
      { label: "settings.shortcuts.nextMatch", keys: ["Mod", "G"] },
      { label: "settings.shortcuts.pastePlain", keys: ["Mod", "Shift", "V"] },
      { label: "settings.shortcuts.moveAttachment", keys: ["Alt", "←/→"] },
    ],
  },
  {
    title: "settings.shortcuts.group.view",
    shortcuts: [
      { label: "settings.shortcuts.compactSidebar", keys: ["Mod", "B"] },
      { label: "settings.shortcuts.details", keys: ["Mod", "Alt", "B"] },
      { label: "settings.shortcuts.zoomIn", keys: ["Mod", "="] },
      { label: "settings.shortcuts.zoomOut", keys: ["Mod", "-"] },
      { label: "settings.shortcuts.actualSize", keys: ["Mod", "0"] },
    ],
  },
];

export function isKeyboardShortcutsSheetShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
): boolean {
  return event.key === "/" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
}

export function KeyboardShortcutsSheet(props: { open: boolean; mac: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useText();
  const keyName = (key: string) => {
    if (key === "Mod") return props.mac ? "⌘" : "Ctrl";
    return key === "Alt" && props.mac ? "⌥" : key;
  };
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content class="keyboard-shortcuts-sheet">
            <Dialog.Title as="h2" class="keyboard-shortcuts-title">
              {t("settings.shortcuts.title")}
            </Dialog.Title>
            <For each={SHORTCUT_GROUPS}>
              {(group) => (
                <div class="keyboard-shortcuts-group">
                  <h3 class="keyboard-shortcuts-group-title">{t(group.title)}</h3>
                  <ul class="keyboard-shortcuts-list">
                    <For each={group.shortcuts}>
                      {(shortcut) => (
                        <li class="keyboard-shortcuts-row">
                          <span>{t(shortcut.label)}</span>
                          <span class="keyboard-shortcuts-keys">
                            <For each={shortcut.keys}>{(key) => <Kbd>{keyName(key)}</Kbd>}</For>
                          </span>
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              )}
            </For>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
