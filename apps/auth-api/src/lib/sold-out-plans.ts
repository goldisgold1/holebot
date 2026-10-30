import type { BillingPlanId } from "@openbot/contracts/billing";

/** The plans that no new server can take. Servers that have one keep it. */
export const SOLD_OUT_PLANS: ReadonlySet<BillingPlanId> = new Set(["starter"]);
