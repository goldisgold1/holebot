// Writes deploy/vps/.env (compose) and deploy/vps/auth-api.env (Worker secrets) with fresh secrets.
//   bun deploy/vps/make-secrets.ts <public IPv4 of the VPS> [--email you@example.com]
// --email is where Let's Encrypt writes about the HTTPS certificates. The domains are the ones the code
// points at (bun scripts/holebot-set-domain.ts).
// It refuses to overwrite existing files, because new keys sign everyone out and break every host.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createDevelopmentTicketKeyPair } from "../../scripts/development-secrets";

const directory = import.meta.dir;
const publicIp = process.argv[2];
const emailAt = process.argv.indexOf("--email");
const acmeEmail = emailAt > 0 ? process.argv[emailAt + 1] : "duy@holeacquisition.com";
if (!acmeEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(acmeEmail)) {
  console.error("--email needs an email address, e.g. --email you@example.com");
  process.exit(1);
}
if (!publicIp || !/^\d{1,3}(\.\d{1,3}){3}$/u.test(publicIp)) {
  console.error("Usage: bun deploy/vps/make-secrets.ts <public IPv4 of the VPS> [--email you@example.com]");
  process.exit(1);
}
const composeEnv = join(directory, ".env");
const workerEnv = join(directory, "auth-api.env");
for (const path of [composeEnv, workerEnv]) {
  if (existsSync(path)) {
    console.error(`${path} exists. Delete it yourself if you really want new keys.`);
    process.exit(1);
  }
}

const secret = () =>
  crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
const tickets = createDevelopmentTicketKeyPair("holeai-remote-1");
const webhookSecret = secret();

writeFileSync(
  composeEnv,
  [
    `ACME_EMAIL=${acmeEmail}`,
    "SITE_DOMAIN=bot.holeacquisition.com",
    "API_DOMAIN=api.bot.holeacquisition.com",
    "SIGNAL_DOMAIN=signal.bot.holeacquisition.com",
    `TURN_PUBLIC_IP=${publicIp}`,
    `REMOTE_SESSION_SECRET=${secret()}`,
    `REMOTE_AUTH_WEBHOOK_SECRET=${webhookSecret}`,
    `REMOTE_METRICS_TOKEN=${secret()}`,
    `TURN_SHARED_SECRET=${secret()}`,
    "# Your own Slack, Discord and Telegram bots. Leave empty to keep a bot off.",
    "SLACK_SIGNING_SECRET=",
    "DISCORD_BOT_TOKEN=",
    "DISCORD_APPLICATION_ID=",
    "DISCORD_MESSAGE_CONTENT=",
    "TELEGRAM_BOT_TOKENS=",
    `TELEGRAM_WEBHOOK_SECRET=${secret()}`,
    "",
  ].join("\n"),
  { mode: 0o600 },
);

writeFileSync(
  workerEnv,
  [
    `REMOTE_TICKET_PRIVATE_JWK=${tickets.privateJwk}`,
    `REMOTE_TICKET_PUBLIC_JWKS=${tickets.publicJwks}`,
    `REMOTE_AUTH_WEBHOOK_SECRET=${webhookSecret}`,
    `SKILLS_ADMIN_TOKEN=${secret()}`,
    `SERVER_CLAIMS_ADMIN_TOKEN=${secret()}`,
    `SITE_REPORT_HASH_SECRET=${secret()}`,
    "# Who can sign in. Add people with: bun deploy/vps/add-user.ts <email>",
    "AUTH_ACCESS_CODE_HASHES={}",
    "",
  ].join("\n"),
  { mode: 0o600 },
);
// The wake bridge mounts this file; Docker would make a folder of a missing one. add-wake-hook.ts fills it.
const wakeHooks = join(directory, "wake-hooks.json");
if (!existsSync(wakeHooks)) writeFileSync(wakeHooks, "{}\n", { mode: 0o600 });
console.log(`Wrote ${composeEnv} and ${workerEnv}. Keep both private and back them up.`);
