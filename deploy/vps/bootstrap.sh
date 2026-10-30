#!/bin/bash
# Sets up the HoleA.I backend (and with --agents, the 24/7 agent server) on a fresh Ubuntu 24.04 VPS.
# deploy/vps/ship.sh runs it for you from the PC. To run it by hand, as root, from the repository folder:
#   bash deploy/vps/bootstrap.sh <owner email> [--agents]
# It is safe to run again: it keeps existing secrets, people and data.
set -euo pipefail
cd "$(dirname "$0")/../.."
ROOT=$(pwd)
OWNER="${1:?usage: bootstrap.sh <owner email> [--agents]}"
AGENTS=false; [ "${2:-}" = "--agents" ] && AGENTS=true
COMPOSE=(docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env)
say() { printf '\n== %s\n' "$*"; }

say "System packages, Docker and Bun"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git unzip dnsutils ufw >/dev/null
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
export BUN_INSTALL=/root/.bun PATH=/root/.bun/bin:$PATH
command -v bun >/dev/null || curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.2"

say "Swap (the Worker and app builds need about 6 GB of memory)"
if [ "$(swapon --show --noheadings | wc -l)" = 0 ]; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Firewall: SSH, HTTP(S), TURN"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw allow 3478/tcp >/dev/null; ufw allow 3478/udp >/dev/null; ufw allow 5349/tcp >/dev/null
ufw allow 49152:65535/udp >/dev/null
ufw --force enable >/dev/null

PUBLIC_IP=$(curl -fsS -4 https://api.ipify.org)
say "Secrets (public IP $PUBLIC_IP)"
[ -f deploy/vps/.env ] || bun deploy/vps/make-secrets.ts "$PUBLIC_IP"
[ -f deploy/vps/wake-hooks.json ] || echo '{}' > deploy/vps/wake-hooks.json

say "DNS: the three names must point here before Caddy can get certificates"
set -a; . deploy/vps/.env; set +a
for name in "$SITE_DOMAIN" "$API_DOMAIN" "$SIGNAL_DOMAIN"; do
  got=$(dig +short A "$name" @1.1.1.1 | tail -n1)
  if [ "$got" != "$PUBLIC_IP" ]; then
    echo "  $name points to '${got:-nothing}', not $PUBLIC_IP. Add an A record for it, wait a few minutes, run this again."
    exit 1
  fi
  echo "  $name -> $got"
done

say "People who can sign in"
if ! grep -q "\"$OWNER\"" deploy/vps/auth-api.env; then
  bun deploy/vps/add-user.ts "$OWNER" | tee /root/holeai-first-access-code.txt
  chmod 600 /root/holeai-first-access-code.txt
fi

say "Backend: build and start (the first build takes 10-20 minutes)"
"${COMPOSE[@]}" up -d --build
for i in $(seq 1 90); do
  curl -fsS -m 5 "https://$API_DOMAIN/.well-known/jwks.json" >/dev/null 2>&1 && break
  sleep 10
done
curl -fsS -m 10 "https://$API_DOMAIN/.well-known/jwks.json" >/dev/null || { echo "The API did not come up over HTTPS. Check: ${COMPOSE[*]} logs caddy auth-api"; exit 1; }
curl -fsS -m 10 -o /dev/null "https://$SITE_DOMAIN/app" && echo "  https://$SITE_DOMAIN/app is up"
code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST "https://$API_DOMAIN/v1/auth/email/start" -H 'content-type: application/json' -d '{"email":"not-a-member@example.com"}')
[ "$code" = 403 ] && echo "  access codes are on: an unknown email gets 403"

if $AGENTS; then
  say "24/7 agent server: build and start (the first build takes 20-40 minutes)"
  "${COMPOSE[@]}" --profile agents up -d --build agents
  echo "  Sign it in once:  cd $ROOT && ${COMPOSE[*]} exec agents openbot login"
fi

say "Done"
echo "  Web app:      https://$SITE_DOMAIN/app"
echo "  First access code (shown once, also in /root/holeai-first-access-code.txt): see above"
echo "  Add a person: bun deploy/vps/add-user.ts <email>, then ${COMPOSE[*]} restart auth-api"
echo "  Back up deploy/vps/.env, deploy/vps/auth-api.env and deploy/vps/wake-hooks.json somewhere private."
