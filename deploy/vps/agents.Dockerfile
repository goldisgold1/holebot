# The HoleA.I 24/7 agent server: the Linux build of this repository as a headless OpenBot server, the same
# container as docker/Dockerfile, but built from source on the VPS (this build has HoleA.I's backend
# addresses, no analytics and no auto-update). The first stage makes the AppImage the way the release
# workflow's linux job does; it needs about 6 GB of memory and 15 GB of disk while it runs.
ARG BASE=ubuntu:24.04@sha256:a853f94d226358a79c740cfc7bce0c289748f3fe3488d921d038ccd752c61b60

FROM oven/bun:1.4.2 AS appimage
RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates curl xz-utils unzip tar \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
# The root postinstall also installs git hooks and stamps a dev install; the image needs only Electron.
RUN bun install --frozen-lockfile --ignore-scripts && bun scripts/install-electron.ts
RUN bun scripts/install-codex-runtime.ts linux x64 \
  && bun scripts/install-claude-runtime.ts linux x64 \
  && bun scripts/install-grok-runtime.ts linux x64
RUN NODE_OPTIONS=--max-old-space-size=6144 bun run dist:linux && cp dist/*.AppImage /OpenBot.AppImage

FROM ${BASE} AS release
COPY --from=appimage /OpenBot.AppImage /tmp/OpenBot.AppImage
WORKDIR /tmp
RUN chmod 0700 OpenBot.AppImage \
  && ./OpenBot.AppImage --appimage-extract >/dev/null \
  && chmod -R u+rwX,go=rX squashfs-root \
  && test -x squashfs-root/resources/hosting/openbot-container

# From here on, the same as docker/Dockerfile.
FROM ${BASE}
ARG DEBIAN_FRONTEND=noninteractive
COPY --from=release /tmp/squashfs-root/resources/hosting/packages.txt /tmp/packages.txt
RUN apt-get update \
  && sed -e '/^#/d' -e '/^$/d' -e '/^apparmor$/d' /tmp/packages.txt \
    | xargs apt-get install --yes --no-install-recommends \
      git less openssh-client procps ripgrep tini unzip xz-utils \
  && rm -rf /var/lib/apt/lists/* /tmp/packages.txt
RUN userdel --remove ubuntu \
  && useradd --uid 1000 --user-group --home-dir /data --create-home --shell /bin/bash openbot \
  && install -d -o openbot -g openbot -m 0700 /run/openbot
RUN install -d -m 0755 /var/lib/openbot-update/requests /var/lib/openbot-update/status
COPY --from=release /tmp/squashfs-root /opt/OpenBot/app
RUN install -d -m 0755 /opt/OpenBot/hosted \
  && printf 'container\n' >/opt/OpenBot/hosted/mode \
  && ln -s /opt/OpenBot/app/resources/hosting/openbot /usr/local/bin/openbot
LABEL org.opencontainers.image.title="HoleA.I agents" org.opencontainers.image.licenses=MIT
ENV LANG=C.UTF-8 XDG_RUNTIME_DIR=/run/openbot
USER openbot
WORKDIR /data
VOLUME /data
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/bin/tini", "--", "/opt/OpenBot/app/resources/hosting/openbot-container"]
