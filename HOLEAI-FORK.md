# HoleA.I fork of OpenBot

`holeai-internal` is HoleA.I's internal version of OpenBot. It follows `nightly-labs/openbot` (the
`upstream` remote, fetch only: its push URL is disabled) and keeps the changes below on top.

## Weekly sync

```sh
bun scripts/holeai-sync-upstream.ts
```

1. It fetches `upstream/main` and lists the new upstream commits.
2. It merges them into a new `sync/upstream-<date>` branch, never into `holeai-internal` directly.
3. Conflicts on files this fork deleted resolve as deleted. Any other conflict stops the script and
   is listed; resolve it by the rules below, then run the script again with `--continue`.
4. It runs `scripts/holeai-fork-guard.ts`, which fails if the merge brought back something this fork
   removed, then the type check and the auth-api tests.
5. When everything passes, merge the sync branch into `holeai-internal` and rebuild (`bun run dist:win`
   from PowerShell, not Git Bash: Git Bash's `tar` breaks the voice runtime step).

## What this fork changes, and how to keep it through a merge

| Area | HoleA.I version | When upstream changes it |
|---|---|---|
| License | MIT, copyright HoleA.I (`LICENSE`, `NOTICE`, `package.json`, podspecs, Nix, Docker label) | Keep ours |
| Synthetify names, CLA, Azure Windows signing | Removed | Keep removed |
| Paid commercial license | Removed everywhere (no `packages/contracts/src/license.ts`, no license service, no license UI or i18n keys) | Drop any new license code; keep the rest of the change |
| Public website and legal pages | Removed. Kept routes: `/app`, `/app-preview`, `/join`, `/agents/*`, `/billing/return`, `/report-site`, `/health`, `/.well-known`, `/v1`, `/v2`, `/slack`, `/discord`, `/api` | Drop new website pages and content; regenerate `routeTree.gen.ts` |
| Sign-in | Access codes: `AUTH_ACCESS_CODE_HASHES` in `auth-service.ts` and `request-auth.ts`; English sign-in text says "access code" | Keep the access-code branch in `start` |
| Backend addresses | `bot.hole.fm`, `api.bot.hole.fm`, `signal.bot.hole.fm` (`invite-links.ts`, `agent-template-links.ts`, `plugin-links.ts`, `remote-directory.ts`, `application-services.ts`, `wrangler.jsonc`) | Keep ours |
| Analytics and failure reports | Off: `packages/telemetry/src/transport.ts` sends nothing without an endpoint; desktop gates need a capture URL; website analytics is a no-op | Keep off |
| Auto-update | Off: `publish: null` in `electron-builder.yml` | Keep off |
| Member limit without a plan | 100 (`DEFAULT_TEAM_MEMBER_LIMIT`) | Keep ours |
| Community card and links | Card hidden; Discord, X, changelog and guides links go to hole.fm | Keep ours |
| Deployment | `deploy/vps` (VPS), `start-local.cmd` and `open-local-app.cmd` (local test) | HoleA.I only |
