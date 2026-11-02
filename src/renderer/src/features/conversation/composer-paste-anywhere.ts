/** Where a paste belongs to what holds the focus, never to the composer. */
const OWN_PASTE_SCOPE = [
  "input",
  "textarea",
  "select",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  "dialog",
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="textbox"]',
  // Settings pages, modals and panels.
  ".settings-page",
  ".settings-modal-card",
  ".agent-settings-page",
  // Code and file views.
  ".message-preview-view",
  ".file-preview-content",
  ".cm-editor",
  ".monaco-editor",
  // Any other surface can opt out.
  "[data-own-paste]",
].join(", ");
const OPEN_POPUP = 'dialog[open], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

/** Ctrl+V, or Cmd+V on macOS, with Shift for plain text. Alt changes the shortcut, so it is not one. */
export function isPasteShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  return event.key.toLowerCase() === "v" && (event.ctrlKey || event.metaKey) && !event.altKey;
}

/**
 * Whether a paste aimed at `focused` should go to the composer `editor` instead.
 *
 * Only a paste with nowhere else to go moves: the focus is on the page, the transcript or a plain
 * button. A text field, a dialog or menu that is open anywhere, settings and code views keep it.
 */
export function shouldRoutePasteToComposer(editor: HTMLElement, focused: Element | null): boolean {
  if (!editor.isConnected || editor.getAttribute("contenteditable") !== "true") return false;
  if (editor.closest("[inert], [hidden], [aria-hidden='true']")) return false;
  const document = editor.ownerDocument;
  if (document.querySelector(OPEN_POPUP)) return false;
  if (!focused || focused === document.body || focused === document.documentElement) return true;
  if (editor.contains(focused)) return false;
  return !focused.closest(OWN_PASTE_SCOPE);
}

/** Focuses the composer with the caret after its text, where a paste from elsewhere lands. */
export function focusComposerAtEnd(editor: HTMLElement): void {
  editor.focus({ preventScroll: true });
  const selection = editor.ownerDocument.getSelection();
  if (!selection) return;
  const range = editor.ownerDocument.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}
