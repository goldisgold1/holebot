import { describe, expect, it } from "vitest";
import { dragShifts, dragTargetIndex, keyboardMoveTarget, moveItem, reorderSubset } from "./composer-attachment-order";

describe("moveItem", () => {
  it("moves an item forward and back", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("returns an unchanged copy for out-of-range or equal indexes", () => {
    const items = ["a", "b"];
    expect(moveItem(items, 0, 0)).toEqual(items);
    expect(moveItem(items, -1, 1)).toEqual(items);
    expect(moveItem(items, 0, 5)).toEqual(items);
    expect(moveItem(items, 0, 0)).not.toBe(items);
  });
});

describe("reorderSubset", () => {
  const all = [{ id: "inline" }, { id: "a" }, { id: "b" }, { id: "c" }];

  it("puts the tiles back into their own slots in the new order and keeps inline files in place", () => {
    expect(reorderSubset(all, ["c", "a", "b"]).map((item) => item.id)).toEqual(["inline", "c", "a", "b"]);
  });

  it("keeps the slots of tiles left out and ignores unknown IDs", () => {
    expect(reorderSubset(all, ["c", "missing", "a"]).map((item) => item.id)).toEqual(["inline", "c", "b", "a"]);
  });
});

describe("keyboardMoveTarget", () => {
  it("moves one step with the arrows and to the ends with Home and End", () => {
    expect(keyboardMoveTarget("ArrowLeft", 2, 4)).toBe(1);
    expect(keyboardMoveTarget("ArrowRight", 2, 4)).toBe(3);
    expect(keyboardMoveTarget("Home", 2, 4)).toBe(0);
    expect(keyboardMoveTarget("End", 1, 4)).toBe(3);
  });

  it("does nothing at an edge, with one tile or for another key", () => {
    expect(keyboardMoveTarget("ArrowLeft", 0, 4)).toBeNull();
    expect(keyboardMoveTarget("End", 3, 4)).toBeNull();
    expect(keyboardMoveTarget("ArrowRight", 0, 1)).toBeNull();
    expect(keyboardMoveTarget("ArrowUp", 1, 4)).toBeNull();
  });

  it("swaps the arrows in a right-to-left row", () => {
    expect(keyboardMoveTarget("ArrowLeft", 1, 4, true)).toBe(2);
    expect(keyboardMoveTarget("ArrowRight", 1, 4, true)).toBe(0);
  });
});

describe("dragTargetIndex", () => {
  // Three 50px tiles with an 8px gap: centres at 25, 83 and 141.
  const centers = [25, 83, 141];

  it("lands after each tile whose centre the dragged one has passed", () => {
    expect(dragTargetIndex(centers, 0, 30)).toBe(0);
    expect(dragTargetIndex(centers, 0, 90)).toBe(1);
    expect(dragTargetIndex(centers, 0, 150)).toBe(2);
    expect(dragTargetIndex(centers, 2, 20)).toBe(0);
  });

  it("counts from the right in a right-to-left row", () => {
    // The list starts at the right: the first tile's centre is the largest.
    expect(dragTargetIndex([141, 83, 25], 0, 70, true)).toBe(1);
  });
});

describe("dragShifts", () => {
  it("slides the passed tiles one slot toward the dragged tile's old place", () => {
    expect(dragShifts(4, 0, 2, 58)).toEqual([0, -58, -58, 0]);
    expect(dragShifts(4, 3, 1, 58)).toEqual([0, 58, 58, 0]);
    expect(dragShifts(3, 1, 1, 58)).toEqual([0, 0, 0]);
  });

  it("slides the other way in a right-to-left row", () => {
    expect(dragShifts(3, 0, 1, 58, true)).toEqual([0, 58, 0]);
  });
});
