#!/usr/bin/env python3
"""The team switch: which team hole.fm wakes for each bot, Grok (Grok Bot routines) or Claude (OpenBot agents on the VPS).

Runs on the hole.fm server as root (Vincent, or the Chief of Staff over its root SSH):
  wake-team                          which team each bot wakes now
  wake-team grok all                 every bot back to Grok
  wake-team claude all               every bot to Claude
  wake-team grok producer analyst    only these bots
  wake-team claude producer --no-probe

Each team's address and key per bot live in /root/wake-teams/<team>.json (0600, root only), made once by install.
A switch hands them to `python3 -m core.wake_config set <bot>` through stdin, the same path a person uses, so no key is
ever printed, logged or passed as an argument. Then it sends one probe (the bots ignore it) unless --no-probe.
A bot with no address on the chosen team (Carousel Maker never had a Grok routine) is paused instead, and the next
switch to a team that has it turns it back on. Every switch is written to /root/fm_coord/log.txt.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

APP = Path("/home/admin/reels-expert")
LIVE = APP / "secrets" / "wake_endpoints.json"
TEAMS = Path("/root/wake-teams")
LOG = Path("/root/fm_coord/log.txt")
# Who owns each bot, for hole.fm's Wakes panel and ops_summary view=wakes (core/wake_dispatch.py v250 reads it).
OWNERS = APP / "state" / "wake_teams.json"
BOTS = ("producer", "publisher", "analyst", "strategist", "story_maker", "rosie", "chief", "carousel_maker")
NAMES = {"grok": "Grok", "claude": "Claude"}


def load(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def team_of(entry: dict, teams: dict[str, dict]) -> str:
    """The team whose address the live entry holds, or what else it is."""
    if not entry or not entry.get("url"):
        return "none"
    for team, endpoints in teams.items():
        if any(e.get("url") == entry.get("url") for e in endpoints.values()):
            return NAMES[team] + ("" if entry.get("enabled", True) else " (paused)")
    return "other"


def wake_config(*args: str, stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(["python3", "-m", "core.wake_config", *args], cwd=APP, input=stdin, text=True,
                          capture_output=True, timeout=120)


def status() -> int:
    live = load(LIVE)
    teams = {team: load(TEAMS / f"{team}.json") for team in NAMES}
    for bot in BOTS:
        print(f"  {bot:<15} {team_of(live.get(bot) or {}, teams)}")
    return 0


def record_owners(owners: dict[str, str]) -> None:
    """Write each bot's team to OWNERS (readable by hole.fm), keeping the date it last changed."""
    data = load(OWNERS)
    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    for bot, team in owners.items():
        if (data.get(bot) or {}).get("team") != team:
            data[bot] = {"team": team, "since": stamp}
    tmp = OWNERS.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=1), encoding="utf-8")
    tmp.chmod(0o644)
    tmp.replace(OWNERS)


def switch(team: str, bots: list[str], probe: bool) -> int:
    endpoints = load(TEAMS / f"{team}.json")
    if not endpoints:
        print(f"No {NAMES[team]} addresses in {TEAMS / (team + '.json')}.", file=sys.stderr)
        return 1
    failed = 0
    owners: dict[str, str] = {}
    for bot in bots:
        entry = endpoints.get(bot)
        if not entry:
            done = wake_config("disable", bot)
            note = f"paused (no {NAMES[team]} routine)" if done.returncode == 0 else "could not pause"
            failed += done.returncode != 0
        else:
            done = wake_config("set", bot, stdin=f"{entry['url']}\n{entry['key']}\n")
            if done.returncode != 0:
                note, failed = "could not set", failed + 1
            elif probe:
                answer = wake_config("probe", bot)
                try:
                    code = json.loads(answer.stdout).get("code")
                except ValueError:
                    code = None
                note = f"probe {code}" if code else "probe failed"
                failed += code != 200
            else:
                note = "set"
            if done.returncode == 0:
                owners[bot] = team
        print(f"  {bot:<15} -> {NAMES[team]}: {note}")
        stamp = time.strftime("%Y-%m-%d %H:%M", time.gmtime(time.time() + 7 * 3600))
        with LOG.open("a", encoding="utf-8") as log:
            log.write(f"{stamp} ICT wake-team: {bot} -> {NAMES[team]} ({note})\n")
    record_owners(owners)
    return 1 if failed else 0


def main(argv: list[str]) -> int:
    probe = "--no-probe" not in argv
    words = [word.lower() for word in argv if not word.startswith("--")]
    if not words or words[0] == "status":
        return status()
    team, names = words[0], words[1:]
    if team not in NAMES or not names:
        print(__doc__.split("\n\n")[1], file=sys.stderr)
        return 1
    bots = list(BOTS) if names == ["all"] else names
    unknown = [bot for bot in bots if bot not in BOTS]
    if unknown:
        print(f"Unknown bot: {', '.join(unknown)}. Bots: {', '.join(BOTS)}", file=sys.stderr)
        return 1
    code = switch(team, bots, probe)
    print()
    status()
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
