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

const HOOKS_PATH = process.env.WAKE_HOOKS_PATH ?? "/run/wake-hooks.json";
const SIGNAL = process.env.SIGNAL_INTERNAL_URL ?? "http://remote-api:8443";
const MAX_BODY = 256 * 1024;

function hooks(): Record<string, Hook> {
  try {
    return JSON.parse(readFileSync(HOOKS_PATH, "utf8"));
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

Bun.serve({
  port: Number(process.env.PORT ?? 8790),
  async fetch(request) {
    const match = /^\/hook\/([a-z_]{2,32})$/u.exec(new URL(request.url).pathname);
    if (!match || request.method !== "POST") return answer(404, { success: false, error: "not_found" });
    const bot = match[1];
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
    const timestamp = String(Math.floor(Date.now() / 1000));
    const deliveryId = randomUUID();
    const first = (turn.get(bot) ?? 0) % routes.length;
    let status = 0;
    for (let i = 0; i < routes.length; i += 1) {
      const at = (first + i) % routes.length;
      status = await deliver(routes[at], body, timestamp, deliveryId);
      if (status >= 200 && status < 300) {
        turn.set(bot, at + 1);
        return answer(200, { success: true, runUuid: deliveryId });
      }
    }
    // A refusal by OpenBot is not a bad bridge key, so it is never a 401 to hole.fm (that would stop all wakes).
    return answer(502, { success: false, error: status ? `openbot_${status}` : "openbot_unreachable" });
  },
});
console.log("wake bridge listening");
