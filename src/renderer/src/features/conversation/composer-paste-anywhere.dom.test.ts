import { afterEach, describe, expect, it } from "vitest";
import { focusComposerAtEnd, isPasteShortcut, shouldRoutePasteToComposer } from "./composer-paste-anywhere";

function mount(html: string): HTMLElement {
  document.body.innerHTML = `<div class="composer"><div class="composer-editor-surface" contenteditable="true">Draft</div></div>${html}`;
  const editor = document.querySelector(".composer-editor-surface");
  if (!(editor instanceof HTMLElement)) throw new Error("The composer did not mount.");
  return editor;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("isPasteShortcut", () => {
  it("takes Ctrl+V, Cmd+V and their Shift forms, but not Alt or other keys", () => {
    const key = { key: "v", ctrlKey: false, metaKey: false, altKey: false };
    expect(isPasteShortcut({ ...key, ctrlKey: true })).toBe(true);
    expect(isPasteShortcut({ ...key, key: "V", metaKey: true })).toBe(true);
    expect(isPasteShortcut({ ...key, ctrlKey: true, altKey: true })).toBe(false);
    expect(isPasteShortcut({ ...key, key: "c", ctrlKey: true })).toBe(false);
    expect(isPasteShortcut(key)).toBe(false);
  });
});

describe("shouldRoutePasteToComposer", () => {
  it("routes a paste with the focus on the page or a plain button", () => {
    const editor = mount(`<button id="row">Message</button>`);
    expect(shouldRoutePasteToComposer(editor, document.body)).toBe(true);
    expect(shouldRoutePasteToComposer(editor, null)).toBe(true);
    expect(shouldRoutePasteToComposer(editor, document.getElementById("row"))).toBe(true);
  });

  it("leaves text fields, the composer itself and other editable surfaces alone", () => {
    const editor = mount(
      `<input id="field" /><textarea id="area"></textarea><div contenteditable="true"><span id="rich">x</span></div>`,
    );
    expect(shouldRoutePasteToComposer(editor, editor)).toBe(false);
    expect(shouldRoutePasteToComposer(editor, document.getElementById("field"))).toBe(false);
    expect(shouldRoutePasteToComposer(editor, document.getElementById("area"))).toBe(false);
    expect(shouldRoutePasteToComposer(editor, document.getElementById("rich"))).toBe(false);
  });

  it("leaves settings and code views alone", () => {
    const editor = mount(
      `<div class="settings-page"><button id="toggle">On</button></div><div class="message-preview-view"><pre id="code" tabindex="0">x</pre></div>`,
    );
    expect(shouldRoutePasteToComposer(editor, document.getElementById("toggle"))).toBe(false);
    expect(shouldRoutePasteToComposer(editor, document.getElementById("code"))).toBe(false);
  });

  it("does nothing while a dialog is open, or when the composer is locked or hidden", () => {
    const withDialog = mount(`<div role="dialog"><button>OK</button></div>`);
    expect(shouldRoutePasteToComposer(withDialog, document.body)).toBe(false);

    const locked = mount("");
    locked.setAttribute("contenteditable", "false");
    expect(shouldRoutePasteToComposer(locked, document.body)).toBe(false);

    const covered = mount("");
    covered.closest(".composer")?.setAttribute("inert", "");
    expect(shouldRoutePasteToComposer(covered, document.body)).toBe(false);
  });
});

describe("focusComposerAtEnd", () => {
  it("puts the caret after the draft text", () => {
    const editor = mount("");
    focusComposerAtEnd(editor);
    const selection = document.getSelection();
    expect(selection?.isCollapsed).toBe(true);
    expect(selection?.anchorNode).toBe(editor);
    expect(selection?.anchorOffset).toBe(editor.childNodes.length);
  });
});
