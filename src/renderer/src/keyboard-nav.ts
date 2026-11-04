/**
 * HoleA.I (from Vincent's bot app): focus rings show only for keyboard users. A navigation key sets
 * `data-keyboard-nav` on the root, a pointer press clears it, and the shell stylesheet hides every
 * focus ring while it is off. Typing text does not count: a ring should not appear around a field the
 * person clicked into and types in.
 */

const NAVIGATION_KEYS = new Set([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "F6",
]);

const installed = new WeakSet<Document>();

export function installKeyboardNavMarker(doc: Document = document): void {
  if (installed.has(doc)) return;
  installed.add(doc);
  const root = doc.documentElement;
  doc.addEventListener(
    "keydown",
    (event) => {
      if (NAVIGATION_KEYS.has(event.key)) root.setAttribute("data-keyboard-nav", "");
    },
    true,
  );
  doc.addEventListener("pointerdown", () => root.removeAttribute("data-keyboard-nav"), true);
}
