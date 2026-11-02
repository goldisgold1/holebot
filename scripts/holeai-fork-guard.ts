// Fails when an upstream merge brought back something the HoleA.I fork removed (HOLEAI-FORK.md).
//   bun scripts/holeai-fork-guard.ts
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenBotLogger } from "@openbot/logging";
import { leftoverNames } from "./holeai-rebrand";

const logger = createOpenBotLogger("holeai-fork-guard");

const root = join(import.meta.dir, "..");
const problems: string[] = [];

/** Tracked files that match a pattern, outside the history files that keep old names on purpose. */
function trackedMatches(pattern: string, ...pathspecs: string[]): string[] {
  try {
    const output = execFileSync(
      "git",
      [
        "grep",
        "-l",
        "-i",
        "-E",
        pattern,
        "--",
        ...pathspecs,
        ":!CHANGELOG.md",
        ":!**/CHANGELOG.md",
        ":!HOLEAI-FORK.md",
        ":!scripts/holeai-fork-guard.ts",
      ],
      { cwd: root, encoding: "utf8" },
    );
    return output.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function fileContains(path: string, text: string): boolean {
  const full = join(root, path);
  return existsSync(full) && readFileSync(full, "utf8").includes(text);
}

for (const file of trackedMatches("synthetify")) problems.push(`${file}: names Synthetify`);
for (const file of trackedMatches("polyform", ":!bun.lock", ":!whats-new-releases.json"))
  problems.push(`${file}: mentions PolyForm`);
if (existsSync(join(root, "packages/contracts/src/license.ts")))
  problems.push("packages/contracts/src/license.ts: the paid license came back");
// billing-sales.ts and stripe-client.ts explain why Stripe items of the old license are ignored.
for (const file of trackedMatches(
  "commercial[- ]license",
  "src",
  "packages",
  "apps/auth-api/src",
  ":!**/*.test.*",
  ":!apps/auth-api/src/server/billing-sales.ts",
  ":!apps/auth-api/src/server/stripe-client.ts",
))
  problems.push(`${file}: mentions a commercial license`);
if (!fileContains("LICENSE", "MIT License")) problems.push("LICENSE: not the MIT License");
if (!fileContains("electron-builder.yml", "publish: null"))
  problems.push("electron-builder.yml: auto-update publishing is on");
if (!fileContains("packages/contracts/src/invite-links.ts", "https://api.bot.holeacquisition.com"))
  problems.push("packages/contracts/src/invite-links.ts: the API is not api.bot.holeacquisition.com");
if (!fileContains("src/main/application-services.ts", "https://api.bot.holeacquisition.com"))
  problems.push("src/main/application-services.ts: the packaged API is not api.bot.holeacquisition.com");
if (fileContains("packages/telemetry/src/transport.ts", "analytics.openbot.run"))
  problems.push("packages/telemetry/src/transport.ts: sends to the previous owner's analytics");
if (!fileContains("apps/auth-api/src/server/auth-service.ts", "accessCodeHashes"))
  problems.push("apps/auth-api/src/server/auth-service.ts: access-code sign-in is gone");
// The HoleBot name: the text files are renamed by holeai-rebrand.ts, the rest by hand.
for (const file of leftoverNames()) problems.push(`${file}: says OpenBot (run bun scripts/holeai-rebrand.ts)`);
for (const [path, text] of [
  ["package.json", '"productName": "HoleBot"'],
  ["electron-builder.yml", "productName: HoleBot"],
  ["src/main/index.ts", 'app.setName("HoleBot")'],
  ["src/renderer/index.html", "<title>HoleBot</title>"],
  ["apps/mobile/app.json", '"name": "HoleBot"'],
  ["apps/auth-api/public/site.webmanifest", '"short_name": "HoleBot"'],
  ["apps/auth-api/src/routes/app.tsx", '"HoleBot web"'],
  // An upstream icon would bring back the OpenBot art: keep ours or run holeai-icons.ts.
  ["build/icon.svg", "<title>HoleBot</title>"],
] as const) {
  if (!fileContains(path, text)) problems.push(`${path}: lost the HoleBot name (${text})`);
}
// Electron names the data folder after the product; it must stay %APPDATA%\OpenBot.
if (!fileContains("src/main/index.ts", 'app.setPath("userData", join(app.getPath("appData"), "OpenBot"))'))
  problems.push("src/main/index.ts: the data folder is no longer pinned to %APPDATA%\\OpenBot");

for (const route of [
  "pricing.tsx",
  "terms.tsx",
  "privacy-policy.tsx",
  "dpa.tsx",
  "compare",
  "news",
  "guides",
  "download",
]) {
  if (existsSync(join(root, "apps/auth-api/src/routes", route)))
    problems.push(`apps/auth-api/src/routes/${route}: website page came back`);
}

if (problems.length > 0) {
  logger.error(
    `The HoleA.I fork guard found ${problems.length} problem(s):\n${problems.map((p) => `- ${p}`).join("\n")}`,
  );
  process.exit(1);
}
logger.info("The HoleA.I fork guard passed.");
