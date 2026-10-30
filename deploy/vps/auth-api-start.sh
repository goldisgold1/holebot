#!/bin/sh
# Applies the D1 migrations, then serves the built Worker on port 3100. State lives in /data.
set -eu
cd /app/apps/auth-api
built_config=$(ls dist/*/wrangler.json | head -n 1)
bunx wrangler d1 migrations apply openbot-auth --local --persist-to /data
# --test-scheduled exposes /__scheduled, which the `scheduler` service calls every 5 minutes in place
# of the Cloudflare cron. Caddy refuses that path from outside.
exec bunx wrangler dev --config "$built_config" --local --persist-to /data \
  --ip 0.0.0.0 --port 3100 --test-scheduled --env-file /run/auth-api.env --show-interactive-dev-session=false
