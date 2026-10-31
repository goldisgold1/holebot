#!/usr/bin/env bash
# Builds the phone app (apps/mobile) for the web and puts it where Caddy serves it: https://<site>/m/.
# Run on the VPS from the repository root. It builds in a throwaway Bun + Node container, in a copy of the
# repository, so neither this checkout nor the PC does the work.
set -euo pipefail
cd "$(dirname "$0")/../.."
work=/root/mobile-build
mkdir -p "$work" /root/mobile-web-out
tar --exclude=node_modules --exclude=.git --exclude=dist -cf - . | tar -xf - -C "$work"
# The app ships for iOS and Android; the web build adds the platform and serves under /m.
sed -i 's/"platforms": \["ios", "android"\]/"platforms": ["ios", "android", "web"]/' "$work/apps/mobile/app.json"
grep -q '"baseUrl": "/m"' "$work/apps/mobile/app.json" ||
  sed -i 's#      "reactCompiler": true#      "reactCompiler": true,\n      "baseUrl": "/m"#' "$work/apps/mobile/app.json"
rm -rf /root/mobile-web-out/web
docker run --rm -v "$work:/src" -v /root/mobile-web-out:/out oven/bun:1.4.2 bash -c '
  set -e
  apt-get update -qq && apt-get install -y -qq ca-certificates curl gnupg >/dev/null
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null && apt-get install -y -qq nodejs >/dev/null
  test -d /src/node_modules || (cd /src && bun install --frozen-lockfile --ignore-scripts)
  cd /src/apps/mobile && NODE_OPTIONS=--max-old-space-size=4096 npx expo export --platform web --output-dir /out/web'
# Replace the contents, not the folder: Caddy bind-mounts this folder and would keep the deleted one.
mkdir -p deploy/vps/mobile-web && find deploy/vps/mobile-web -mindepth 1 -delete && cp -r /root/mobile-web-out/web/. deploy/vps/mobile-web/
echo "Built. Caddy serves it at /m/ (restart caddy the first time: docker compose ... up -d caddy)."
