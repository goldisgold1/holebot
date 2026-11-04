/*
 * HoleA.I (from Vincent's bot app): two small behaviours of the source app's transcript that need the document
 * rather than a row: End from anywhere goes to the newest message, and a sideways trackpad swipe peeks at the
 * time of every message (holeai-feel-chat.css draws both).
 */

/** How far the bubbles slide, which is also the lane the bubbles keep free at the end of each row. */
export const PEEK_DISTANCE = 82;
/** A swipe starts once it has moved this far sideways, more sideways than down. */
const PEEK_START = 6;
/** The swipe has ended when no wheel event came for this long. */
const PEEK_RELEASE_MS = 90;
/** The spring back, as long as its CSS curve. */
const PEEK_SETTLE_MS = 435;

/** Where a key belongs to what has the focus: text fields, menus, dialogs and anything that opts out. */
const OWN_KEYS = [
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  '[role="textbox"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  "dialog",
  "[data-own-keys]",
].join(", ");
const OPEN_POPUP = 'dialog[open], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

/** Whether a plain key pressed with `focused` holding the focus may act on the chat instead. */
export function keyIsFree(document: Document, focused: Element | null): boolean {
  if (document.querySelector(OPEN_POPUP)) return false;
  if (!focused || focused === document.body || focused === document.documentElement) return true;
  return !focused.closest(OWN_KEYS);
}

/**
 * End with nothing else held, outside text fields, menus and dialogs, scrolls the chat to its newest message.
 * A focused transcript scrolls on its own, so the key is left to it. Returns the cleanup.
 */
export function endKeyJumpsToLatest(document: Document, jump: () => void): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "End" || event.defaultPrevented || event.isComposing) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const focused = document.activeElement;
    if (!keyIsFree(document, focused) || focused?.closest(".conversation-scroll")) return;
    event.preventDefault();
    jump();
  };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}

/** Whether the wheel event lands in something that scrolls sideways itself: a code block, a table, a strip. */
function scrollsSideways(target: EventTarget | null, root: HTMLElement): boolean {
  let element = target instanceof Element ? target : null;
  while (element && element !== root) {
    if (element instanceof HTMLElement && element.scrollWidth > element.clientWidth) {
      const overflow = getComputedStyle(element).overflowX;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
    element = element.parentElement;
  }
  return false;
}

/**
 * The swipe-to-peek of the source app: a sideways trackpad swipe over the transcript slides the messages up to
 * 82px and fades in each message's time at the end of its row. The transcript does not scroll while it peeks.
 * Letting go springs it back. The element carries the distance and the progress as custom properties and
 * `data-peek` ("" while the swipe follows the fingers, "settling" on the way back).
 */
export function attachTimestampPeek(element: HTMLElement): void {
  let offset = 0;
  let travel = 0;
  let peeking = false;
  let releaseTimer: number | undefined;
  let settleTimer: number | undefined;
  const paint = () => {
    element.style.setProperty("--holeai-chat-peek", `${offset}px`);
    element.style.setProperty("--holeai-chat-peek-progress", String(offset / PEEK_DISTANCE));
  };
  const clear = () => {
    element.removeAttribute("data-peek");
    element.style.removeProperty("--holeai-chat-peek");
    element.style.removeProperty("--holeai-chat-peek-progress");
  };
  const release = () => {
    releaseTimer = undefined;
    peeking = false;
    travel = 0;
    offset = 0;
    element.setAttribute("data-peek", "settling");
    // The transition needs a frame with the settling state before the values change.
    requestAnimationFrame(() => {
      paint();
      settleTimer = window.setTimeout(() => {
        settleTimer = undefined;
        if (!peeking) clear();
      }, PEEK_SETTLE_MS);
    });
  };
  element.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return;
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!peeking) {
        if (!sideways || scrollsSideways(event.target, element)) {
          travel = 0;
          return;
        }
        travel += event.deltaX;
        if (travel < PEEK_START) return;
        peeking = true;
        if (settleTimer !== undefined) window.clearTimeout(settleTimer);
        settleTimer = undefined;
        element.setAttribute("data-peek", "");
      }
      // Vertical scrolling stays still while the times show.
      event.preventDefault();
      offset = Math.min(PEEK_DISTANCE, Math.max(0, offset + event.deltaX));
      paint();
      if (releaseTimer !== undefined) window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(release, PEEK_RELEASE_MS);
    },
    { passive: false },
  );
}
