#!/bin/bash
# hole.fm: approve OpenBot (HoleA.I) agents as an MCP client, the way holefm-grok and holefm-claude-code are.
# Adds `holefm-openbot`: a public PKCE client with OpenBot's exact loopback callbacks, holefm-grok's scopes and
# tool list, and holefm-grok's long-lived sign-in. Config only (4 files), no release, no re-pin.
# Backup + rollback script in /root/openbot_client/. Rolls back by itself when the connector does not come back.
# Run from the PC:  ssh -i ~/.ssh/openclaw_nerve_vps root@194.233.80.34 'bash -s' < deploy/holefm/openbot_client_apply.sh
set -eu
W=/root/openbot_client; TS=$(date +%Y%m%d-%H%M%S); B=$W/bak-$TS; mkdir -p $B
FILES="/opt/hole-mcp/private/active-config.json /etc/hole-mcp/authorize-worker.json /etc/hole-mcp/marketing-worker.json /etc/hole-mcp/self-worker.json"
UNITS="hole-mcp-write-authorize hole-mcp-write-marketing hole-mcp-write-self hole-mcp"
for f in $FILES; do cp -a $f $B/; done
cat > $W/rollback.sh <<RB
#!/bin/bash
# OpenBot client rollback: restore the 4 hole.fm configs from $B and restart the connector
set -eu
cp -a $B/active-config.json /opt/hole-mcp/private/active-config.json
for n in authorize-worker marketing-worker self-worker; do cp -a $B/\$n.json /etc/hole-mcp/\$n.json; done
systemctl restart $UNITS
sleep 6
systemctl is-active $UNITS
RB
chmod +x $W/rollback.sh
echo "$(TZ=Asia/Ho_Chi_Minh date '+%Y-%m-%d %H:%M ICT') OpenBot-client START: holefm-openbot = holefm-grok scopes + tool list + long-lived sign-in, OpenBot loopback callbacks (config only, no re-pin). Backup $B, rollback $W/rollback.sh" >> /root/fm_coord/log.txt
python3 - $FILES <<'PY'
import json, os, sys
CLIENT = "holefm-openbot"
# OpenBot's MCP sign-in listener: port 28417, path /callback (src/main/mcp-oauth-redirect-server.ts).
REDIRECTS = ["http://127.0.0.1:28417/callback", "http://localhost:28417/callback"]
for f in sys.argv[1:]:
    st = os.stat(f); raw = open(f).read(); c = json.loads(raw)
    lim = c["auth"]["client_tool_limits"]; lim[CLIENT] = list(lim["holefm-grok"])
    o = c.get("oauth")
    if o and "holefm-grok" in (o.get("extra_clients") or {}):
        o["extra_clients"][CLIENT] = {"redirect_uris": REDIRECTS, "scopes": list(o["extra_clients"]["holefm-grok"]["scopes"])}
        assert set(o["extra_clients"][CLIENT]["scopes"]) <= set(o["scopes"])
        if o.get("long_lived_clients") and "holefm-grok" in o["long_lived_clients"]:
            o["long_lived_clients"][CLIENT] = o["long_lived_clients"]["holefm-grok"]
    ind = 2 if raw.startswith("{\n  ") else None
    tmp = f + ".tmp-openbot"; open(tmp, "w").write(json.dumps(c, indent=ind) + ("\n" if raw.endswith("\n") else ""))
    os.chown(tmp, st.st_uid, st.st_gid); os.chmod(tmp, st.st_mode & 0o7777); os.replace(tmp, f)
    print("ok", f, len(lim[CLIENT]))
PY
systemctl restart $UNITS
sleep 8
if ! systemctl is-active --quiet hole-mcp || ! curl -fsS -m 10 -o /dev/null http://127.0.0.1:8797/healthz \
  || ! curl -fsS -m 10 -o /dev/null http://127.0.0.1:8797/.well-known/oauth-protected-resource; then
  echo "hole-mcp did not come back healthy: rolling back"
  journalctl -u hole-mcp --since "-60s" --no-pager | tail -15 || true
  $W/rollback.sh
  echo "$(TZ=Asia/Ho_Chi_Minh date '+%Y-%m-%d %H:%M ICT') OpenBot-client ROLLED BACK (connector unhealthy)" >> /root/fm_coord/log.txt
  exit 1
fi
systemctl is-active $UNITS
journalctl -u hole-mcp -u hole-mcp-write-authorize -u hole-mcp-write-marketing -u hole-mcp-write-self --since "-40s" --no-pager | grep -i "error\|traceback\|refus" | tail -5 || true
echo "$(TZ=Asia/Ho_Chi_Minh date '+%Y-%m-%d %H:%M ICT') OpenBot-client DONE (rollback $W/rollback.sh)" >> /root/fm_coord/log.txt
