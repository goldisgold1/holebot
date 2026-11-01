#!/usr/bin/env bash
# Sets up the team relay, from a computer with SSH to both VPSs: Claude bots (OpenBot) and Grok bots (Grok Bot)
# message each other through the wake bridge (POST /relay/<team>/<bot>, see deploy/vps/wake-bridge/server.ts).
#   bash deploy/vps/setup-team-relay.sh             first setup, or after the Grok routine addresses change
#   bash deploy/vps/setup-team-relay.sh --new-keys  also replaces both teams' send keys (then update the Grok prompt)
# It writes deploy/vps/team-relay.json on the bot VPS (send keys + the Grok routine address and key per bot, taken
# from /root/wake-teams/grok.json on hole.fm, server to server, never printed), the Claude send key and the team-msg
# command into the agents' /data, and the Grok send key to /root/team-relay-grok.key (root only) for the Grok prompt.
set -euo pipefail
KEY=${SSH_KEY:-$HOME/.ssh/openclaw_nerve_vps}
BOT_VPS=${BOT_VPS:-root@75.119.140.66}
HOLEFM_VPS=${HOLEFM_VPS:-root@194.233.80.34}
NEW_KEYS=0
[ "${1:-}" = --new-keys ] && NEW_KEYS=1

# The Grok addresses go from server to server into a root-only file; the remote script reads and removes it.
ssh -i "$KEY" -o BatchMode=yes "$HOLEFM_VPS" 'cat /root/wake-teams/grok.json' |
  ssh -i "$KEY" -o BatchMode=yes "$BOT_VPS" 'umask 077; cat > /root/.team-relay-grok-endpoints.json'
ssh -i "$KEY" -o BatchMode=yes "$BOT_VPS" "NEW_KEYS=$NEW_KEYS bash -s" <<'REMOTE'
set -euo pipefail
cd /opt/holeai-bot/deploy/vps
grok=$(cat /root/.team-relay-grok-endpoints.json)
rm -f /root/.team-relay-grok-endpoints.json
python3 - "$grok" "$NEW_KEYS" <<'PY'
import json, os, secrets, sys
grok, new_keys = json.loads(sys.argv[1]), sys.argv[2] == "1"
path = "team-relay.json"
old = {}
if os.path.exists(path):
    old = json.load(open(path))
senders = old.get("senders") or {}
for team in ("claude", "grok"):
    if new_keys or not senders.get(team):
        senders[team] = f"rly_{team}_" + secrets.token_urlsafe(24)
config = {"senders": senders, "grok": {b: {"url": e["url"], "key": e["key"]} for b, e in grok.items()}}
fd = os.open(path + ".tmp", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as f:
    json.dump(config, f, indent=1)
os.replace(path + ".tmp", path)
fd = os.open("/root/team-relay-grok.key", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as f:
    f.write(senders["grok"] + "\n")
open("/root/.team-relay-claude.key.tmp", "w").write(senders["claude"])
print("grok bots:", ", ".join(sorted(config["grok"])))
PY
# The bridge runs as a non-root user and reads the file through a read-only mount.
chmod 644 team-relay.json

docker exec -i holeai-bot-agents-1 sh -c 'umask 077; mkdir -p /data/.config/team-relay && cat > /data/.config/team-relay/claude.key' < /root/.team-relay-claude.key.tmp
rm -f /root/.team-relay-claude.key.tmp
docker exec -i holeai-bot-agents-1 sh -c 'mkdir -p /data/.local/bin && cat > /data/.local/bin/team-msg && chmod 755 /data/.local/bin/team-msg' <<'CMD'
#!/bin/sh
# team-msg: a Claude bot sends a message to a Grok bot through the team relay.
#   /data/.local/bin/team-msg <grok bot> <your bot id> "text" [--reply-to <message id>] [--hop <n>]
# Grok bots: producer, publisher, analyst, strategist, story_maker, rosie, chief.
# Answer: {"success":true,"runUuid":"<message id>"} or an error (rate_limited, loop_guard_..., grok_unreachable).
set -eu
[ $# -ge 3 ] || { sed -n '3,5p' "$0" >&2; exit 1; }
to=$1 from=$2 text=$3; shift 3
reply="" hop=0
while [ $# -gt 0 ]; do
  case $1 in
    --reply-to) reply=$2; shift 2 ;;
    --hop) hop=$2; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done
case $hop in *[!0-9]*|"") echo "--hop takes a number" >&2; exit 1 ;; esac
esc() { printf '%s' "$1" | tr -d '\000-\010\013\014\016-\037' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g' -e 's/\r//g' | awk 'NR>1{printf "\\n"} {printf "%s", $0}'; }
body=$(printf '{"from":"%s","text":"%s","reply_to":"%s","hop":%s}' "$(esc "$from")" "$(esc "$text")" "$(esc "$reply")" "$hop")
curl -sS -X POST -H "Authorization: Bearer $(cat /data/.config/team-relay/claude.key)" -H "content-type: application/json" \
  --data-binary "$body" "https://bot.holeacquisition.com/relay/grok/$to"
echo
CMD

docker compose -f compose.yaml --env-file .env up -d --force-recreate wake-bridge 2>&1 | tail -1
docker compose -f compose.yaml --env-file .env exec -T caddy caddy reload --config /etc/caddy/Caddyfile 2>&1 | tail -1
REMOTE
echo "Team relay ready. Grok send key: /root/team-relay-grok.key on the bot VPS (for the Grok prompt; never paste it in a chat)."
