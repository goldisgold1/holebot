// The wake bridge: hole.fm wakes its bots the way Cursor automations take them (POST + `Authorization: Bearer <key>`,
// answer `{"success": true, "runUuid": ...}`). OpenBot webhook routines take signed requests instead
// (x-openbot-timestamp, x-openbot-delivery-id, x-openbot-signature = sha256 HMAC of "<ts>.<id>." + body).
// This service takes the first and sends the second, so hole.fm's wake dispatcher needs no code change:
// its endpoint for a bot becomes https://<SITE_DOMAIN>/hook/<bot> with the bridge key for that bot.
//
// hooks.json (deploy/vps/wake-hooks.json, written by deploy/vps/add-wake-hook.ts):
//   { "producer": { "key": "<bridge key>", "routeId": "<OpenBot webhook route id>", "secret": "<routine signing secret>" } }
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

interface Hook {
  key: string;
  routeId: string;
  secret: string;
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

Bun.serve({
  port: Number(process.env.PORT ?? 8790),
  async fetch(request) {
    const match = /^\/hook\/([a-z_]{2,32})$/u.exec(new URL(request.url).pathname);
    if (!match || request.method !== "POST") return answer(404, { success: false, error: "not_found" });
    const hook = hooks()[match[1]];
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/iu, "") ?? "";
    const given = bearer || request.headers.get("x-automation-key") || "";
    // 401 makes hole.fm mark the key invalid and stop waking that bot until the key is set again.
    if (!hook || !given || !sameKey(given, hook.key)) return answer(401, { success: false, error: "unauthorized" });
    const body = Buffer.from(await request.arrayBuffer());
    if (body.length > MAX_BODY) return answer(413, { success: false, error: "too_large" });

    const timestamp = String(Math.floor(Date.now() / 1000));
    const deliveryId = randomUUID();
    const signature = createHmac("sha256", hook.secret)
      .update(`${timestamp}.${deliveryId}.`)
      .update(body)
      .digest("hex");
    try {
      const sent = await fetch(`${SIGNAL}/v1/webhooks/${encodeURIComponent(hook.routeId)}`, {
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
      // A refusal by OpenBot is not a bad bridge key, so it is never a 401 to hole.fm (that would stop all wakes).
      if (!sent.ok) return answer(502, { success: false, error: `openbot_${sent.status}` });
      return answer(200, { success: true, runUuid: deliveryId });
    } catch {
      return answer(502, { success: false, error: "openbot_unreachable" });
    }
  },
});
console.log("wake bridge listening");
