#!/usr/bin/env bash
# Sets the HoleA.I team up on the VPS agent server with no app: imports deploy/team/holeai-team-import.zip,
# sets each agent's model, and gives every hole.fm wake bot a webhook routine wired through the wake bridge.
# Run on the VPS from the repository root, after the server is signed in (`openbot status`):
#   bash deploy/vps/setup-team.sh                 everything (the models need Claude connected on the server)
#   bash deploy/vps/setup-team.sh --models-only   after Claude is connected in the app
#   bash deploy/vps/setup-team.sh --wakes-only    for bots whose routine had no URL yet
#   bash deploy/vps/setup-team.sh --mcp-only      adds the hole.fm and Higgsfield MCP servers
# The two lines hole.fm needs per bot go to /root/holefm-wake-lines/<bot> (root only). Switch hole.fm over
# (switch-holefm-wakes.sh) only after Claude and the MCP servers are signed in, or wakes reach agents that cannot work.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH="$HOME/.bun/bin:$PATH"
C=(docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env)
team() { "${C[@]}" exec -T agents openbot team "$@"; }
mode=${1:-all}
case $mode in all | --models-only | --wakes-only | --mcp-only) ;; *) echo "Unknown option: $mode" >&2; exit 1 ;; esac

echo "== Claude Code (the image has no bundled copy; the server finds ~/.local/bin/claude in its /data volume)"
docker exec -u openbot -e HOME=/data "$("${C[@]}" ps -q agents)" bash -c \
  'test -x /data/.local/bin/claude || curl -fsSL https://claude.ai/install.sh | bash >/dev/null; /data/.local/bin/claude --version'

if [ "$mode" = all ]; then
  echo "== Import"
  docker cp deploy/team/holeai-team-import.zip "$("${C[@]}" ps -q agents)":/data/holeai-team-import.zip
  "${C[@]}" exec -T -u 0 agents chown openbot:openbot /data/holeai-team-import.zip
  team import /data/holeai-team-import.zip
fi

if [ "$mode" = all ] || [ "$mode" = --mcp-only ]; then
  echo "== MCP servers (the owner then presses Sign in on each in the app)"
  team mcp holefm https://ai.holeacquisition.com/mcp holefm-openbot </dev/null
  team mcp higgsfield https://mcp.higgsfield.ai/mcp </dev/null
fi
[ "$mode" = --mcp-only ] && exit 0

if [ "$mode" != --wakes-only ]; then
  echo "== Models (Producer, Analyst, Strategist on Opus; the rest on Sonnet)"
  failed=0
  while IFS=: read -r agent model; do
    team model "$agent" claude "$model" </dev/null >/dev/null && echo "  $agent: $model" || failed=1
  done <<'EOF'
Producer:claude-opus-5-5
Analyst:claude-opus-5-5
Strategist:claude-opus-5-5
Chief of Staff:claude-sonnet-5-5
Publisher:claude-sonnet-5-5
Growth:claude-sonnet-5-5
Story Maker:claude-sonnet-5-5
Image Producer:claude-sonnet-5-5
Carousel Maker:claude-sonnet-5-5
Rosie:claude-sonnet-5-5
EOF
  [ "$failed" = 0 ] || echo "  Some models were not set. Connect Claude in the app, then run: bash $0 --models-only" >&2
fi

if [ "$mode" != --models-only ]; then
  echo "== Wake routines"
  install -d -m 0700 /root/holefm-wake-lines
  while IFS=: read -r bot agent; do
    [ -s "/root/holefm-wake-lines/$bot" ] && continue
    # </dev/null: docker exec would read the rest of the bot list from standard input.
    answer=$(team wake "$agent" "hole.fm woke you. Read the message and do the items in it, following your instructions." </dev/null)
    url=$(sed -n 's/^url=//p' <<<"$answer")
    secret=$(sed -n 's/^secret=//p' <<<"$answer")
    if [ -z "$url" ] || [ -z "$secret" ]; then
      echo "  $bot: the routine has no URL yet (the account service did not register it). Run this again later." >&2
      continue
    fi
    bun deploy/vps/add-wake-hook.ts "$bot" "$url" "$secret" </dev/null | sed -n '4,5p' | sed 's/^ *//' >"/root/holefm-wake-lines/$bot"
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
  echo "hole.fm still wakes the Grok bots until each bot is switched: bash deploy/vps/switch-holefm-wakes.sh <bot>"
fi
