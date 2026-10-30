// Adds a person who may sign in, or gives them a new access code. Run on the VPS from the repository root:
//   bun deploy/vps/add-user.ts someone@holeacquisition.com
//   bun deploy/vps/add-user.ts --remove someone@holeacquisition.com
// It edits AUTH_ACCESS_CODE_HASHES in deploy/vps/auth-api.env and prints the code once. Restart auth-api after:
//   docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env restart auth-api
// With --local it edits .openbot/access-hashes.json for start-local.cmd on this computer instead.
// The person signs in with their email and types the access code where the app asks for the emailed code.

import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ONE_TIME_CODE_ALPHABET, ONE_TIME_CODE_LENGTH } from "../../packages/contracts/src/validation";

const KEY = "AUTH_ACCESS_CODE_HASHES";
const args = process.argv.slice(2);
const local = args.includes("--local");
const remove = args.includes("--remove");
const email = args
  .find((arg) => !arg.startsWith("--"))
  ?.trim()
  .toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
  console.error("Usage: bun deploy/vps/add-user.ts [--local] [--remove] <email>");
  process.exit(1);
}

const envPath = join(import.meta.dir, "auth-api.env");
const localPath = join(import.meta.dir, "../../.openbot/access-hashes.json");
const lines = local ? [] : readFileSync(envPath, "utf8").split("\n");
const index = lines.findIndex((line) => line.startsWith(`${KEY}=`));
const stored = local
  ? existsSync(localPath)
    ? readFileSync(localPath, "utf8")
    : "{}"
  : index === -1
    ? "{}"
    : lines[index].slice(KEY.length + 1);
const hashes: Record<string, string> = JSON.parse(stored.trim() || "{}");

let code: string | null = null;
if (remove) {
  delete hashes[email];
} else {
  // 8 characters from a 32-letter alphabet: 40 bits. The server allows 5 tries per sign-in and limits sign-ins.
  code = [...randomBytes(ONE_TIME_CODE_LENGTH)].map((byte) => ONE_TIME_CODE_ALPHABET[byte & 31]).join("");
  hashes[email] = createHash("sha256").update(code).digest("base64url");
}

if (local) {
  mkdirSync(dirname(localPath), { recursive: true });
  writeFileSync(localPath, JSON.stringify(hashes), { mode: 0o600 });
} else {
  const line = `${KEY}=${JSON.stringify(hashes)}`;
  if (index === -1) lines.splice(lines.length - (lines.at(-1) === "" ? 1 : 0), 0, line);
  else lines[index] = line;
  writeFileSync(envPath, lines.join("\n"), { mode: 0o600 });
}

if (code)
  console.log(
    `${email} can sign in with access code ${code.slice(0, 4)}-${code.slice(4)}. It is not stored; save it now.`,
  );
else console.log(`${email} can no longer sign in. Their open sessions end when you revoke them in the app.`);
console.log(local ? "Restart start-local.cmd to apply." : "Restart auth-api to apply.");
