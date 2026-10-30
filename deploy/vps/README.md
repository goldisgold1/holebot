# HoleA.I backend on a VPS

The whole backend runs on one VPS with Docker Compose:

| Service | What it does |
|---|---|
| `caddy` | HTTPS for `bot.hole.fm`, `api.bot.hole.fm` and `signal.bot.hole.fm` (Let's Encrypt, automatic) |
| `auth-api` | Accounts, sign-in, servers, invites, the web app. The Cloudflare Worker from `apps/auth-api`, run in workerd. D1 and R2 are files on the `auth-data` volume. |
| `scheduler` | Calls the Worker's 5-minute job (Cloudflare's cron does it on Cloudflare) |
| `remote-api` | Signal: the relay between the apps and the PCs, and the Slack, Discord and Telegram webhooks |
| `coturn` | TURN, for phones and networks that cannot connect directly |

## 1. The VPS

Ubuntu 24.04, 4 vCPU, 8 GB memory, 40 GB+ disk. The Worker build needs about 6 GB of memory.

Open these ports in the provider firewall: 80/tcp, 443/tcp, 3478/tcp+udp, 49152-65535/udp (TURN relay).

```sh
curl -fsSL https://get.docker.com | sh
git clone <your HoleA.I repository> /opt/holeai-bot && cd /opt/holeai-bot
curl -fsSL https://bun.sh/install | bash   # only for the two scripts below
```

## 2. DNS

A records on `hole.fm`, all to the VPS address: `bot`, `api.bot`, `signal.bot`.

## 3. Secrets and people

```sh
bun deploy/vps/make-secrets.ts <VPS public IPv4>   # writes deploy/vps/.env and deploy/vps/auth-api.env
bun deploy/vps/add-user.ts vincent@holeacquisition.com   # prints that person's access code once
```

Sign-in has no email: each person types their access code where the app asks for the emailed code.
`--remove <email>` takes a person out. Restart `auth-api` after each change.

Back up both env files somewhere private. New ticket keys sign everyone out and stop every connected PC.

## 4. Start

```sh
docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env up -d --build
docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env logs -f auth-api remote-api
curl https://api.bot.hole.fm/.well-known/jwks.json
```

## 5. Point the apps at it

Packaged desktop builds already use `https://api.bot.hole.fm` and `wss://signal.bot.hole.fm/v1/signal`.
To try another backend, start the app with `OPENBOT_AUTH_API_URL` and `OPENBOT_REMOTE_SIGNAL_URL`.

## Backups

The data is the `holeai-bot_auth-data` volume (accounts, servers, invites, files) plus the two env files:

```sh
docker run --rm -v holeai-bot_auth-data:/data -v "$PWD":/backup alpine tar czf /backup/auth-data.tgz -C /data .
```
