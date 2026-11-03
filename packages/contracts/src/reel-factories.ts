import { isDynamicRecord } from "./runtime-values";

/** HoleA.I: the hole.fm Reels Factory board. It stays on the hole.fm VPS, where its readers are. */
export const REELS_FACTORY_BOARD_URL = "https://ai.holeacquisition.com/bridge/jobs";

/** The dashboard sign-in. The board view keeps its own sign-in, so a first open lands here once. */
export const REELS_FACTORY_SIGN_IN_URL = "https://ai.holeacquisition.com/";

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

/** HoleA.I: the board's live feed, which the desktop reads in the board's own signed-in session. */
export const REELS_FACTORY_LIVE_URL = "https://ai.holeacquisition.com/bridge/jobs/live.json";

/** One Reel of a job on the board: its short label and how far it got through the board's stages. */
export interface ReelFactoryReel {
  /** Short label, such as `EC13 · RV1`. */
  label: string;
  /** The board stages this Reel finished. */
  done: string[];
  /** The stage it is on now, or null when it has none left. */
  current: string | null;
}

export interface ReelFactoryJob {
  jobId: string;
  state: string;
  reels: ReelFactoryReel[];
}

/** The jobs still in production, and the board's stages in order. */
export interface ReelFactoryLive {
  stages: string[];
  jobs: ReelFactoryJob[];
}

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= 64 && value.every((item) => typeof item === "string" && item.length <= 80);

function isReelFactoryReel(value: unknown): value is ReelFactoryReel {
  return (
    isDynamicRecord(value) &&
    typeof value.label === "string" &&
    value.label.length <= 80 &&
    isStringList(value.done) &&
    (value.current === null || (typeof value.current === "string" && value.current.length <= 80))
  );
}

export function isReelFactoryLive(value: unknown): value is ReelFactoryLive {
  return (
    isDynamicRecord(value) &&
    isStringList(value.stages) &&
    Array.isArray(value.jobs) &&
    value.jobs.length <= 100 &&
    value.jobs.every(
      (job) =>
        isDynamicRecord(job) &&
        typeof job.jobId === "string" &&
        typeof job.state === "string" &&
        Array.isArray(job.reels) &&
        job.reels.length <= 20 &&
        job.reels.every(isReelFactoryReel),
    )
  );
}
