// Connects one hole.fm bot wake to one OpenBot agent's webhook routine, through the wake bridge.
//   bun deploy/vps/add-wake-hook.ts <bot> <OpenBot webhook URL> <routine signing secret>
// <bot> is a hole.fm wake bot id: producer, publisher, analyst, strategist, story_maker, rosie, chief, carousel_maker.
// The webhook URL and the signing secret come from the agent's webhook routine in OpenBot (regenerate the secret to see it).
// It prints the two lines to give hole.fm (`python3 -m core.wake_config set <bot>` reads them from stdin).
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BOTS = ["producer", "publisher", "analyst", "strategist", "story_maker", "rosie", "chief", "carousel_maker"];
const [bot, webhookUrl, secret] = process.argv.slice(2);
const routeId = /\/v1\/webhooks\/([A-Za-z0-9_-]{1,128})$/u.exec(webhookUrl ?? "")?.[1];
if (!bot || !BOTS.includes(bot) || !routeId || !secret || secret.length < 16) {
  console.error(`Usage: bun deploy/vps/add-wake-hook.ts <${BOTS.join("|")}> <webhook URL> <signing secret>`);
  process.exit(1);
}

const hooksPath = join(import.meta.dir, "wake-hooks.json");
const hooks = existsSync(hooksPath) ? JSON.parse(readFileSync(hooksPath, "utf8")) : {};
const key = `hob_${randomBytes(24).toString("base64url")}`;
hooks[bot] = { key, routeId, secret };
writeFileSync(hooksPath, `${JSON.stringify(hooks, null, 2)}\n`, { mode: 0o600 });

const site = (
  readFileSync(join(import.meta.dir, ".env"), "utf8").match(/^SITE_DOMAIN=(.+)$/mu)?.[1] ?? "bot.hole.fm"
).trim();
console.log(
  [
    `${bot} now wakes the OpenBot routine ${routeId}. On the hole.fm VPS run:`,
    `  cd /home/admin/reels-expert && python3 -m core.wake_config set ${bot}`,
    "and paste these two lines:",
    `  https://${site}/hook/${bot}`,
    `  ${key}`,
    "No restart is needed: the bridge reads wake-hooks.json on every request.",
  ].join("\n"),
);
