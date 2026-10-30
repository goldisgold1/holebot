#!/bin/bash
# From the PC (Git Bash): sends the committed holeai-internal code to a new VPS and runs bootstrap.sh there.
#   bash deploy/vps/ship.sh root@<VPS IP> <owner email> [--agents] [ssh key file]
# Run it again after a weekly sync to update the VPS: it keeps secrets, people and data.
set -euo pipefail
cd "$(dirname "$0")/../.."
TARGET="${1:?usage: ship.sh root@<ip> <owner email> [--agents] [ssh key]}"
OWNER="${2:?usage: ship.sh root@<ip> <owner email> [--agents] [ssh key]}"
AGENTS=""; KEY=""
for arg in "${@:3}"; do
  if [ "$arg" = "--agents" ]; then AGENTS="--agents"; else KEY="$arg"; fi
done
SSH=(ssh -o StrictHostKeyChecking=accept-new); SCP=(scp -o StrictHostKeyChecking=accept-new)
if [ -n "$KEY" ]; then SSH+=(-i "$KEY"); SCP+=(-i "$KEY"); fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit your changes first: the VPS gets the committed holeai-internal branch."
  exit 1
fi
BUNDLE=$(mktemp -d)/holeai.bundle
git bundle create "$BUNDLE" holeai-internal >/dev/null
"${SCP[@]}" "$BUNDLE" "$TARGET:/root/holeai.bundle"
# Secrets made on an earlier run stay in /opt/holeai-bot/deploy/vps: they are ignored by git, so the
# checkout update below leaves them alone.
"${SSH[@]}" "$TARGET" "set -e
  command -v git >/dev/null || (apt-get update -qq && apt-get install -y -qq git >/dev/null)
  if [ -d /opt/holeai-bot/.git ]; then
    cd /opt/holeai-bot && git fetch -q /root/holeai.bundle holeai-internal:refs/remotes/bundle/holeai-internal && git checkout -q -B holeai-internal bundle/holeai-internal
  else
    git clone -q -b holeai-internal /root/holeai.bundle /opt/holeai-bot
  fi
  bash /opt/holeai-bot/deploy/vps/bootstrap.sh '$OWNER' $AGENTS"
