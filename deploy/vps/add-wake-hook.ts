// Connects one hole.fm bot wake to an OpenBot agent's webhook routine, through the wake bridge.
//   bun deploy/vps/add-wake-hook.ts [--add] [--local] <bot> <OpenBot webhook URL> <routine signing secret>
// <bot> is a hole.fm wake bot id: producer, publisher, analyst, strategist, story_maker, rosie, chief, carousel_maker.
// The webhook URL and the signing secret come from the agent's webhook routine in OpenBot (regenerate the secret to see it).
// --add adds this routine to the bot's rotation (a second or third Producer) and keeps the bot's key, so hole.fm
// needs no change. Without it the bot gets this one routine and a new key.
// --local prints the address for the wake link on this PC (start-wake-link.cmd) instead of the VPS site.
// It prints the two lines to give hole.fm (`python3 -m core.wake_config set <bot>` reads them from stdin).
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BOTS = ["producer", "publisher", "analyst", "strategist", "story_maker", "rosie", "chief", "carousel_maker"];
const args = process.argv.slice(2);
const add = args.includes("--add");
const local = args.includes("--local");
const [bot, webhookUrl, secret] = args.filter((arg) => !arg.startsWith("--"));
const routeId = /\/v1\/webhooks\/([A-Za-z0-9_-]{1,128})$/u.exec(webhookUrl ?? "")?.[1];
if (!bot || !BOTS.includes(bot) || !routeId || !secret || secret.length < 16) {
  console.error(
    `Usage: bun deploy/vps/add-wake-hook.ts [--add] [--local] <${BOTS.join("|")}> <webhook URL> <signing secret>`,
  );
  process.exit(1);
}

const hooksPath = join(import.meta.dir, "wake-hooks.json");
const hooks = existsSync(hooksPath) ? JSON.parse(readFileSync(hooksPath, "utf8")) : {};
const old = hooks[bot];
const oldRoutes = old?.routes ?? (old?.routeId ? [{ routeId: old.routeId, secret: old.secret }] : []);
if (add && !old) {
  console.error(`${bot} has no routine yet. Add the first one without --add.`);
  process.exit(1);
}
const key = add ? old.key : `hob_${randomBytes(24).toString("base64url")}`;
const routes = add
  ? [...oldRoutes.filter((route) => route.routeId !== routeId), { routeId, secret }]
  : [{ routeId, secret }];
hooks[bot] = { key, routes };
writeFileSync(hooksPath, `${JSON.stringify(hooks, null, 2)}\n`, { mode: 0o600 });

const envPath = join(import.meta.dir, ".env");
const site = existsSync(envPath)
  ? (readFileSync(envPath, "utf8").match(/^SITE_DOMAIN=(.+)$/mu)?.[1] ?? "bot.hole.fm").trim()
  : "bot.hole.fm";
const url = local ? `http://127.0.0.1:18790/hook/${bot}` : `https://${site}/hook/${bot}`;
console.log(
  add
    ? `${bot} now wakes ${routes.length} OpenBot routines in turn. hole.fm needs no change.`
    : [
        `${bot} now wakes the OpenBot routine ${routeId}. On the hole.fm VPS run:`,
        `  cd /home/admin/reels-expert && python3 -m core.wake_config set ${bot}`,
        "and paste these two lines:",
        `  ${url}`,
        `  ${key}`,
        "No restart is needed: the bridge reads wake-hooks.json on every request.",
      ].join("\n"),
);
