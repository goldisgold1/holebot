#!/usr/bin/env bash
# Sets the HoleA.I team up on the VPS agent server with no app: imports deploy/team/holeai-team-import.zip,
# sets each agent's model, and gives every hole.fm wake bot a webhook routine wired through the wake bridge.
# Run once on the VPS from the repository root, after the server is signed in (`openbot status`):
#   bash deploy/vps/setup-team.sh            (again with --wakes-only for bots whose routine had no URL yet)
# The two lines hole.fm needs per bot go to /root/holefm-wake-lines/<bot> (root only). Switch hole.fm over
# only after Claude and the MCP servers are signed in on the server, or the wakes reach agents that cannot work.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH="$HOME/.bun/bin:$PATH"
C=(docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env)
team() { "${C[@]}" exec -T agents openbot team "$@"; }
wakes_only=false
[ "${1:-}" = --wakes-only ] && wakes_only=true

if ! $wakes_only; then
echo "== Import"
docker cp deploy/team/holeai-team-import.zip "$("${C[@]}" ps -q agents)":/data/holeai-team-import.zip
"${C[@]}" exec -T -u 0 agents chown openbot:openbot /data/holeai-team-import.zip
team import /data/holeai-team-import.zip

echo "== Models (Producer, Analyst, Strategist on Opus; the rest on Sonnet)"
for agent in Producer Analyst Strategist; do team model "$agent" claude claude-opus-5-5; done
for agent in "Chief of Staff" Publisher Growth "Story Maker" "Image Producer" "Carousel Maker" Rosie; do
  team model "$agent" claude claude-sonnet-5-5
done
fi

echo "== Wake routines"
install -d -m 0700 /root/holefm-wake-lines
while IFS=: read -r bot agent; do
  [ -s "/root/holefm-wake-lines/$bot" ] && continue
  answer=$(team wake "$agent" "hole.fm woke you. Read the message and do the items in it, following your instructions.")
  url=$(sed -n 's/^url=//p' <<<"$answer")
  secret=$(sed -n 's/^secret=//p' <<<"$answer")
  if [ -z "$url" ] || [ -z "$secret" ]; then
    echo "  $bot: the routine has no URL yet (the account service did not register it). Run this again later." >&2
    continue
  fi
  bun deploy/vps/add-wake-hook.ts "$bot" "$url" "$secret" | sed -n '4,5p' | sed 's/^ *//' >"/root/holefm-wake-lines/$bot"
  chmod 600 "/root/holefm-wake-lines/$bot"
  echo "  $bot -> $agent"
done <<'EOF'
producer:Producer
publisher:Publisher
analyst:Analyst
strategist:Strategist
story_maker:Story Maker
rosie:Rosie
chief:Chief of Staff
carousel_maker:Carousel Maker
EOF
echo "Done. hole.fm still wakes the Grok bots until each bot is switched with its two lines."
