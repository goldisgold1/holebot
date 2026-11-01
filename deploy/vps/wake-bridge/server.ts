// The wake bridge: hole.fm wakes its bots the way Cursor automations take them (POST + `Authorization: Bearer <key>`,
// answer `{"success": true, "runUuid": ...}`). OpenBot webhook routines take signed requests instead
// (x-openbot-timestamp, x-openbot-delivery-id, x-openbot-signature = sha256 HMAC of "<ts>.<id>." + body).
// This service takes the first and sends the second, so hole.fm's wake dispatcher needs no code change:
// its endpoint for a bot becomes https://<SITE_DOMAIN>/hook/<bot> with the bridge key for that bot.
//
// hooks.json (deploy/vps/wake-hooks.json, written by deploy/vps/add-wake-hook.ts):
//   { "producer": { "key": "<bridge key>", "routes": [{ "routeId": "<OpenBot webhook route id>", "secret": "<routine signing secret>" }] } }
// Several routes for one bot (several Producer agents) take the wakes in turn; a route OpenBot refuses passes the
// wake to the next one. The older one-route shape { key, routeId, secret } still works.
//
// It also carries the team relay: POST /relay/grok/<bot> (a Claude bot messages a Grok bot) and /relay/claude/<bot>
// (the other way), body { from, text, reply_to?, hop? }, with the sending team's key. See relay() below.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

interface Route {
  routeId: string;
  secret: string;
}

interface Hook {
  key: string;
  routes?: Route[];
  routeId?: string;
  secret?: string;
}

/**
 * The team relay (team-relay.json, written by deploy/vps/setup-team-relay.sh): one send key per team, and the
 * Grok Bot routine address and key per bot, so a Claude bot can message a Grok bot and the other way round.
 */
interface GrokEndpoint {
  url: string;
  key: string;
}

interface RelayConfig {
  senders?: { claude?: string; grok?: string };
  grok?: Record<string, GrokEndpoint>;
}

type Team = "claude" | "grok";

const HOOKS_PATH = process.env.WAKE_HOOKS_PATH ?? "/run/wake-hooks.json";
const RELAY_PATH = process.env.TEAM_RELAY_PATH ?? "/run/team-relay.json";
const SIGNAL = process.env.SIGNAL_INTERNAL_URL ?? "http://remote-api:8443";
const MAX_BODY = 256 * 1024;
const MAX_TEXT = 4_000;
// A conversation ends after 10 replies: room to work something out, but two bots cannot keep each other awake.
const MAX_HOPS = 10;
// Per sending bot and receiving bot, and for the whole relay, in one hour.
const PAIR_LIMIT = 30;
const RELAY_LIMIT = 200;
const HOUR_MS = 3_600_000;

function hooks(): Record<string, Hook> {
  try {
    return JSON.parse(readFileSync(HOOKS_PATH, "utf8"));
  } catch {
    return {};
  }
}

function relayConfig(): RelayConfig {
  try {
    return JSON.parse(readFileSync(RELAY_PATH, "utf8"));
  } catch {
    return {};
  }
}

function sameKey(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** What hole.fm's wake dispatcher reads: `success`, and `runUuid` as the run id it records. */
interface WakeAnswer {
  success: boolean;
  runUuid?: string;
  error?: string;
}

function answer(status: number, body: WakeAnswer): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function routesOf(hook: Hook): Route[] {
  if (hook.routes?.length) return hook.routes;
  return hook.routeId && hook.secret ? [{ routeId: hook.routeId, secret: hook.secret }] : [];
}

/** The next route to try for each bot, so several agents take a bot's wakes in turn. */
const turn = new Map<string, number>();

/**
 * OpenBot routines take `{ type, data, occurredAt? }` and refuse anything else with 400. hole.fm sends its own
 * object (`{ v, event, ... }`), so it goes whole into `data`, under the type `holefm.<event>`. A body that is
 * already an OpenBot event passes as it is.
 */
/** The two fields the bridge reads from a wake; the rest of the object goes into `data` untouched. */
interface WakeFields {
  type?: unknown;
  event?: unknown;
}

function isWakeObject(value: unknown): value is WakeFields {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asOpenBotEvent(raw: Buffer): Buffer | null {
  let record: unknown;
  try {
    record = JSON.parse(raw.toString("utf8"));
  } catch {
    return null;
  }
  if (!isWakeObject(record)) return null;
  if (typeof record.type === "string" && record.type) return raw;
  const event = typeof record.event === "string" && /^[a-z0-9_.-]{1,64}$/iu.test(record.event) ? record.event : "wake";
  return Buffer.from(JSON.stringify({ type: `holefm.${event}`, data: record }));
}

/** Signs the body for one routine and sends it; the HTTP status, or 0 when OpenBot is unreachable. */
async function deliver(route: Route, body: Buffer, timestamp: string, deliveryId: string): Promise<number> {
  const signature = createHmac("sha256", route.secret).update(`${timestamp}.${deliveryId}.`).update(body).digest("hex");
  try {
    const sent = await fetch(`${SIGNAL}/v1/webhooks/${encodeURIComponent(route.routeId)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-openbot-timestamp": timestamp,
        "x-openbot-delivery-id": deliveryId,
        "x-openbot-signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(7_000),
    });
    await sent.body?.cancel();
    return sent.status;
  } catch {
    return 0;
  }
}

/** Hands one event to a Claude bot's routines, in turn; the last HTTP status (2xx when one took it, 0 when unreachable). */
async function deliverToClaude(bot: string, routes: Route[], body: Buffer, deliveryId: string): Promise<number> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const first = (turn.get(bot) ?? 0) % routes.length;
  let status = 0;
  for (let i = 0; i < routes.length; i += 1) {
    const at = (first + i) % routes.length;
    status = await deliver(routes[at], body, timestamp, deliveryId);
    if (status >= 200 && status < 300) {
      turn.set(bot, at + 1);
      return status;
    }
  }
  return status;
}

/**
 * Hands one message to a Grok bot's routine with the headers hole.fm uses; the HTTP status (0 when unreachable) and,
 * on a refusal, Grok Bot's reason (a paused routine answers 400 "Automation ... is disabled").
 */
async function deliverToGrok(endpoint: GrokEndpoint, body: string): Promise<{ status: number; reason: string }> {
  try {
    const sent = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "holefm-wake/1",
        authorization: `Bearer ${endpoint.key}`,
        "x-automation-key": endpoint.key,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (sent.ok) {
      await sent.body?.cancel();
      return { status: sent.status, reason: "" };
    }
    const text = (await sent.text()).slice(0, 300);
    const reason = /"error"\s*:\s*"([^"]{1,160})"/u.exec(text)?.[1] ?? "";
    return { status: sent.status, reason: reason.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/giu, "<routine>") };
  } catch {
    return { status: 0, reason: "" };
  }
}

async function wake(request: Request, bot: string): Promise<Response> {
  const hook = hooks()[bot];
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/iu, "") ?? "";
  const given = bearer || request.headers.get("x-automation-key") || "";
  // 401 makes hole.fm mark the key invalid and stop waking that bot until the key is set again.
  if (!hook || !given || !sameKey(given, hook.key)) return answer(401, { success: false, error: "unauthorized" });
  const raw = Buffer.from(await request.arrayBuffer());
  if (raw.length > MAX_BODY) return answer(413, { success: false, error: "too_large" });
  const body = asOpenBotEvent(raw);
  if (!body) return answer(400, { success: false, error: "not_a_json_object" });

  const routes = routesOf(hook);
  if (!routes.length) return answer(502, { success: false, error: "no_route" });
  const deliveryId = randomUUID();
  const status = await deliverToClaude(bot, routes, body, deliveryId);
  if (status >= 200 && status < 300) return answer(200, { success: true, runUuid: deliveryId });
  // A refusal by OpenBot is not a bad bridge key, so it is never a 401 to hole.fm (that would stop all wakes).
  return answer(502, { success: false, error: status ? `openbot_${status}` : "openbot_unreachable" });
}

/** What a sending bot posts to the relay. */
interface RelayMessage {
  from?: unknown;
  text?: unknown;
  reply_to?: unknown;
  hop?: unknown;
}

function isRelayMessage(value: unknown): value is RelayMessage {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Send times per rate key, pruned to the last hour. */
const sent = new Map<string, number[]>();

function underLimit(key: string, limit: number, now: number): boolean {
  const recent = (sent.get(key) ?? []).filter((at) => now - at < HOUR_MS);
  sent.set(key, recent);
  return recent.length < limit;
}

/**
 * A message from one team's bot to the other team's bot. The sender's team comes from its send key, so a Grok key
 * reaches only Claude bots and a Claude key only Grok bots. A Claude bot gets it as a `team.message` event; a Grok bot
 * gets it the way hole.fm wakes it, as event `team_message`. Each line in the log has the route, never the text.
 */
async function relay(request: Request, to: Team, bot: string): Promise<Response> {
  const config = relayConfig();
  const from: Team = to === "claude" ? "grok" : "claude";
  const expected = config.senders?.[from];
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/iu, "") ?? "";
  if (!expected || !given || !sameKey(given, expected)) return answer(401, { success: false, error: "unauthorized" });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return answer(413, { success: false, error: "too_large" });
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return answer(400, { success: false, error: "not_json" });
  }
  if (!isRelayMessage(message)) return answer(400, { success: false, error: "not_a_json_object" });
  const sender = typeof message.from === "string" && /^[a-z_]{2,32}$/u.test(message.from) ? message.from : null;
  const text = typeof message.text === "string" ? message.text.trim() : "";
  if (!sender || !text) return answer(400, { success: false, error: "need_from_and_text" });
  if (text.length > MAX_TEXT) return answer(413, { success: false, error: "text_over_4000" });
  const replyTo = typeof message.reply_to === "string" ? message.reply_to.slice(0, 64) : null;
  const hop = typeof message.hop === "number" && Number.isInteger(message.hop) && message.hop >= 0 ? message.hop : 0;
  if (hop > MAX_HOPS) return answer(429, { success: false, error: "loop_guard_reply_chain_too_long" });
  const now = Date.now();
  if (!underLimit("relay", RELAY_LIMIT, now) || !underLimit(`${from}:${sender}>${to}:${bot}`, PAIR_LIMIT, now)) {
    return answer(429, { success: false, error: "rate_limited" });
  }

  const id = randomUUID();
  const data = { id, from_team: from, from: sender, to_team: to, to: bot, text, reply_to: replyTo, hop };
  let status = 0;
  let reason = "";
  if (to === "claude") {
    const hook = hooks()[bot];
    const routes = hook ? routesOf(hook) : [];
    if (!routes.length) return answer(404, { success: false, error: "no_such_claude_bot" });
    status = await deliverToClaude(bot, routes, Buffer.from(JSON.stringify({ type: "team.message", data })), id);
  } else {
    const endpoint = config.grok?.[bot];
    if (!endpoint) return answer(404, { success: false, error: "no_such_grok_bot" });
    ({ status, reason } = await deliverToGrok(endpoint, JSON.stringify({ v: 1, event: "team_message", ...data })));
  }
  sent.get("relay")?.push(now);
  sent.get(`${from}:${sender}>${to}:${bot}`)?.push(now);
  const ok = status >= 200 && status < 300;
  console.log(`relay ${id} ${from}:${sender} -> ${to}:${bot} hop=${hop} chars=${text.length} status=${status}`);
  return ok
    ? answer(200, { success: true, runUuid: id })
    : answer(502, {
        success: false,
        error: status ? `${to}_${status}${reason ? `: ${reason}` : ""}` : `${to}_unreachable`,
      });
}

Bun.serve({
  port: Number(process.env.PORT ?? 8790),
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (request.method === "POST") {
      const hook = /^\/hook\/([a-z_]{2,32})$/u.exec(path);
      if (hook) return wake(request, hook[1]);
      const message = /^\/relay\/(claude|grok)\/([a-z_]{2,32})$/u.exec(path);
      if (message) return relay(request, message[1] === "claude" ? "claude" : "grok", message[2]);
    }
    return answer(404, { success: false, error: "not_found" });
  },
});
console.log("wake bridge listening");
