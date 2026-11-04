# Run your own HoleBot

This copy of HoleBot is set up for its first owner's server. Follow these steps to run it on yours:
your own website, sign-in and relay, with your own desktop app pointed at them.

You need:

- **A VPS:** Ubuntu 24.04, 4 vCPU, 8 GB memory, 40 GB+ disk.
- **A domain** where you can add DNS records. Below, `bot.example.com` stands for the name you pick.
- **A PC** to build the desktop app: Windows, macOS or Linux, with [Bun](https://bun.sh) and Git.

## 1. Get the code and point it at your domain

On your PC:

```sh
git clone https://github.com/goldisgold1/holebot.git
cd holebot
bun scripts/holebot-set-domain.ts bot.example.com --org example.com
```

`--org` is your email domain. Every account with an email on it shares the others' servers, which is how a
team sees each other's agents. Leave it out if you are on your own.

The script rewrites the ~18 files that name the server: the desktop and phone apps, invite links and server
config. `bun scripts/holebot-set-domain.ts --check` shows where it points now. Commit the change and push it
to your own repository:

```sh
git commit -am "Point HoleBot at bot.example.com"
```

## 2. DNS

At your DNS provider, add three **A records**, all pointing to the VPS's public IPv4 address:

| Name | Points to |
|---|---|
| `bot.example.com` | VPS IP |
| `api.bot.example.com` | VPS IP |
| `signal.bot.example.com` | VPS IP |

If your provider has a proxy (Cloudflare's orange cloud), turn it **off** for these. The server gets its own
HTTPS certificates and needs the direct connection.

## 3. The server

On the VPS, as root, clone **your** copy from step 1 (the one with your domain) and run the setup:

```sh
git clone <your repository> /opt/holeai-bot && cd /opt/holeai-bot
bash deploy/vps/bootstrap.sh you@example.com
```

It installs Docker and Bun, opens the firewall, makes fresh secrets, checks your DNS, and starts everything.
The first build takes 10–20 minutes. At the end it prints:

- **Your access code.** It's shown once and saved in `/root/holeai-first-access-code.txt`. You sign in with
  your email, then type this code where the app asks for the emailed code.
- **The web app** at `https://bot.example.com/app`.

Back up `deploy/vps/.env` and `deploy/vps/auth-api.env` somewhere private. New keys sign everyone out.

To add someone: `bun deploy/vps/add-user.ts friend@example.com`, then
`docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env restart auth-api`. Send them the code it
prints.

## 4. The desktop app

On your PC, in the folder from step 1:

```sh
bun install
bun run dist:win      # Windows installer, in dist/
bun run dist:mac      # or macOS
bun run dist:linux    # or Linux AppImage
```

Install it, sign in with your email and access code, and your PC appears as a server your agents run on.

## 5. The agent team (optional)

To start with the HoleA.I team (Chief of Staff, Producer, Analyst, Rosie and six more), import
`deploy/team/holeai-team-import.zip`: see [TEAM-TEMPLATES.md](TEAM-TEMPLATES.md).

## 6. Phones (optional)

- **Any phone, in the browser:** run `bash deploy/vps/build-mobile-web.sh` on the VPS. The phone app is then
  at `https://bot.example.com/m/`.
- **Android app:** build `apps/mobile` with Expo (`bunx expo prebuild`, then Gradle). It needs about 10 GB free
  disk and plenty of memory. Don't build it on the VPS that runs the server: it can run out of memory there.

## What to skip

Some parts are for the first owner's own business systems (hole.fm, the Grok bots, the Reels board). They do
nothing useful without those, so skip them:

- `deploy/vps/setup-team-relay.sh`, `add-wake-hook.ts`, `switch-holefm-wakes.sh`,
  `finish-move.sh`, and `setup-team.sh` except `--models-only`
- The **Reel Factories** board in the app. It links to the first owner's site and asks you to sign in there.
- `bootstrap.sh --agents` is optional: it runs agents 24/7 on the VPS instead of your PC.

## Updating

Pull the new code into your copy, run `bun scripts/holebot-set-domain.ts bot.example.com` again if the merge
brought the old domain back, then on the VPS run `git pull` and `bash deploy/vps/bootstrap.sh you@example.com`.
It keeps your secrets, people and data.
