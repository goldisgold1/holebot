// Points this copy of HoleBot at your own server: one command instead of editing ~20 files.
//   bun scripts/holebot-set-domain.ts bot.example.com --org example.com
//   bun scripts/holebot-set-domain.ts --check     show which domain the code points at, change nothing
//
// The site lives at <domain>, the API at api.<domain>, the relay at signal.<domain>. It rewrites every
// tracked code and config file that names them (the apps, the invite links, the server config, the
// fork guard), and AUTH_ORG_DOMAINS: accounts with an email on --org share each other's servers.
// Commit the result, then build the apps and the server from it (FRIEND-SETUP.md).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const say = (text: string) => process.stdout.write(`${text}\n`);
const fail = (text: string): never => {
  process.stderr.write(`${text}\n`);
  process.exit(1);
};
const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};

const ORG_SETTING = /("AUTH_ORG_DOMAINS":\s*")([^"]*)(")/u;
const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(ts|tsx|js|mjs|json|jsonc|yaml|yml|sh|cmd)$/u.test(file) || file.endsWith("Caddyfile"))
  .filter((file) => file !== "scripts/holebot-set-domain.ts" && !file.includes("node_modules"));

/** The domain the code points at now: the packaged desktop app's API, minus "api.". */
function currentDomain(): string {
  const text = readFileSync(join(root, "src/main/application-services.ts"), "utf8");
  const match = text.match(/app\.isPackaged \? "https:\/\/api\.([^"]+)"/u);
  if (!match?.[1]) throw new Error("src/main/application-services.ts: the packaged API address was not found");
  return match[1];
}

const from = currentDomain();
const wrangler = join(root, "apps/auth-api/wrangler.jsonc");
const fromOrg = readFileSync(wrangler, "utf8").match(ORG_SETTING)?.[2] ?? "";

if (args.includes("--check") || args.length === 0) {
  const using = files.filter((file) => readFileSync(join(root, file), "utf8").includes(from));
  say(`The code points at ${from} (API api.${from}, relay signal.${from}).`);
  say(`Accounts on ${fromOrg || "(none)"} share servers.`);
  say(`${using.length} files name it:\n  ${using.join("\n  ")}`);
  if (args.length === 0) say("\nTo change it: bun scripts/holebot-set-domain.ts <your domain> --org <email domain>");
  process.exit(0);
}

const to = args[0]?.toLowerCase();
const org = (flag("--org") ?? "").toLowerCase();
const hostname = /^(?=.{4,200}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/u;
if (!to || !hostname.test(to)) {
  fail("Usage: bun scripts/holebot-set-domain.ts <your domain, e.g. bot.example.com> --org <email domain>");
}
if (org && !hostname.test(org)) {
  fail(`--org ${org} is not a domain (e.g. example.com)`);
}
if (to === from && (!org || org === fromOrg)) {
  say(`Already ${to}. Nothing to change.`);
  process.exit(0);
}

// Longest first, so signal.<from> and api.<from> are not half-replaced by the bare domain.
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const pattern = new RegExp(`(?<![\\w.-])(signal\\.|api\\.)?${escapeRegExp(from)}(?![\\w-])`, "gu");
let changed = 0;
for (const file of files) {
  const path = join(root, file);
  const before = readFileSync(path, "utf8");
  let after = before.replace(pattern, (_whole, prefix: string | undefined) => `${prefix ?? ""}${to}`);
  if (file === "apps/auth-api/wrangler.jsonc" && org) after = after.replace(ORG_SETTING, `$1${org}$3`);
  if (after !== before) {
    writeFileSync(path, after);
    changed += 1;
    say(`  ${file}`);
  }
}
say(`\n${changed} files now point at ${to} (API api.${to}, relay signal.${to}).`);
if (org) say(`Accounts on ${org} share servers.`);
say("Next: commit, then follow FRIEND-SETUP.md from step 3.");
