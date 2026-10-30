// Analytics of the pages outside the app (invite, shared agent, billing return). HoleA.I builds have no
// analytics service and no public website, so every call here does nothing. The calls stay so the pages
// keep one place to report from if HoleA.I ever runs its own collector.
import { isOneOf } from "@openbot/contracts/runtime-values";
import type { DownloadPlatform } from "./download-platforms";

export type BillingReturnKind = "plan" | "portal";
export const BILLING_RETURN_KINDS = ["plan", "portal"] as const satisfies readonly BillingReturnKind[];

const SCREEN_PATHS = ["/", "/join", "/billing/return"] as const;
export type LandingScreenPath = (typeof SCREEN_PATHS)[number];

/** A first-touch path the account attribution may keep. Anything else reports the root. */
export function safeScreenPath(path: string): LandingScreenPath {
  return isOneOf(SCREEN_PATHS, path) ? path : "/";
}

const STOP = () => undefined;

class LandingAnalytics {
  start(_document: Document, _hostname: string, _screenPath?: string): () => void {
    return STOP;
  }

  startJoin(
    _document: Document,
    _hostname: string,
    _options: { validInvite: boolean; platform: DownloadPlatform },
  ): () => void {
    return STOP;
  }

  startBillingReturn(
    _document: Document,
    _hostname: string,
    _options: { cancelled: boolean; kind: BillingReturnKind | undefined },
  ): () => void {
    return STOP;
  }
}

export const landingAnalytics = new LandingAnalytics();
