#!/bin/bash
# Points a hole.fm bot's wake back to its Grok Bot routine (or all bots), from the backup taken on 2026-10-30
# before the OpenBot migration. Run from the PC:
#   ssh -i ~/.ssh/openclaw_nerve_vps root@194.233.80.34 'bash -s' -- producer < deploy/holefm/restore_grok_wake.sh
#   ssh -i ~/.ssh/openclaw_nerve_vps root@194.233.80.34 'bash -s' -- all < deploy/holefm/restore_grok_wake.sh
set -euo pipefail
BOT="${1:?bot id (producer, publisher, analyst, strategist, story_maker, rosie, chief, carousel_maker) or all}"
LIVE=/home/admin/reels-expert/secrets/wake_endpoints.json
BACKUP=$(ls -1 /root/openbot_client/wake_endpoints.grok-backup-*.json | head -n1)
cp -a "$LIVE" "/root/openbot_client/wake_endpoints.before-restore-$(date +%Y%m%d-%H%M%S).json"
python3 - "$LIVE" "$BACKUP" "$BOT" <<'PY'
import json, os, sys
live_path, backup_path, bot = sys.argv[1:]
live, backup = json.load(open(live_path)), json.load(open(backup_path))
bots = list(backup) if bot == "all" else [bot]
for b in bots:
    if b not in backup:
        sys.exit(f"no Grok backup for {b}")
    live[b] = backup[b]
st = os.stat(live_path); tmp = live_path + ".tmp-restore"
open(tmp, "w").write(json.dumps(live, indent=1) + "\n"); os.chown(tmp, st.st_uid, st.st_gid); os.chmod(tmp, st.st_mode & 0o7777); os.replace(tmp, live_path)
print("restored Grok wake for:", ", ".join(bots))
PY
echo "$(TZ=Asia/Ho_Chi_Minh date '+%Y-%m-%d %H:%M ICT') OpenBot migration: restored Grok wake for $BOT from $BACKUP" >> /root/fm_coord/log.txt
cd /home/admin/reels-expert && python3 -m core.wake_config list
