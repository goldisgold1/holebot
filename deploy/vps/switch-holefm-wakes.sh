#!/usr/bin/env bash
# Points hole.fm's wakes at the OpenBot agents on the VPS, one bot at a time, from a computer with SSH to both:
#   bash deploy/vps/switch-holefm-wakes.sh producer [publisher analyst ...]
# It pipes /root/holefm-wake-lines/<bot> (made by setup-team.sh) into `core.wake_config set <bot>` on hole.fm, so
# the key is never printed, then sends one harmless probe. Pause the matching Grok routine afterwards.
# Back to Grok: on hole.fm, `python3 -m core.wake_config set <bot>` with the Grok routine's URL and key.
set -euo pipefail
KEY=${SSH_KEY:-$HOME/.ssh/openclaw_nerve_vps}
BOT_VPS=${BOT_VPS:-root@75.119.140.66}
HOLEFM_VPS=${HOLEFM_VPS:-root@194.233.80.34}
[ "$#" -ge 1 ] || { echo "Usage: bash deploy/vps/switch-holefm-wakes.sh <bot> [<bot> ...]" >&2; exit 1; }
for bot in "$@"; do
  [[ $bot =~ ^[a-z_]+$ ]] || { echo "Not a bot id: $bot" >&2; exit 1; }
  ssh -i "$KEY" -o BatchMode=yes "$BOT_VPS" "test -s /root/holefm-wake-lines/$bot && cat /root/holefm-wake-lines/$bot" |
    ssh -i "$KEY" -o BatchMode=yes "$HOLEFM_VPS" \
      "cd /home/admin/reels-expert && python3 -m core.wake_config set $bot >/dev/null && python3 -m core.wake_config probe $bot"
  echo "$bot now wakes OpenBot."
done
