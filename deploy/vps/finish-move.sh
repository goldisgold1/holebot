#!/usr/bin/env bash
# The last step of the move, from a computer with SSH to both VPSs, once Claude and the MCP servers are signed in on
# the VPS agent server: sets the agents' models, then switches hole.fm's wakes from Grok to the VPS agents.
#   bash deploy/vps/finish-move.sh                 the Producer only (the first bot to switch)
#   bash deploy/vps/finish-move.sh all             every bot
#   bash deploy/vps/finish-move.sh producer rosie  the bots named
set -euo pipefail
cd "$(dirname "$0")/../.."
KEY=${SSH_KEY:-$HOME/.ssh/openclaw_nerve_vps}
BOT_VPS=${BOT_VPS:-root@75.119.140.66}
bots=("$@")
[ "${#bots[@]}" -gt 0 ] || bots=(producer)
[ "${bots[0]}" = all ] && bots=(producer publisher analyst strategist story_maker rosie chief carousel_maker)

echo "== Models on the VPS agent server"
models=$(ssh -i "$KEY" -o BatchMode=yes "$BOT_VPS" 'cd /opt/holeai-bot && bash deploy/vps/setup-team.sh --models-only 2>&1')
echo "$models"
if grep -q "Some models were not set" <<<"$models"; then
  echo "Claude is not connected on the server yet, so the wakes stay on Grok." >&2
  exit 1
fi

echo "== hole.fm wakes"
bash deploy/vps/switch-holefm-wakes.sh "${bots[@]}"
