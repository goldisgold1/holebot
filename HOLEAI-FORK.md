# HoleA.I fork of OpenBot

`holeai-internal` is HoleA.I's internal version of OpenBot. It follows `nightly-labs/openbot` (the
`upstream` remote, fetch only: its push URL is disabled) and keeps the changes below on top.

## Weekly sync

```sh
bun scripts/holeai-sync-upstream.ts
```

1. It fetches upstream and takes the newest released version (a `vX.Y.Z` tag). With no new version it
   stops: there is nothing to update. `--main` takes unreleased upstream `main` instead.
2. It merges that version into a new `sync/upstream-<version>` branch, never into `holeai-internal` directly.
3. Conflicts on files this fork deleted resolve as deleted. Any other conflict stops the script and
   is listed; resolve it by the rules below, then run the script again with `--continue`.
4. It runs `scripts/holeai-rebrand.ts` and commits what that renamed (see "HoleBot name" below), then
   `scripts/holeai-fork-guard.ts`, which fails if the merge brought back something this fork
   removed, then the type check and the auth-api tests.
5. When everything passes, merge the sync branch into `holeai-internal` and rebuild (`bun run dist:win`
   from PowerShell, not Git Bash: Git Bash's `tar` breaks the voice runtime step).

## What this fork changes, and how to keep it through a merge

| Area | HoleA.I version | When upstream changes it |
|---|---|---|
| License | MIT, copyright HoleA.I (`LICENSE`, `NOTICE`, `package.json`, podspecs, Nix, Docker label) | Keep ours |
| Synthetify names, CLA, Azure Windows signing | Removed | Keep removed |
| Paid commercial license | Removed everywhere (no `packages/contracts/src/license.ts`, no license service, no license UI or i18n keys) | Drop any new license code; keep the rest of the change |
| Public website and legal pages | Removed. Kept routes: `/app`, `/app-preview`, `/join`, `/agents/*`, `/billing/return`, `/report-site`, `/health`, `/.well-known`, `/v1`, `/v2`, `/slack`, `/discord`, `/api`. When upstream adds `routes/v1/mobile/changelog.ts` (the mobile release notes), restore `lib/changelog.ts` and `lib/changelog-releases.ts` from upstream: that route needs them | Drop new website pages and content, but keep what an app route imports; regenerate `routeTree.gen.ts` |
| Sign-in | Access codes: `AUTH_ACCESS_CODE_HASHES` in `auth-service.ts` and `request-auth.ts`; English sign-in text says "access code" | Keep the access-code branch in `start` |
| Backend addresses | `bot.holeacquisition.com`, `api.bot.holeacquisition.com`, `signal.bot.holeacquisition.com` (`invite-links.ts`, `agent-template-links.ts`, `plugin-links.ts`, `remote-directory.ts`, `application-services.ts`, `wrangler.jsonc`) | Keep ours |
| Analytics and failure reports | Off: `packages/telemetry/src/transport.ts` sends nothing without an endpoint; desktop gates need a capture URL; website analytics is a no-op | Keep off |
| Auto-update | Off: `publish: null` in `electron-builder.yml` | Keep off |
| Member limit without a plan | 100 (`DEFAULT_TEAM_MEMBER_LIMIT`) | Keep ours |
| Community card and links | Card hidden; Discord, X, changelog and guides links go to hole.fm | Keep ours |
| Deployment | `deploy/vps` (VPS), `start-local.cmd` and `open-local-app.cmd` (local test) | HoleA.I only |
| Product name | HoleBot in what people see; OpenBot inside (see "HoleBot name") | Keep ours; the sync renames new text |

## HoleBot name

People see **HoleBot** in the desktop app, the web app and the phone app. Inside, the code keeps
OpenBot's names, so upstream changes still merge line for line.

**Renamed by a script.** `bun scripts/holeai-rebrand.ts` renames OpenBot to HoleBot in every
translation catalog (`packages/i18n/src/messages/**`) and in the What's new notes
(`src/renderer/src/features/updates/whats-new-releases.json`). It renames the name only where it
stands as a word: catalog keys such as `island.action.reviewInOpenBot` stay, and so does `@OpenBot`.
The sync runs it after each merge, and the fork guard fails while it would still change something
(`--check`). In a catalog conflict, take upstream's text (keeping any HoleA.I wording from the table
above); the script renames it again.

**Renamed by hand** (the fork guard checks the main ones):
- `package.json` and `electron-builder.yml` `productName`: the window, the installer, the Start menu
  entry and `HoleBot.exe`. Also the `openbot://` description in `build/installer.nsh` and the macOS
  permission sentences.
- `src/main/index.ts`: `app.setName("HoleBot")` and the notification titles (also
  `ipc/notification-handlers.ts`).
- `src/renderer/*.html` titles; `apps/auth-api/src/routes/app.tsx` ("HoleBot web") and the other kept
  routes' titles; `apps/auth-api/public/site.webmanifest` name and short_name.
- `apps/mobile/app.json` `name` and its permission sentences; the mobile About name, default server
  name, support log, share error and the Android notification title.
- Product-name constants and English messages in `src/main`, `src/renderer`, `packages/ui`,
  `packages/brand` (`AppLogo` label), `packages/contracts` (link errors, "Included with HoleBot") and
  the auth-api emails, push title and errors. English that a host sends and a screen translates must
  read exactly like its catalog entry, so a message renamed in a catalog is renamed in the code too.
- `open-holeai-app.cmd`, `open-local-app.cmd` (they still open an older `OpenBot.exe` build),
  `scripts/verify-windows-package.ts` and `scripts/verify-linux-package.ts`.

**Stays OpenBot, on purpose:**
- Data on disk. Electron names the data folder after `productName`, so `src/main/index.ts` pins a
  packaged app to `%APPDATA%\OpenBot`: renaming it would lose every account, agent and setting. Also
  `~/OpenBot` (agent workspaces and "OpenBot Shared"), `openbot.db`, the provider runtime and dev
  folders, and the installer's checks for those folders.
- Names other programs look up: the 1Password vault and Bitwarden folder "Shared with OpenBot" (the
  script keeps that phrase), the `@OpenBot` Slack, Discord and Telegram handle and the Slack and
  Discord app manifests, the agent-import prompt "Export my agents for OpenBot" (the import skills
  answer to it), ACP `clientInfo`, `User-Agent`, and the `OpenBot-*` / `X-OpenBot-*` headers.
- Identifiers: `appId: app.openbot.desktop` (also the Windows AppUserModelId), so the HoleBot
  installer updates an installed OpenBot in place and keeps its login item and notifications; the
  `openbot://` scheme; package names `@openbot/*` and `name: openbot`; mobile bundle ids
  (`run.openbot.mobile`), slug and scheme; `OPENBOT_*` variables; IPC channels; CSS classes and
  `--openbot-*` tokens; file and type names.
- Text people rarely or never read: logs and diagnostics, agent instructions and tool descriptions in
  `src/backend`, marketplace plugin descriptions (generated from `marketplace/plugin-catalog`),
  stories and preview fixtures, macOS host scripts (`/Applications/OpenBot.app`), podspecs, docs,
  READMEs and changelogs, and the removed website's leftover copy (`landing-faq.ts`,
  `landing-links.ts`).

**Icons.** `bun scripts/holeai-icons.ts` draws every icon from one drawing: a dark hole.fm tile with
a soft bot token turned a little, like Grok Bot's, with two dark pill eyes like the agent faces. The
token takes the logo color, so the dev (gold) and preview (green) builds and each logo color are the
same drawing. It writes `build/icon*.png|ico|icns|svg` (Windows icons hold 16 to 256 px, with a
bolder drawing up to 48 px), `build/logo-colors/`, the `build/icon-production.icon` and
`apps/mobile/assets/icons/app-icon.icon` layers, the phone app and notification icons, and the web
favicons. The window and tray icons read `build/icon-<variant>.png`. On a Mac, run
`bun scripts/compile-macos-icon.ts` to remake `build/macos/Assets.car` (macOS 26 still shows the old
icon until then). When upstream changes an icon, keep ours or run the script again.

A development run (`app.isPackaged` false) uses the Windows AppUserModelId
`app.openbot.desktop.dev` (`src/main/index.ts`). Windows draws a taskbar button from the Start menu
shortcut with the app's id, and a dev `Electron.lnk` with the release id gave the installed app the
Electron icon.
