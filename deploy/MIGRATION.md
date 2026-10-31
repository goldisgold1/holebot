# Moving the hole.fm bot team from Grok Bot to OpenBot (Claude)

Everything below is built and tested. Move day is setup, not development.

## Ready now

| Piece | Where | State |
|---|---|---|
| hole.fm accepts OpenBot | client `holefm-openbot` in the 4 hole.fm configs: holefm-grok's 518 tools and 42 scopes, 365-day sign-in, callbacks `http://127.0.0.1:28417/callback` and `http://localhost:28417/callback` | **Live** since 2026-10-30. Rollback: `/root/openbot_client/rollback.sh` |
| hole.fm wakes can reach OpenBot | `state/wake_config.json`: `url_allow` has `https://bot.holeacquisition.com/hook/`; `key_prefix` is empty, so Grok keys (`crsr_`) and wake-bridge keys (`hob_`) both pass | **Live**; no bot was switched. Grok keys backed up in `/root/openbot_client/wake_endpoints.grok-backup-20261030.json` |
| Wake bridge | `deploy/vps/wake-bridge/server.ts`: Bearer-key wake in, signed OpenBot webhook out | Tested against OpenBot's own signature check |
| Backend | `deploy/vps/` (Caddy, auth-api in workerd, Signal, coturn, scheduler) | The built Worker was run the VPS way: migrations, access codes, scheduled job |
| 24/7 agent server | `deploy/vps/agents.Dockerfile`, compose profile `agents` | Built on the VPS from this repository (the release workflow's Linux steps) |
| The team | `deploy/team/holeai-team-import.zip`: 10 agents and the HoleA.I team channel | Previewed through the real importer (web app → relay → server): 10 agents, the channel, no warnings. Rebuild: `bash deploy/team/pull-skills.sh && bun deploy/team/build-team-import.ts` |
| One-command install | `deploy/vps/ship.sh` (PC) → `deploy/vps/bootstrap.sh` (VPS) | Run again to update |

## Move day

**1. Buy the VPS.** Ubuntu 24.04, 6 cores, 12 GB, SSH key login. Add A records on hole.fm, all to its IP:
`bot`, `api.bot`, `signal.bot`.

**2. Install everything** (from the repository folder on the PC, in Git Bash; about 40-60 minutes):

```sh
bash deploy/vps/ship.sh root@<VPS IP> duy@holeacquisition.com --agents
```

It prints your first access code (also in `/root/holeai-first-access-code.txt` on the VPS).

**3. Sign the agent server in** (on the VPS):

```sh
cd /opt/holeai-bot && docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env exec agents openbot login
```

Your email, then the access code. Then open the HoleA.I desktop app (or `https://bot.holeacquisition.com/app`), sign in
the same way, and pick the agent server in the server list.

**4. On the agent server, in Server settings:**

- **Providers:** sign in to Claude (Max). The sign-in page opens in the server's browser; you click through it
  in the live view. Optional: a ChatGPT or Gemini plan as the backup model.
- **MCP → Add server:**
  - hole.fm: URL `https://ai.holeacquisition.com/mcp`, sign-in app client ID `holefm-openbot`, no secret.
    hole.fm checks your hole.fm login before anything else, so first open `https://ai.holeacquisition.com` in
    the same browser (the server's live view) and sign in there. Then add the server and approve.
  - Higgsfield: URL `https://mcp.higgsfield.ai/mcp`, sign in with your Higgsfield account.
  - Kling: the official Kling MCP (`https://kling.ai/app/mcp`), if the Producer runs Kling.
- **Import:** choose `deploy/team/holeai-team-import.zip`. It makes 10 agents and the HoleA.I team channel.
  To bring each Grok bot's own memory along, first ask each bot to export itself (DESCRIPTION, MEMORIES as
  "-" items under 500 characters, ROUTINES, FILES; no secrets) and put the files in `deploy/team/grok-export/`
  named after the role or the Grok bot (`cos-secretary.md`, `reels-producer.md`, `analyst.md`, ...). Then run
  `bun deploy/team/build-team-import.ts`: memories become the agent's memories (the first 64), and the rest
  becomes a `grok-bot-export` skill on that agent.

**5. Models:** Producer and Analyst on Opus; the others on Sonnet. Backup model on every agent.

**6. Switch one bot at a time** (start with the Producer):

1. In OpenBot, give the agent a routine with a **webhook trigger**, such as "When hole.fm wakes you, do the items
   in the message." Copy its webhook URL and signing secret (regenerate the secret to see it).
2. On the VPS: `cd /opt/holeai-bot && bun deploy/vps/add-wake-hook.ts producer <webhook URL> <secret>`.
   It prints a URL and a `hob_` key.
3. On the hole.fm VPS: `cd /home/admin/reels-expert && python3 -m core.wake_config set producer`, paste the
   two lines, then `python3 -m core.wake_config probe producer` (one harmless test wake).
4. Pause the matching routine in Grok Bot, so the two never take the same job. The OpenBot agent claims bridge
   jobs as `grok-producer`, so hole.fm's wakes, recovery and caps see no difference.

Bot ids for step 2: `producer`, `publisher`, `analyst`, `strategist`, `story_maker`, `rosie`, `chief`,
`carousel_maker`.

## Before the VPS: the team on this PC

Running since 2026-10-31: the team is imported into the local app (`start-local.cmd`, `open-local-app.cmd`), models set
(Producer, Analyst, Strategist on Opus 5.5; the rest on Sonnet 5.5), and the `holefm` MCP server added with sign-in app
`holefm-openbot`. `start-wake-link.cmd` runs the wake bridge here and an SSH tunnel that opens `127.0.0.1:18790` on the
hole.fm VPS (allowed in `url_allow`). To switch a bot: in the desktop app sign in to `holefm` (and add `higgsfield`,
`kling`), ask the agent to create a webhook routine, reveal its secret on the card, run
`bun deploy/vps/add-wake-hook.ts --local <bot> <webhook URL> <secret>`, and set the bot's hole.fm wake URL to
`http://127.0.0.1:18790/hook/<bot>` with the printed `hob_` key. The PC and all three windows must stay on.

## Back to Grok, any time

```sh
ssh -i ~/.ssh/openclaw_nerve_vps root@194.233.80.34 'bash -s' -- producer < deploy/holefm/restore_grok_wake.sh
```

Use `all` for every bot. Then turn the routine on in Grok Bot again. Removing the OpenBot client from hole.fm:
`/root/openbot_client/rollback.sh` on the hole.fm VPS.

## Weekly

`bun scripts/holeai-sync-upstream.ts` (new OpenBot versions only), then `bash deploy/vps/ship.sh root@<VPS IP>
duy@holeacquisition.com --agents` to update the VPS. When a hole.fm skill changes, rebuild the team zip and
import it again, or let the agents read the live skill (`holefm_skill_read`), which their instructions already ask for.

## More than one Producer

Make a second Producer agent (duplicate the first, same skills and model), give it its own webhook routine, and run
`bun deploy/vps/add-wake-hook.ts --add producer <its webhook URL> <its secret>` (add `--local` before the VPS). The
bridge then wakes the Producers in turn; if one is down, the wake goes to the next. hole.fm needs no change, but raise
the Producer wake cap and jobs per day (Vincent's call) or the extra Producer sits idle.
