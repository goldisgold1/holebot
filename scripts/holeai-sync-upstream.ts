// The weekly HoleA.I sync with nightly-labs/openbot (HOLEAI-FORK.md).
//   bun scripts/holeai-sync-upstream.ts              fetch, merge into sync/upstream-<date>, check
//   bun scripts/holeai-sync-upstream.ts --continue   after resolving the conflicts it listed
// It never merges into holeai-internal and never pushes.
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { createOpenBotLogger } from "@openbot/logging";

const logger = createOpenBotLogger("holeai-sync-upstream");

const root = join(import.meta.dir, "..");
const BASE = "holeai-internal";
const continuing = process.argv.includes("--continue");

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function run(label: string, command: string, args: string[]): boolean {
  logger.info(`\n== ${label}`);
  return spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" }).status === 0;
}

/** Conflicts where this fork deleted the file stay deleted. The rest are left for a person. */
function resolveDeletedByUs(): string[] {
  const unresolved: string[] = [];
  for (const line of git("status", "--porcelain").split("\n").filter(Boolean)) {
    const state = line.slice(0, 2);
    const path = line.slice(3);
    if (state === "DU") git("rm", "-q", "--", path);
    else if (["UU", "AA", "UD", "AU", "UA", "DD"].includes(state)) unresolved.push(`${state} ${path}`);
  }
  return unresolved;
}

if (!continuing) {
  if (git("status", "--porcelain") !== "") {
    logger.error("Commit or stash your changes first.");
    process.exit(1);
  }
  git("switch", BASE);
  logger.info("Fetching nightly-labs/openbot…");
  git("fetch", "upstream", "--tags");
  const fresh = git("log", "--oneline", `${BASE}..upstream/main`);
  if (!fresh) {
    logger.info("No new upstream commits. Nothing to sync.");
    process.exit(0);
  }
  logger.info(`New upstream commits:\n${fresh}`);
  const branch = `sync/upstream-${new Date().toISOString().slice(0, 10)}`;
  git("switch", "-C", branch);
  const merge = spawnSync("git", ["merge", "--no-ff", "--no-edit", "upstream/main"], { cwd: root, stdio: "inherit" });
  if (merge.status !== 0) {
    const unresolved = resolveDeletedByUs();
    if (unresolved.length > 0) {
      logger.error(
        `\nResolve these by the rules in HOLEAI-FORK.md, \`git add\` them, then run this script with --continue:\n${unresolved.join("\n")}`,
      );
      process.exit(1);
    }
    git("commit", "--no-edit");
  }
} else if (
  git("status", "--porcelain")
    .split("\n")
    .some((line) => /^(UU|AA|DU|UD|AU|UA|DD) /u.test(line))
) {
  logger.error("Some conflicts are still unresolved.");
  process.exit(1);
} else if (spawnSync("git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"], { cwd: root }).status === 0) {
  git("commit", "--no-edit");
}

const regenerate = `import { Generator, getConfig } from "@tanstack/router-generator";
const root = process.cwd();
const config = getConfig({ target: "solid", routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts", quoteStyle: "single", semicolons: false }, root);
await new Generator({ config, root }).run();`;
spawnSync("bun", ["--eval", regenerate], { cwd: join(root, "apps/auth-api"), stdio: "inherit" });
if (git("status", "--porcelain", "--", "apps/auth-api/src/routeTree.gen.ts") !== "") {
  git(
    "commit",
    "-q",
    "-m",
    "Regenerate the route tree after the upstream merge",
    "--",
    "apps/auth-api/src/routeTree.gen.ts",
  );
}

const checks = [
  run("Fork guard", "bun", ["scripts/holeai-fork-guard.ts"]),
  run("Type check", "bun", ["run", "typecheck"]),
  run("auth-api tests", "bun", ["run", "test:api"]),
];
if (checks.every(Boolean)) {
  logger.info(
    `\nThe sync passed. Review it, then: git switch ${BASE} && git merge --ff-only ${git("branch", "--show-current")}`,
  );
} else {
  logger.error("\nThe sync needs fixes before it can go into holeai-internal.");
  process.exit(1);
}
