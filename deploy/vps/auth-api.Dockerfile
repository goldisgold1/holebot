# The HoleA.I control plane (`apps/auth-api`) on a VPS. Cloudflare runs it as a Worker; here the same
# Worker runs in workerd through `wrangler dev`, with D1 and R2 persisted on the `auth-data` volume.
# workerd needs glibc, so this image is Debian, not Alpine.
FROM oven/bun:1.4.2 AS build
WORKDIR /app
COPY . .
# --ignore-scripts skips the root postinstall, which downloads Electron for the desktop app.
RUN bun install --frozen-lockfile --ignore-scripts --filter @openbot/auth-api
# The Vite build of the Worker needs a large heap. Give the VPS at least 8 GB of memory, or swap.
RUN cd apps/auth-api && NODE_OPTIONS=--max-old-space-size=6144 bun run build

FROM oven/bun:1.4.2
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
COPY deploy/vps/auth-api-start.sh /usr/local/bin/auth-api-start
RUN chmod +x /usr/local/bin/auth-api-start
EXPOSE 3100
CMD ["auth-api-start"]
