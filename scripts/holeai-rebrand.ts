// Renames OpenBot to HoleBot in the text people read (HOLEAI-FORK.md, "HoleBot name").
//   bun scripts/holeai-rebrand.ts           rewrite the translation catalogs and release notes
//   bun scripts/holeai-rebrand.ts --check   list what still says OpenBot, change nothing
// Upstream keeps writing "OpenBot" into these files, so the sync runs this after every merge.
// Hand-made changes outside these files are listed in HOLEAI-FORK.md and checked by the fork guard.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenBotLogger } from "@openbot/logging";

const logger = createOpenBotLogger("holeai-rebrand");

const root = join(import.meta.dir, "..");

export const PRODUCT_NAME = "HoleBot";

/** Files that hold only text: every message catalog and the What's new notes. */
const TEXT_FILES = ["packages/i18n/src/messages", "src/renderer/src/features/updates/whats-new-releases.json"];

/**
 * The product name as a word of its own. Not after a letter or a dot, so catalog keys such as
 * `island.action.reviewInOpenBot` keep their name, and not after `@`: `@OpenBot` is the handle of
 * the Slack, Discord and Telegram bot, which is registered outside this repository. Letters may
 * follow, because Polish and Korean add endings to the name ("OpenBota", "OpenBot을").
 */
const NAME = /(?<![@\w.])OpenBot/gu;

/**
 * Names of things outside the text that keep "OpenBot": the 1Password vault and the Bitwarden folder
 * that the connectors look up by name, and the `~/OpenBot/Shared` folder on disk.
 */
const KEPT = /Shared with (?:OpenBot|HoleBot)|(?:OpenBot|HoleBot) Shared/gu;

/** `english`: also turn "an OpenBot agent" into "a HoleBot agent". German uses "an" as a word of its own. */
export function rebrandText(text: string, english = true): string {
  const renamed = text.replace(new RegExp(`${KEPT.source}|${NAME.source}`, "gu"), (match) =>
    match === "OpenBot" ? PRODUCT_NAME : match.replace(PRODUCT_NAME, "OpenBot"),
  );
  return english ? renamed.replace(/\b([Aa])n HoleBot\b/gu, "$1 HoleBot") : renamed;
}

/** Catalogs of other languages live in `messages/<language>/`. */
function rebrandFile(file: string): string {
  return rebrandText(readFileSync(join(root, file), "utf8"), !/\/messages\/(?!en\/)/u.test(file));
}

export function rebrandedFiles(): string[] {
  return execFileSync("git", ["ls-files", "--", ...TEXT_FILES], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

/** The text files that still name OpenBot where they should say HoleBot. */
export function leftoverNames(): string[] {
  return rebrandedFiles().filter((file) => rebrandFile(file) !== readFileSync(join(root, file), "utf8"));
}

if (import.meta.main) {
  if (process.argv.includes("--check")) {
    const leftovers = leftoverNames();
    if (leftovers.length > 0) {
      logger.error(`Still named OpenBot (run bun scripts/holeai-rebrand.ts):\n${leftovers.join("\n")}`);
      process.exit(1);
    }
    logger.info("Every text file says HoleBot.");
  } else {
    let changed = 0;
    for (const file of rebrandedFiles()) {
      const after = rebrandFile(file);
      if (after === readFileSync(join(root, file), "utf8")) continue;
      writeFileSync(join(root, file), after);
      changed += 1;
    }
    logger.info(`Renamed OpenBot to ${PRODUCT_NAME} in ${changed} file(s).`);
  }
}
