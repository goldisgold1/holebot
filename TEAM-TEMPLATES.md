# The HoleA.I agent team, as templates

HoleA.I runs a team of ten agents on top of hole.fm. They ship here as one import pack,
[`deploy/team/holeai-team-import.zip`](deploy/team/holeai-team-import.zip), so you can add the whole team to
your own HoleBot in one step.

| Agent | Job | Model |
|---|---|---|
| Chief of Staff | Front door for the owners; routes work, watches stuck items and alerts | Sonnet |
| Strategist | Clusters, tests and what to make next | Opus |
| Producer | Turns approved Test cards into Reels, carousels and Stories (bridge jobs, Higgsfield) | Opus |
| Publisher | Posts what the Producer hands over | Sonnet |
| Analyst | Reads, data checks, source reviews and verdicts | Opus |
| Growth | Scales what passed Stage A; account warm-ups | Sonnet |
| Story Maker | Story inspiration library | Sonnet |
| Image Producer | Story images (Higgsfield, WaveSpeed fallback) | Sonnet |
| Carousel Maker | Source-linked Instagram carousels | Sonnet |
| Rosie | COO assistant: readiness, setup, the COO problems list | Sonnet |

Each agent gets its role skill plus the shared team rules (`grok-team-rules`). The readable sources are in
[`deploy/team/source-skills/`](deploy/team/source-skills/). No memories, chats or account data are included.

## Add the team to your HoleBot

**In the app:** open **Server settings → Import**, choose `deploy/team/holeai-team-import.zip`, and confirm.
The ten agents appear in your sidebar. Then set each one's model as in the table (agent settings → Model).

**On a VPS agent server** (`bootstrap.sh --agents`, see [FRIEND-SETUP.md](FRIEND-SETUP.md)):

```sh
bash deploy/vps/setup-team.sh --models-only   # after the import, once Claude is connected
```

Skip the rest of `setup-team.sh`: the MCP and wake steps connect the agents to the original owner's hole.fm.

## Make it yours

The skills were written for HoleA.I, so they name its people (Vincent = CEO, Elle = COO, Scarlett = a creator)
and its tools (the hole.fm MCP connector, Higgsfield, bridge jobs). To adapt them:

1. Edit the files in `deploy/team/source-skills/`: swap the names, accounts and rules for yours.
2. Change the roles, titles and focus lines in `deploy/team/build-team-import.ts` if you add or drop agents.
3. Rebuild the pack: `bun deploy/team/build-team-import.ts`. It checks the pack with HoleBot's own import
   decoder before writing it.
4. Import the new zip.

To give the agents the same tools, run your own hole.fm (code in the hole.fm repository, ask for access) and
add its MCP server to each agent: `openbot team mcp holefm https://<your hole.fm>/mcp holefm-openbot`.

`deploy/team/pull-skills.sh` refreshes the skills from the original hole.fm server and only works with its key.
