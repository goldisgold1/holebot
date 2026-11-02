/** A tile starts to move only once the pointer has travelled this far, so a click stays a click. */
export const ATTACHMENT_DRAG_ACTIVATION_PX = 6;

/** `items` with the item at `from` taken out and put back at `to`. Out-of-range indexes change nothing. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/**
 * The full attachment list with the shown tiles in `orderedIds` order.
 *
 * The tile row shows only the attachments that the text does not reference inline, so the tiles take
 * back the same slots of the full list in their new order, and the inline ones stay where they were.
 * An ID that is not in `all` is ignored; an attachment of `all` missing from `orderedIds` keeps its slot.
 */
export function reorderSubset<T extends { id: string }>(all: readonly T[], orderedIds: readonly string[]): T[] {
  const byId = new Map(all.map((item) => [item.id, item]));
  const moving = orderedIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const movingIds = new Set(moving.map((item) => item.id));
  let next = 0;
  return all.map((item) => (movingIds.has(item.id) ? (moving[next++] ?? item) : item));
}

/**
 * Where Alt+Arrow/Home/End moves the tile at `index`, or null when the key does not move it.
 * In a right-to-left row the left arrow moves the tile toward the end of the list.
 */
export function keyboardMoveTarget(key: string, index: number, length: number, rtl = false): number | null {
  if (length < 2 || index < 0 || index >= length) return null;
  let target: number;
  if (key === "Home") target = 0;
  else if (key === "End") target = length - 1;
  else if (key === "ArrowLeft") target = rtl ? index + 1 : index - 1;
  else if (key === "ArrowRight") target = rtl ? index - 1 : index + 1;
  else return null;
  target = Math.min(length - 1, Math.max(0, target));
  return target === index ? null : target;
}

/**
 * The index the dragged tile lands on: the number of the other tiles whose centre it has passed.
 * `centers` are the tiles' horizontal centres at rest, in list order; `draggedCenter` is where the
 * dragged tile's centre is now. In a right-to-left row the list runs from right to left.
 */
export function dragTargetIndex(centers: readonly number[], from: number, draggedCenter: number, rtl = false): number {
  return centers.filter((center, index) => index !== from && (rtl ? center > draggedCenter : center < draggedCenter))
    .length;
}

/**
 * How far each tile slides while the dragged one would land at `to`: the tiles between its old and new
 * slots move one slot toward where it came from. `step` is the dragged tile's width plus the row gap.
 */
export function dragShifts(length: number, from: number, to: number, step: number, rtl = false): number[] {
  const direction = rtl ? -1 : 1;
  return Array.from({ length }, (_, index) => {
    if (index === from) return 0;
    if (to > from && index > from && index <= to) return -step * direction;
    if (to < from && index >= to && index < from) return step * direction;
    return 0;
  });
}
