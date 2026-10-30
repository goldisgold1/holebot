# Problems list and daily triage (v230)

For: the Chief of Staff and Rosie (COO assistant). Vincent 2026-10-29 07:05 ICT "4) only edge case for us like blocker and physical thing make it all autopilot at this poimt i dont wanma chase you ... only edge csse stop makinf me approve everything make custom rules if needed".
Also Vincent 07:05 ICT: "1) when we encounter a problem add that to the list , make a ceo and coo list on all view we see
 both on ceo we only see mine and coo u see hers 2)immeditealy add that to calendar and our self to do list and war maps 3)
 when we solve it u check it off make it a skill for u and rosie".

## What exists
- Problems list: `state/problems.json` (core/problems.py). One item = {title, owner ceo|coo, raised_by, kind, options,
  recommendation, links (Test, account, question Q-number, card)}. Never twice: same source / same ask merges ('also').
- Each item has ONE card for its owner -> their Self to-do (War Map) -> a Calendar event on its day (Vincent:
  goldenbusiness2608@gmail.com through his Self; Elle's own Self has no calendar linked yet: her to-do carries the date).
  Solving checks all of them off; reopening unchecks them (core/problem_links.py, within about a minute).
- Policy AP-v230.1 `state/auto_approve_policy.json`: edge cases E1-E9 only; everything else is the bots' work.
- Auto-triage every hour at :40 (core/auto_triage.py): merge repeats (A1), close what hole.fm already answered with
  the record cited (A2), route bot work back (A3), close asks a live setting already decides (A4), 72 h re-check by
  the asking bot then park (A5), one daily decision card per owner (A6). Audit: `state/auto_triage_audit.jsonl`.

## Daily triage (morning ops check 08:10 ICT; drive loop 08:00 / 16:00 ICT)
1. `ops_summary` view all (one read). Report ONE line: `Inbox: N Vincent / M Elle (P parked) · auto-handled today X /
   7 d Y · next production <name> posts <day>`.
2. For each open item: is it really an edge case (E1-E9)? If not, it is bot work: reassign the card to the bot
   (`marketing_weekly_task_assign` / its owner tool) and `problems_update` solve with 'routed to <bot>: <why>'.
3. Does hole.fm already answer it (an owner answer, a Test decision, a done card, a rule record)? `problems_update`
   solve with that record id.
4. Is it Elle's (phones, warm-up, logins, AdsPower, account creation, locks)? `problems_update` reassign coo.
5. Locks / checkpoints / 'action blocked' / 'log into instagram': owner coo, kind lock = `ALERT FOR ELLE` on her
   list and card. Tell Elle in one line; never tap a checkpoint, never log in for her.
6. Everything left is a true decision: it is already on the owner's daily decision card with its own Calendar
   event. Do not chase in chat; answers come back through the Inbox (`ops_summary.answered`).

## Rules
- Only Vincent's own answer counts for a CEO item, only Elle's (or Vincent's) for a COO item. Never record an
  owner's words for them; a relayed answer is not an approval.
- Never change rule values, caps, switches, mappings, logins, Brand Core, the Stories hold or the carousel switch.
- Keep reads lean: `ops_summary` once per run; no polling bots.
