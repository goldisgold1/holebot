// Frozen optional agent-quota-shares-v1 wire contract.
//
// What it grants, recorded here because freezing it makes it permanent: any active member of a
// server can read how the usage of each plan window (such as Claude's 5-hour and weekly windows)
// splits between the agents of that host, by estimated cost, or by tokens when nothing in the window
// was priced. HoleA.I: members already see the plan meters themselves; this adds only which agent
// spent the share. The read names no turn, chat or text, and leaves out agents hidden from the member.
// Widening any of it needs a second capability string.
import {
  type AdminDecoder,
  adminRoute,
  fields,
  identifier,
  list,
  type OptionalRouteCodec,
  oneOf,
  string,
} from "./admin-wire";

export const AGENT_QUOTA_SHARES_CAPABILITY = "agent-quota-shares-v1";

export const AGENT_QUOTA_SHARES_ROUTES = {
  read: "/v1/agents/quota-shares",
} as const;

const amount: AdminDecoder = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Invalid quota share amount.");
  return value;
};
const window = { provider: string(64), since: string(64) };
const share = fields({
  ...window,
  basis: oneOf("cost", "tokens"),
  total: amount,
  agents: list(fields({ agentId: identifier, amount }), 1_000),
});

export const AGENT_QUOTA_SHARES_CODECS: ReadonlyMap<string, OptionalRouteCodec> = new Map([
  [
    AGENT_QUOTA_SHARES_ROUTES.read,
    adminRoute(fields({ windows: list(fields(window), 32) }), fields({ shares: list(share, 32) })),
  ],
]);
