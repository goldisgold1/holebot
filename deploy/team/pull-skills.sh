#!/bin/bash
# Refreshes deploy/team/source-skills/ from hole.fm, then rebuild the import: bun deploy/team/build-team-import.ts
# Run from the repository root on a computer with the hole.fm VPS key (~/.ssh/openclaw_nerve_vps).
set -eu
KEY="${HOLEFM_SSH_KEY:-$HOME/.ssh/openclaw_nerve_vps}"
HOST="${HOLEFM_HOST:-root@194.233.80.34}"
DIR="$(dirname "$0")/source-skills"
mkdir -p "$DIR"
for s in grok-team-rules grok-chief-of-staff grok-strategist grok-producer grok-publisher grok-analyst grok-growth \
  grok-story-maker grok-image-producer grok-rosie grok-problems-and-triage grok-warmup reels-factory-worker \
  reels-carousel-factory carousel-intelligence; do
  scp -q -i "$KEY" "$HOST:/opt/hole-mcp/skills/files/$s.md" "$DIR/$s.md"
  echo "pulled $s"
done
