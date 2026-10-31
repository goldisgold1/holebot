# The HoleA.I control plane (`apps/auth-api`) on a VPS. Cloudflare runs it as a Worker; here the same
# Worker runs in workerd through `wrangler dev`, with D1 and R2 persisted on the `auth-data` volume.
# workerd needs glibc, so this image is Debian, not Alpine.
FROM oven/bun:1.4.2 AS build
# Vite and wrangler are Node programs: without Node in the image, `bun run` runs them on Bun, and Vite then
# cannot load its config ("Cannot find package 'vite-module-runner:import-meta-resolve'"). The repo wants Node 24.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
  && apt-get install -y --no-install-recommends nodejs && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
# The web app at /app is built from the desktop renderer, so the build needs every workspace package.
# --ignore-scripts skips the root postinstall, which downloads Electron for the desktop app.
RUN bun install --frozen-lockfile --ignore-scripts
# The Vite build of the Worker needs a large heap. Give the VPS at least 8 GB of memory, or swap.
RUN cd apps/auth-api && NODE_OPTIONS=--max-old-space-size=6144 bun run build

FROM oven/bun:1.4.2
WORKDIR /app
# wrangler (run through bunx by auth-api-start) needs Node too.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
  && apt-get install -y --no-install-recommends nodejs && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
COPY deploy/vps/auth-api-start.sh /usr/local/bin/auth-api-start
RUN chmod +x /usr/local/bin/auth-api-start
EXPOSE 3100
CMD ["auth-api-start"]
