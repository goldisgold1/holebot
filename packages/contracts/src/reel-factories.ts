import { isDynamicRecord } from "./runtime-values";

/** HoleA.I: the hole.fm Reels Factory board. It stays on the hole.fm VPS, where its readers are. */
export const REELS_FACTORY_BOARD_URL = "https://ai.holeacquisition.com/bridge/jobs";

/** Where the desktop window shows the board, in the page's CSS pixels. */
export interface ReelFactoriesViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isReelFactoriesViewBounds(value: unknown): value is ReelFactoriesViewBounds {
  return (
    isDynamicRecord(value) &&
    [value.x, value.y, value.width, value.height].every(
      (part) => typeof part === "number" && Number.isFinite(part) && part >= 0 && part <= 100_000,
    )
  );
}
