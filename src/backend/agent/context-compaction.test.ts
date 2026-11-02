import { DEFAULT_AUTO_COMPACT_THRESHOLD, isAutoCompactThreshold } from "@openbot/contracts/ipc";
import { describe, expect, it } from "vitest";
import { reachesAutoCompact } from "./context-compaction";

describe("reachesAutoCompact", () => {
  it("compacts at 80% by default, as before the setting existed", () => {
    expect(reachesAutoCompact(799, 1_000, DEFAULT_AUTO_COMPACT_THRESHOLD)).toBe(false);
    expect(reachesAutoCompact(800, 1_000, DEFAULT_AUTO_COMPACT_THRESHOLD)).toBe(true);
  });

  it("compacts at the user's threshold", () => {
    expect(reachesAutoCompact(499, 1_000, 0.5)).toBe(false);
    expect(reachesAutoCompact(500, 1_000, 0.5)).toBe(true);
    expect(reachesAutoCompact(969, 1_000, 0.97)).toBe(false);
    expect(reachesAutoCompact(970, 1_000, 0.97)).toBe(true);
  });

  it("never compacts when the threshold is Off", () => {
    expect(reachesAutoCompact(1_000, 1_000, null)).toBe(false);
  });

  it("does not compact a thread with no known window", () => {
    expect(reachesAutoCompact(10, 0, 0.5)).toBe(false);
  });
});

describe("isAutoCompactThreshold", () => {
  it("takes Off and any share from 1% to 100%", () => {
    expect(isAutoCompactThreshold(null)).toBe(true);
    expect(isAutoCompactThreshold(0.01)).toBe(true);
    expect(isAutoCompactThreshold(0.73)).toBe(true);
    expect(isAutoCompactThreshold(1)).toBe(true);
    expect(isAutoCompactThreshold(0)).toBe(false);
    expect(isAutoCompactThreshold(1.5)).toBe(false);
    expect(isAutoCompactThreshold(Number.NaN)).toBe(false);
    expect(isAutoCompactThreshold("0.8")).toBe(false);
  });
});
