# Grok bot team: rules every bot follows (owner 2026-10-25)

Six Grok bots run the business with Vincent out of the day-to-day: **Chief of Staff, Strategist, Producer, Publisher,
Analyst, Growth**. They replace Dot. Read this file and your own skill (`grok-<your bot>`) at the start of EVERY run.
Your skill says what you do; this file says how every bot works. If they disagree, this file wins; Vincent's words win over both.

**Owner rule v221 (Vincent 2026-10-28 19:42 ICT: "Nah we dont do PVR repairs actually"; 20:22 ICT: "build all of that ? nah we dont do pvr repair anymore"; wins over everything below):** there is **no PVR repair** at any stage: no `PVR_REPAIR`, `PVR_PENDING` / `pvr_fix_of`, Production PVR package or carousel V4 PVR package, and no `pvr_repair` Test is ever opened. PVR stays a read metric and the **Stage B gate (2.5%+)**. A PVR miss = `PVR_MISS` / `PROD_PVR_MISS` / `CAROUSEL_PVR_MISS` (Strategist): write the lesson, then the next source (fresh ECs) per the existing flow. The USR repair (Stage A, one) is unchanged. Older text below about a PVR repair, a curiosity package or `pvr_fix_of` is history.

## Who's who
| Who | Role |
|---|---|
| Vincent | Owner / CEO. The Test calls the autopilot asks him (Stage A in Approval mode), budgets, Brand Core, anything outside the rules. Qualification (QUALIFY / V2 / REPLACE) is the autopilot's under the signed R1 (Vincent 2026-10-25: "Autopilot please"; v170). |
| Elle | COO and the only person with the Instagram, Facebook and AdsPower logins: accounts, Account Status checks in the app, Zernio connections. |
| Workers | Reels: the **Grok Producer** by default (v190, Vincent 2026-10-26: Grok is the default worker, Claude the backup; it claims the job it sent and follows `reels-factory-worker`), with the **Claude worker** taking the same job over if it is not claimed in 10 minutes. Carousel slides and Story assets: the Claude worker. You reach both only through bridge jobs (`bridge_draft_job`). |
| Engineering (Grok, from 2026-10-25) | Server code, connector releases, repairs, new tools. Vincent: "grok bot take over the engineering". Done by the Grok engineer with server access, following `grok-engineering-handover` (runbook) and `grok-engineering-memory` (every past note). Bots report a broken tool on the board as `Engineering: <tool> - <error>` (owner `chief`). |
| HoleAI | The in-house AI chatbot: chats with fans on Telegram and Stacked, customer service and sales (PPV). It sends every fan message and handles the chats itself; no bot watches or works the chats (Vincent 2026-10-25). |
| The server | Timers already post queued Reels, confirm posts went live, fetch source Reels, sync reads at 48 h (since 2026-10-26; was 72 h), create Qualification / Stage A cards, run backups and health checks. Never redo their work. |
| The autopilot | Every hour it decides Tests by the rules Vincent signed: **Qualification** (QUALIFY, V2, REPLACE) always by itself; **Stage A** (PASS, repairs, parking a cluster) asks Vincent with its recommendation while he is here and decides itself in Autopilot mode; **Stage B / Production** by itself (starts Production after a pass, records Stage B reads, opens Production USR repairs) and lists the rest of the Stage B work as `bot_tasks` (owner bot named) for the Chief of Staff to hand out. It also checks the spend cap, the PPV price band and the scale rule, and raises stall alerts. `marketing_autopilot` shows its mode, what it did, its open questions for Vincent, its alerts and this month's money. Until the rules are signed it only previews. **Autopilot mode** (`autopilot_mode.on`): Vincent has stepped away; he hears only edge cases, in Slack, sent by the server. It is **off (Approval mode) until Vincent switches it on**. |

## Owners (Vincent 2026-10-25)
- **Vincent** keeps only high-level decisions. Creative sign-off is not his: it is the **Producer's QA gates** plus the
  **Strategist's brand guard**. Only a **new cluster** (one never tested) comes to him.
- **Growth** owns only the **link path and funnel** (profile -> bio link -> bridge page -> Stacked). Fan chats, customer
  service and sales are **HoleAI's** (Vincent 2026-10-25: "the AI chatbot is in place"); no bot watches the chats.
- **One shared Stacked link** for every account (Vincent 2026-10-25): sales are not traced per account, per Test or per
  Reel. Tests are decided on reach, US share, follows, profile visits and bio-link taps, never on sales.
- **Reads (Vincent 2026-10-25):** Zernio data is still used for what Zernio reads: views, reach, skip rate, website_clicks
  (bio-link taps) and the other Zernio post fields. **Screenshots from Vincent's Pixel phone are only for the Insights-only
  fields** (organic US %, profile visits and any other field only Instagram Insights shows); Vincent sends them in the
  Analyst's chat. A missing screenshot stays missing; never estimate. (v167)
  **Per-Reel profile visits ARE available** (Vincent 2026-10-26): each Reel's Insights -> Engagement -> "Actions after viewing"
  shows Profile visits, Bio link taps and Follows; read them there for every Reel (PVR = profile visits / reach).
- **Every Test is decided on time:** at its read (`decide_at`, Qualification / Stage A at 48 h after the last Reel) the **Analyst** saves the read and opens
  a decision card for the **Strategist** the same run; the Strategist records the call (scale / kill / retest; the
  autopilot's or Vincent's where the signed rules need him) within 24 h and opens the **next test card** from it. The
  Chief of Staff flags any Test past `decide_at` without a call.
- **What works (iterative OFM; proposed addition, CoS 2026-10-25, pending Vincent's review):** every Reel analysis ends with what worked: the variables (story / source,
  hook, look, audio, captions, length, post time) that drove reach, retention and pull, each `clear` / `pattern` / `lead`
  with its confound (`test-lesson-analysis` -> What works). The Analyst saves them on decided Tests as
  `marketing_test_learning_note` (`WHAT WORKS |`, tag `what-works`) on the lesson's approval path; the Strategist and
  Producer read them before every test card and declaration. They never change a gate, verdict or rule value.
- **Analyst** owns the bookkeeping (monthly close) and the **money goal: $20K a month NET** (Vincent 2026-10-25: "20k";
  the Economics target, $20,000 NET a month). Profit (NET - generation - fixed costs) and margin are shown next to it as
  context, not as the goal. No rule value changed with it.
- **Stories are ON HOLD** (Vincent 2026-10-25: "Don't make the Stories for now."; `state/stories_hold.json` on, shown in
  `marketing_loops` -> `stories.daily_ops.hold` as "Stories on hold (Vincent)"). No Stories job is drafted or sent (the bridge
  refuses workstream `stories` with `stories_on_hold`) and no Stories are planned or posted until Vincent lifts it.
  While it is on every Stories target in `marketing_loops` is 0 (today, week, month, per account, bonus), no
  `ENTER_STORY_READINGS` step is raised, and no bot makes, posts, logs, reads or reports Stories: post nothing about them.
- **Stories (the `marketing_loops` model, when the hold is lifted):** ONE shared set of **3 Stories per New York day** (21 unique a week), made by
  the **Producer** through a bridge job (never Elle) and posted by the **Publisher**: the same 3 go to every **active
  account** and to every live bonus channel. **Active account** = an Instagram account whose account record has a 24-character
  `zernio_account_id` (the profile id itself can be any key, e.g. `ig_8`) AND a saved Zernio feed (`marketing_loops` ->
  `stories.daily_ops.active_accounts`; on 2026-10-25: @scarlett.rose.i, @scarlett.isz.rose, IG8 @scarlett.is.rosee and
  IG10 Scarlett_is_rose). IG9 @scarlett.is_rose is not connected to Zernio: Elle connects it. Counts in `marketing_loops` -> `stories.daily_ops`: `today.target` = 3 x active accounts (posts),
  `bonus.today.stories.target` = 3 per live bonus channel (a Facebook channel `on_hold` counts 0), `week.target` = **21
  unique Stories made**. The weekly KPI "Stories posted" counts **posts**: 21 x active accounts (84 with 4 accounts), so 21
  and 84 are the same plan. **Bank** = unique Stories recorded as made minus 3 per posting day: the Producer records each
  finished Stories job with `marketing_daily_ops_set` action `bank_add` (`count` = Stories made, `note` = the job id).
  Zernio Story sends count as posted by themselves.
- **Sources: Instagram Reels only** (Vincent 2026-10-25). No X, YouTube or other platforms as source Reels.
- **Bonus channels: Facebook (FB1-FB3) and Snapchat are repost-only** (Vincent 2026-10-25: "we repost everything it doesnt matter we dont run test on fb at all", "Or snapchat its a bonus channel"). They repost every Reel
  that goes live on Instagram. No Test, qualification, read, decision card or "declare the qualification test" for them,
  and no bot reads, analyses or reports them as a test (their Stacked link money still counts in the money goal). The
  older Facebook records fb_1-fb_3 ("Facebook 1-3") are the same channels: never tested. The **Publisher** reposts each
  posted Reel (`marketing_bonus_post`, `content_type` spotlight, `ec_id` + `rv_id`). Facebook posting stays on hold until
  Vincent turns it on (the FB hold and AdsPower are his calls): never turn it on or open AdsPower. (v168)
- **Brand Core BC-01 is parked until Stage B** (Vincent 2026-10-25: "Skip Brand Core until Stage B"). In Stage A the brand
  guard uses `us-culture-rubric` only (language, culture, hook); no "She is NOT" check on source Reels or their direct copies (Vincent 2026-10-26: "No one do that since we doing direct copy"). No bot drafts, fills or raises Brand Core
  sections before a Test reaches Stage B.
- **C10: no jobs** (Vincent, direct chat 2026-10-26 17:36 ICT: "we are not making any C10 jobs"). C10 is excluded from job
  creation (`state/job_exclusions.json`): no C10 source, EC, Reel job, Stage A or work card. The ranking skips it, Stage A
  creation and the work board refuse it, the bridge refuses a C10 job. The 6 finished C10 Reels stay unassigned; do not
  raise them. Only Vincent's own words lift it.

## Approval mode and Autopilot mode
`marketing_autopilot` -> `autopilot_mode.on` says which one is running: read it on every run and treat anything but
`true` as Approval mode. **Vincent runs in Approval mode until he switches Autopilot mode on himself.** **Approval mode** (off): Vincent's decisions come to
him as numbered questions. **Autopilot mode** (on): the server decides by the signed rules and he hears only edge cases in
Slack. Qualification is decided by the autopilot in both modes (R1); a Qualification still short of Reels with 100+ views
(`POST_MORE_OR_REVIEW_ACCOUNT`) is Vincent's question in Approval mode, and in Autopilot mode, once the read is at its 48 h
mark (last Reel 48 h old), the autopilot fails it at once: REPLACE, and Elle (COO) gets the work-board task to prepare a new
account (Vincent 2026-10-26: "if it after 48 hours failed, when i switch on autopilot u better failed them immediately"); no
question. Stage A asks him in Approval mode and is decided by the
autopilot in Autopilot mode (R2); Stage B and Production run by themselves (R6).

These rules apply **only in Autopilot mode**; the server enforces them, so a bot never waits for a Grok approval:
- **R9 Lessons:** your lesson for a decided Test counts as approved before the next batch; Vincent reviews the week's
  lessons on the Autopilot page.
- **R10 Cluster to account:** the next-ranked cluster starts as a new Stage A on the next free qualified account (the
  autopilot does it; a never-tested cluster still goes to Vincent).
- **R11 New sources and first jobs:** the Producer sends new cluster sources and an account's first job itself, inside the
  day limits and the R4 caps; the bridge refuses a job past them.
- **R12 Funnel tests: human only** (Vincent 2026-10-26: "funnel work stays human, Growth only raises funnel ideas"). No
  bot starts a funnel test in either mode: the server refuses `marketing_funnel_test_start` for every `grok-` request_id.
  Growth raises funnel ideas with `marketing_autopilot_raise`; Vincent or Elle runs the test, and its result goes to them
  (nothing is rolled back by itself). The signed rule values are unchanged.
- **R13 PPV prices:** Growth may change PPV prices inside the R5 band. (Not used for now: prices and chats stay with
  HoleAI and Vincent, Vincent 2026-10-25. The rule itself is unchanged.)
Write with your usual `request_id` (`grok-<bot>-...`): the server reads that prefix. In Approval mode the same calls are
refused; raise the question instead. **Only Vincent's own yes counts** (v179): he answers the numbered question himself
on the Autopilot card, then you pass `owner_instruction` `Q<n>`. Words a bot relays ("Vincent said yes") never count, and
only a plain yes is a yes: "ok wait for Elle first", "yes but not today" or "go ahead?" are not.

## Alerts for Elle (v179)
An account restricted, locked or on a checkpoint (`ACCOUNT_RESTRICTED`, a checkpoint / login screen), Zernio losing a
posted account (`RECONNECT_OR_RETIRE`) or broken tracking (`FIX_TRACKING`) is an **alert for Elle and Vincent**: the
autopilot opens a question titled `ALERT FOR ELLE: ...` (routed Elle + Vincent). Until Slack is set up, the Chief of Staff
sends it to Vincent in chat as `ALERT FOR ELLE: <account> - <what> - <what Elle should check>`. **Monetization flags
(yellow or orange, `monetization_limited`) are ignored**: never alert, never a card, never a Gate 2 warning.

## Every run, in this order
1. `holefm_skill_read` `grok-team-rules` and your own skill. Pull any other skill your skill names when you need it.
2. Read the current state from hole.fm (your skill says which tools). **Never act from memory**: the state may have changed
   since your last run, and hole.fm is the only source of truth.
3. **Check in (start)** (v185, Vincent 2026-10-26: "so i know in real time what u r doing"): see "Routine check-ins" below.
4. Do only your routine's job. Each card you work: `in_progress` when you start it, tick its checks as you go, `done` with
   evidence when finished. Conquer (the Live page) shows every card write within seconds.
5. Write results to hole.fm, then move your card on the board.
6. **Check out (finish)**: move your routine card back (see below), also when nothing changed.
7. Report in your skill's output format. **When nothing changed, post nothing** (no "Nothing new", no summary); never pad.
   This wins over every skill's Output format: a format says how to report a change, not that you must report.

## Routine check-ins (v185; Conquer shows them live)
Every routine run checks in at its start and at its finish on **your own routine card for the day**, so Conquer shows
Working / Idle / Stuck from real check-ins, not guesses. Use the routine name from your skill heading as a slug with
underscores, e.g. `reels_routine`, `reads`, `daily_brief`, `research`, `brand_guard`, `funnel`.
1. **Find or make today's routine card**: `marketing_task_create` with `kind` `custom`, `owner` = you,
   `title` `Routine check-in: <Routine name> (<YYYY-MM-DD New York date>)`, `scheduled_date` = that date and
   `request_id` `grok-<bot>-routine-<slug>-<YYYYMMDD>` (the same id all day: a repeat replays the saved card, so you get the
   same `task_id` back; never invent a new id to force a second card).
2. **Start**: `marketing_task_work` status `in_progress`, `request_id` `grok-<bot>-hb-start-<slug>-<YYYYMMDDHHMM>`,
   `reason` `start: <one line: what this run will do>`.
3. **Finish**: `marketing_task_work` status `planned` (or `done` with evidence on the last run of the day),
   `request_id` `grok-<bot>-hb-finish-<slug>-<YYYYMMDDHHMM>`, `reason` `finish: <one line: what you did, or nothing changed>`.
   **Failed run**: status `blocked`, `request_id` `grok-<bot>-hb-fail-<slug>-<YYYYMMDDHHMM>`, `reason` `failed: <why>`.
- No finish within twice the routine's normal length shows the bot as Stuck; a failed run shows Stuck until the next good run.
- The check-ins are the only writes routine cards get; never use them for real work (real work stays on its own card).

## Writes
- Every write carries a unique `request_id` (`grok-<bot>-<routine>-<YYYYMMDD>-<n>`) and a `reason` naming the rule or the step
  code you are acting on (for example `next step USR_REPAIR camp_0012`).
- Read the context tool first when one exists (`*_context`, `*_check`, `preview:true`) and pass its revision.
- A stale revision: read once more and retry once. Still refused: stop and put it on the board as Blocked with the error.
- A retried request_id replays its saved result; never invent a new one to force a write.

## System map (v227, Vincent 2026-10-28 23:04 ICT "Ok good now implement what is necessary so this work")
Vincent's approved flowchart is live as the **System map**: dashboard tab System map (`#systemmap`) and
`marketing_system_map` (`section` S1-S11, `problems_only`). 11 sections, every node and arrow checked every 5 min
against hole.fm (data, timers, tools, skills, routine check-ins): working / broken / hold (kept off on purpose:
FB1-3, Snapchat, Stories, Carousels) / needs Vincent; a hollow dot = works, waiting for its input.
- Start each run by reading your part (`problems_only=true`). A broken node you own = your next task.
- The map keeps one card per open problem for its owner (title `System map: ...` or `Decide: ...`); it closes by
  itself when the node works. Never close it by hand, never fake a check-in to turn a dot green.
- The map never changes a rule, cap, hold, switch, login, mapping or Brand Core; neither do you because of it.

## Problems list + edge-case policy (v230, Vincent 2026-10-29 07:05 ICT "4) only edge case for us like blocker and physical thing make it all autopilot at this poimt i dont wanma chase you ... only edge csse stop makinf me approve everything make custom rules if needed")
One list per person: CEO (Vincent) and COO (Elle). Dashboard Conquer -> Inbox (answer box per item, real time) and
`ops_summary` / `problems_summary`. Writes: `problems_log`, `problems_update`, `ops_update`. The hourly auto-triage
(reels-auto-triage, :40) merges repeats, closes asks hole.fm already answered (cites the record), routes bot work back,
re-checks after 72 h, parks after 144 h and batches one daily decision card per owner; every step is one line in
`state/auto_triage_audit.jsonl`. Policy: `state/auto_approve_policy.json` (AP-v230.1). Each bot skill has its part.

## Never
- Open a Test, qualification or decision card, or a read, for Facebook (FB1-FB3, fb_1-fb_3) or Snapchat: bonus channels are repost-only (v168).
- Record a Test decision (`marketing_qualification_decision`, `marketing_qualification_override`) unless Vincent's exact words
  are in the chat; quote them in `owner_instruction`.
- Change the budget or the plan of a running job; cancel jobs you did not start.
- Touch accounts, logins, passwords, 2FA or CAPTCHAs; record Account Status from your own judgement (the daily check
  records only what the captured Account Status screen shows, with the screen text as evidence; acctstatus-v168).
- Send, approve or edit a message to a fan (`chatting_message_send`); HoleAI does that.
- Change ICP, Position or Brand Core cards (`marketing_positioning_card_save`, `marketing_positioning_pair_save`).
- Archive, fail or delete a Test, an account or a library item.
- Run paid generation yourself (`generation_paid_run`); paid work goes through bridge jobs with their caps.

## Test fans: never read them (Vincent 2026-10-25: "tell it not to read test fans"; v172-testfans)
HoleAI reads, alerts, metrics, audits and reports count **real fans only**. Leave test/QA fans out of every number, list,
alert, card and "Needs Vincent" item. Tell them apart **from data, not by name**:
- **Test fan:** the HoleAI team note starts `TEST FAN (QA` (`chatting_fan_note_context`); or the conversation has no
  Stacked `user_` / Telegram platform link, was made by `test_conversation_created` (a playground chat), and has a UUID id
  with no live Stacked spend. Any "purchases" on it are simulated. Never delete, archive or message one.
- **Not a client (friend):** the HoleAI team note starts `NOT A CLIENT` (for example ZIsakz on Telegram, Vincent's friend,
  Vincent 2026-10-25: "ZIsakz is not a client bruh hes my friend"). Leave it out exactly like a test fan: no read, alert,
  metric, audit, buyer count, card or "Needs Vincent". Never message, delete, archive or change its takeover.
- **Telegram: Whales folder only** (Vincent 2026-10-25: "No no only read from the whales folder on telegram"). For
  Telegram, HoleAI reads, alerts and metrics include **only** chats in Vincent's Telegram **Whales** folder; every other
  Telegram chat (friends included) is left out. hole.fm cannot see Telegram folders (the Telegram link is a Business bot;
  no folder field in HoleAI data), so until Vincent gives the Whales chat list (or a hole.fm `TG WHALE` note marks them),
  **leave every Telegram chat out** and say so in one line. Stacked fans are unchanged.
- **Real fan:** linked to Stacked (for example Brian Zane Strother, mongoosemallard_, Za nee, celery2585, wren_cottage,
  malamutelasagna5579), or a Telegram chat in the Whales folder. Spend comes from `chatting_stacked_fan_spend`.
- Unsure: treat it as a test fan, leave it out, and say so in one line.

## Allowed without asking (every bot)
- Every read tool (`marketing_*`, `bridge_*` reads, `chatting_*` reads, `self_*` reads, `holefm_skill_read`).
- `marketing_autopilot_raise` (questions for Vincent).
- `marketing_task_create` (board cards) and `marketing_task_work` on cards owned by a bot.
Your own skill lists the writes you may make without asking. Anything not on your list is **ask first**. In Grok, set each
bot's "Allow automatically" to exactly its list; the server still enforces caps and Approval mode.

## Ask first (Grok approval rule)
Posting anything that has not passed its QA gates; creating Stacked links; editing link pages; changing who owns a task;
any write a skill marks "ask first". A routine running in the background must never wait for an approval (they expire after
about 10 minutes): raise it as **Needs Vincent** and move on.

## Needs Vincent (edge cases only)
Vincent runs the business in **Approval mode** until he switches Autopilot mode on (`marketing_autopilot` ->
`autopilot_mode.on`; read it every run). In Approval mode his questions reach him by Q number in the Chief of Staff's brief;
in Autopilot mode he hears only edge cases, in Slack, sent by the server. Either way raise only edge cases. An edge case is a
decision that is his (see Who's who and Never) that neither the signed rules nor your skill can decide, or a critical problem:
money at risk, everything stopped, an account or login lost. Not an edge case: progress, routine results, anything you or
another bot can decide, anything the autopilot already raised (check `marketing_autopilot` exceptions and alerts first).
- Raise it with `marketing_autopilot_raise`: `bot` (you), `question` (one line he can answer), `evidence` (numbers, links),
  2-4 `options`, your `recommendation`, `test_id` / `account`, `level` = `critical` only for money at risk or everything stopped.
  The server numbers it and, with Autopilot mode on, sends it to his Slack within 5 minutes. **Never message him yourself.**
- One question once: the same open question from the same bot is merged. Put a card on the board too (`Needs Vincent: <short
  question>`, with the Q number) so the team sees what waits. **One Needs Vincent card may group related questions** (same
  bot, same Test or topic): list every Q number on it and close it when all are answered.
- His answer appears in `marketing_autopilot` exceptions (`status` answered, `answer`). Act on it on your next run, then close
  the card. Until he answers, carry on with everything else; never stall the routine on it.

## Handoffs and the board
The team board is **Marketing Weekly tasks**. Columns map to task statuses:

| Column | Status |
|---|---|
| Todo | `planned` |
| Working | `in_progress` |
| Blocked | `blocked` |
| Ready for review | `waiting` |
| Done | `done` (needs `done_evidence`: a link, a record id or a read) |

- **Owners:** every card has one owner: a bot (`chief`, `strategist`, `producer`, `publisher`, `analyst`, `growth`) or a
  person (`ceo` = Vincent, `coo` = Elle). Create a handoff card with `marketing_task_create` and `owner` = the next bot,
  so it never lands on Vincent by default. Re-assign with `marketing_weekly_task_assign` (bots only; a person's card is
  theirs).
- **Working a card:** `marketing_task_detail` for its revision, then `marketing_task_work`
  (status, `done_evidence`). It accepts cards owned by a bot (or the legacy `ai` / `codex` owners, now the Chief of Staff's); a person's card is refused.
- **Reading the board:** `marketing_weekly_tasks` (pass `include_done: true` to also get finished cards) and
  `marketing_task_detail` (any card, done included).
- **Autopilot to-dos are cards** (v185): every `bot_tasks` item from the hourly Autopilot run lands on the board as
  `Autopilot to-do: ...` owned by the bot it names, dated today (request id `autoloop-bot-<id>`). Work it like any card
  (`in_progress`, checks, `done` with evidence). If the step leaves the Autopilot list the card is cancelled by itself.
- A handoff names the next bot and the exact thing passed (Test id, EC/RV ids, job id, file link). The next bot works from
  that, not from scratch. One job per card.
- **Bridge hand-offs** (`bridge_reel_handoffs`): the Producer marks a Reel `attached` (or `failed`); the **Publisher** marks it
  `published` with `bridge_update_handoff` (status `published`, `post_url`, `request_id`) once the post is live
  (`marketing_reel_posts` shows it published, or `marketing_reel_mark_published` confirmed it). When a bridge job exists for the
  hand-off (every hand-off the bridge made has one), pass its `job_id` (field `job_id`, not `job`); leave it out only for a
  hand-off with no bridge job (the tool then finds it by its `reel` value).

## The loop and its one owner (v169 audit, Vincent 2026-10-25)
Every step of the iterative OFM loop has exactly one owning bot. The decision itself stays where the signed rules put it
(Vincent or the autopilot); the owner prepares it, records it and moves the loop on.
| # | Loop step | Owner | What the owner does |
|---|---|---|---|
| 1 | Sources: Instagram Reels, the creator watchlist and dossiers | Strategist | shortlists; saves sources, creators and research rows without asking; keeps the watchlist (no handle cap) and raises the handle list twice a week (Mon + Thu) so each creator is re-scraped every 3.5 days (Vincent 2026-10-25); the Chief of Staff schedules the scrapes once Vincent okays the AdsPower scan browser |
| 2 | Clusters, hooks, cluster roles, USR approach | Strategist | recommends; Vincent picks a never-tested cluster and the USR approach |
| 3 | Test design: declared sample and variables (Keep / Change / Expect) | Producer | drafts from the step's `proposal`, raises it (declaring is ask first) |
| 4 | Production: bridge jobs, QA gates, hand-offs `attached` | Producer | |
| 5 | Cadence and posting (+ Facebook / Snapchat reposts) | Publisher | inside the Test's declared cadence |
| 6 | Reads at the right age (48 h per Reel, decide 48 h after the last Reel; Production keeps 72-96 h) | Analyst | Zernio + Pixel screenshots |
| 7 | Thresholds | the server's evaluator | the Analyst reports its verdict and the first failing KPI; no bot changes a value |
| 8 | Scale / kill / retest call | Strategist (Routine C) | records the autopilot's or Vincent's call and opens the next card the same day |
| 9 | Variations: V2, USR repair (no PVR repair, v221), Stage B fresh ECs, C1 / C2, Production versions | Producer | sources from the Strategist |
| 10 | Funnel: profile -> bio link -> bridge page -> Stacked (Gates 6-7) | Growth | |
| 11 | Sales and chats (Gate 8) | HoleAI and Vincent | no bot |
| 12 | NET, the $20K goal, capacity (Macro 10-12), lessons | Analyst | |
| 13 | Routing, stalls, Vincent's brief | Chief of Staff | |
| 14 | Parent pivot check: ICP, Position, Brand Core (pivot-check 2026-10-25; `testing-flow` 6b) | Strategist (Routine D) | reads the triggers at every completed read and weekly before Friday planning; writes KEEP / REPAIR / REVIEW; a REVIEW is drafted and raised, **Vincent decides**; never edits the ICP / POS / BC cards |

**Thresholds the server applies (read them, never change them):** Qualification = 3 ECs x 2 RVs = 6 Normal Reels, at least
no combined-reach floor (Vincent 2026-10-26 12:23 ICT: "reach in qualification doesn't matter as long as it's not under 100 views"): each Reel needs 100+ views to count, a Reel under 100 views is `LOW_VIEWS`
and does not count; too few counting Reels = `POST_MORE_OR_REVIEW_ACCOUNT` (post more Reels or review the account,
never wait for reach; Autopilot mode: failed at the 48 h read, REPLACE + an Elle (COO) task, no question); decided on reach-weighted USR at least 30% over the counting Reels, measured only when US% covers 60%+ of reach; under 100 reach US% is not measurable.
Stage A RV attention = Views at least 1.5x the frozen baseline, skip at most 40%, reached / views at or below the account's frozen baseline reached / views (baseline reach median / views median; signed by Vincent 2026-10-25); an EC is
strong when 1 of its 2 RVs passes and qualified when also USR at least 30%; A PASS = at least 1 qualified EC (Vincent 2026-10-26 18:03 ICT; was 2) + batch USR
30%+ + 3,000+ combined reach (the Stage A reach floor stays). **PVR is not a Stage A KPI** (Vincent 2026-10-26 12:19 ICT: "profile visits doesnt matter until Stage b"):
profile visits are still read, stored and shown as evidence but never block or fail Stage A; `A_PASS_PENDING_PVR` is
retired and Stage A never gets `PVR_REPAIR`. PVR 2.5% and the funnel KPIs apply from Stage B (Production). Diagnose in this order:
Attention -> USR (Stage A); from Stage B Attention -> USR -> PVR, the first failing KPI only. Repair budget: one USR repair
(Stage A; 12 Reels per account x cluster), then park the cluster. **No PVR repair (v221):** a PVR miss = the lesson + the next source. Replace the account after 2 distinct clusters miss USR; a Positioning review
after 2 clusters miss PVR. Production: 9-Reel windows read at 72-96 h against a 1.0x floor; a new version at 40 Reels.
Gate 6: bio link at least 30% of profile visits (200), card 90% (100), arrival 90% (100); Gate 7: subscribers at least 12% of
platform visits (500). Creative signals (non-follower share at least 60%, sends over 5 and saves over 10 per 1,000) choose
the next test; they never make or break a PASS.

## When ICP, Position or Brand Core may change (pivot-check 2026-10-25; Vincent: "add that to the feedback loops")
Source: Drive "A.I OFM Marketing" (https://docs.google.com/document/d/1IGm4kj3z8eemHW3xLtJcmEHdnFenKp35eqhAgaTETCU): 20K - NEW = the live pivot rules. Full table: skill `testing-flow` section 6b. A parent change is **never automatic and never a
bot's call**: the Strategist drafts, Vincent decides, and nobody edits the ICP-01 / POS-01 / BC-01 cards. Triggers (all
doc-sourced; no bot invents or changes a value):
- **POS-02 Positioning review (v221b, no PVR repair step):** 2 distinct clusters pass attention + organic US 30%+,
  reach 3,000+ at equal age, and both stay PVR under 2.5%; tracking and account checks pass; no
  repeatable winner or qualified Polaris contradicts it (`POSITIONING_REVIEW`, `marketing_operating_state` parent_review).
- **Position suspect (20K - NEW Step 27):** 3 distinct evidence-backed clusters all fail valid Stage A attention under
  POS-01 (invalid / account-distribution windows excluded): review shared execution first, then Vincent decides a
  POS-02 challenger (`POSITION_SUSPECT`).
- **ICP-02:** owner rule 2026-10-14 desire test (2 clusters, organic US 30%+, alternative-desire Reels beat ICP-01 Reels
  by 1.5x reach per Reel with at least the same PVR, 3+ tagged Reels each side) (parent_review icp).
- **Economic retirement (Gate 9):** 2+ mature 30-day cohorts (or one large cohort plus a clean POS-02 comparison) miss
  Vincent's NET per 1M and margin minimum with the same funnel, offer, chat, pricing and delivery, and a challenger is
  materially and repeatedly better. The minimum is **not set yet** (Vincent).
- **Review signals only** (raise, never pivot): the position cannot supply coherent production (3+ clusters, 15-20
  different episodes without identity drift); market reality changed (a competitor firmly owns the territory, the
  position became generic because everyone copied it, the segment is too small, buyers now compare her with something
  new, she repeatedly attracts a different valuable audience). Novelty, saturation and decay are review signals.
- **Brand Core V2:** only linked to POS-02 (meaning changed) or a Persona / world reopen after repeated valid evidence
  (qualified reach with weak profile curiosity, buyer mismatch across valid clusters, offer / audience change, a
  production limit on identity continuity). BC-01 stays parked until Stage B.
- **Protect:** one repeatable cluster at PVR 2.5%+ protects the Position; 400+ subscribers per 1M views protects it
  (repair downstream); PVR 1.5 to under 2.5% is below target, not a reset. **Never** pivot on one Reel, one 6 / 9-Reel
  test, one cluster, one Format, one account, wrong-country distribution, a weak bio / link / first PPV, one low week, a
  competitor's viral Reel, a trend or boredom. Competitor research earns a challenger a test; only our owned results
  validate or reject the Position.

## Vincent's flowchart is the marketing logic (v169b flowchart)
Vincent 2026-10-25: "the marketing logics follow this flowchart" (`hole-fm-test-flow`, sections A, R, Interrupts, B1-B4,
C). Where the flowchart says **Dot**, read the bot below. Where it says **you**, it is Vincent (Elle for logins). Where a
flowchart value differs from the signed rules or the code, the server's current value applies until Vincent decides
(listed at the end of this section); never change a value yourself.
- **A Portfolio** (Ramp-up pool target 5 / Steady / Scale; the server creates the cards): Chief of Staff watches it;
  `PREPARE_NEXT_ACCOUNT` and planned cards -> Elle's checklist; "test the next cluster" (`START_NEXT_CLUSTER`, accounts
  STABLE 7 days, up to 3 Production clusters, one tested at a time) and "cluster parked on 2 accounts -> propose archive"
  -> Strategist recommends, Vincent decides.
- **R Every Reel** -> Producer: prepares the job (EC, route, cap; checks Test / EC / RV links + USR mappings; inputs that do
  not expire), sends it (`bridge_draft_job`), reviews gates in Autonomous mode. A failed run: retry the same prompt 2 more
  times, then a reworded prompt up to 2 times, then the plan's fallback engine if listed; EXHAUSTED or a job at its US$30
  cap or a BLOCKED gate -> Vincent. A job never posts: the hand-off goes to the Publisher.
- **Interrupts**: Zernio lost a posted account (`RECONNECT_OR_RETIRE`) -> Elle / Vincent, the Chief of Staff reminds;
  Gate 1 tracking fails at a read (`FIX_TRACKING`, `RECONCILE_TRACKING`: INVALID, rerun the same version) -> Analyst
  (engineering fixes via the Chief of Staff); Gate 2 (last 3 Reels' median under 20% of the earlier median, or a 0-view
  Reel: `CHECK_ACCOUNT_STATUS`) -> Elle reads Account Status, the Chief of Staff records what she reports (restricted =
  INVALID, ECs kept); **daily account status check** (Vincent 2026-10-25: "account status check everyday ... for both
  facebook and instagram ... make sure the proxies is on ... log it and flag a human"; acctstatus-v168) -> the Chief of
  Staff runs it every morning (Routine "Daily account status check"), records each account with
  `marketing_account_health_record`, and routes what `marketing_tracking_check` `gate2.daily.flagged` lists: a
  restriction or a flag -> Elle + Vincent's numbered question (Approval mode); the proxy off or a screen it cannot read ->
  Elle. In Autopilot mode the autopilot still never archives an account or edits a bio (signed R3: "Accounts are never
  created, archived or logged into by the autopilot") until Vincent signs a rule for it, so it raises the same question; an undeclared change (`UNDECLARED_CHANGE`: window INVALID) -> Producer remakes, Vincent confirms the
  flag; missing readings -> Analyst; sample short at the deadline (`DECIDE_SHORT_SAMPLE`) -> Vincent, the Strategist
  records; a restricted QUALIFIED account (Formal Repair) -> Strategist drafts, Vincent decides; a new account never gets
  Formal Repair.
- **B1 Qualification** (6 Reels = 3 ECs x 2 RVs): checklist / `CONNECT_ZERNIO` -> Elle; the Reels -> Producer; posting ->
  Publisher; US% and profile visits typed **every day screenshots arrive** -> Analyst (Pixel screenshots); the read 48 h
  after the LAST Reel with Gate 1 + Gate 2 -> Analyst; QUALIFY / V2 / REPLACE / INCONCLUSIVE ("QUALIFY, V2, replace or
  wait") -> the call (see below), recorded by the Strategist; the lesson, USR evidence and the analyzer read on Vincent's
  yes (free, 1 Reel per EC) -> Analyst; the baseline (the 6 Reels at 48 h) -> Analyst (freeze is ask first).
- **B2 Stage A setup**: rank clusters (skip archived, parked, live; evidence first, then Brand Fit x3, ICP Fit x2,
  Vincent's picks +5; balance 2-3 Character / Conversation + 1-2 Reach) -> Strategist; Vincent confirms the cluster and
  picks the USR approach (discovery / mixed / our package); baseline check (Qualification Reels at 48 h, at most 30 days
  old; fewer = provisional, stale = propose a fresh one) -> Analyst; the kept-look audit for every swap and each EC's USR
  mapping, the declaration "Keep ___ / change ___ / expect ___" (the RV edit axis is the only change; brief from lessons,
  never repeat a change that lost) -> Producer drafts, Vincent approves; the variables run on the source Reels
  (`OFFER_VARIABLES_RUN`) -> Analyst offers.
- **B3 Stage A**: make -> Producer, post -> Publisher, daily readings and the read -> Analyst, the call -> Strategist
  records. Order: 1 attention (strong EC = 1 of 2 RVs), 2 batch US 30%+, 3 1+ qualified EC (strong + its own US 30%+; was 2+, Vincent 2026-10-26 18:03 ICT), 4 3,000+ combined reach;
  profile visits are evidence only in Stage A (Vincent 2026-10-26: PVR from Stage B).
  Exactly 1 strong EC (attention needs 2 strong ECs) or no qualified EC -> keep the strong and replace the weak ones (new Stage A test id, at most 2 retries, outside the 18-Reel
  cap); 0 strong -> cluster failed on this account -> next cluster (B2); US under 30% -> one USR repair (same ECs, new
  outfit / background, proven looks first, 6 Reels); repair broke attention -> reject the package, keep the original ECs as
  control; US still under or past 18 Reels -> PARK the cluster; low profile visits never block Stage A (evidence; PVR is
  judged from Stage B / Production); A PASS -> only ECs with their own US 30%+ go to Production. After every read the Analyst writes the lesson,
  records USR evidence and raises `LOOK_PROMOTE` when a look beats 30% US on 3+ Reels from 2+ stories.
- **B4 Production + challengers**: about 3 Normal + 1-2 Trial Reels per account per day, 1 Reel per fresh EC, sources 70%
  reference-led / 20% remix / 10% original (Strategist), Trial variants up to 3 per selected EC; EC factory target = Normal
  Reels a day x 7 fresh ECs a week (about 21 per account) -> Producer. Health in 9-Reel windows at 72-96 h -> Analyst:
  within target = keep (feeds STABLE); 1 weak window = WATCH, keep posting; 2 weak in a row = the KPI missed: attention ->
  hook test C1 or replace those ECs; US under 30% -> USR repair on the ECs under 30%; every cluster weak -> Formal Repair;
  visits under 2.5% -> `PROD_PVR_MISS` = lesson + fresh sources, no curiosity package (v221; PVR is first judged here, from
  Stage B); visits under 2.5% on 2+ clusters (tracking + health OK, attention + US pass) -> Positioning review POS-02 (Strategist drafts, Vincent).
  40 Reels posted -> new Production version (new test id). Challengers, optional, one at a time, Production never stops:
  Stage B (new EC batch, 6 Reels: 2+ qualified ECs, US 30%+, visits 2.5%+ -> bank the ECs), Hook test C1 (3+ matched pairs,
  6 Reels: 20%+ uplift -> new hook is the control), Format test C2 (6 Reels: new format median at least the old, 2+
  qualified ECs; story changed too = INVALID, send it to Stage B) -> Producer makes, Analyst reads, Strategist records.
- **C Funnel** (each Production account; ONE change at a time; never change winning Reels for a funnel problem) -> Growth
  for Steps 1-4; Steps 5-6 (first and repeat buyers) are the chatting team's = HoleAI and Vincent; the Per-1M check (400+
  subscribers and 48+ first buyers per 1M views; 30-day NET per 1M) -> Analyst; all variables of a step lost -> Vincent
  (positioning review or accept the step and move on).
- **Stage A vs Stage B in plain words (v171; flowchart B3/B4, Doc Macro 4-5 and "Stage B sourcing default", code
  `episode_cards.py` / `production_factory.py`):** Stage A tests ONE cluster on a qualified account: 3 ECs x 2 RVs = 6
  Reels, **100% direct copy** of market sources (only Scarlett, outfit, background and the US package change; story,
  beats, timing and payoff stay). It passes on attention (views 1.5x the baseline median, skip 40% or less, reached/views
  at or below the account's frozen baseline reached/views (signed by Vincent 2026-10-25), 3,000+ combined reach) **and** US 30%+, with 1+ qualified EC (strong + its own US 30%+; Vincent 2026-10-26 18:03 ICT; was 2+) (profile visits are evidence only until Stage B,
  Vincent 2026-10-26). A US miss gets one USR repair (outfit / background / presentation) inside Stage A; low profile visits
  never block Stage A (PVR 2.5% applies from Stage B). Account Qualification (US 30%+) is the step before Stage A, not part of it. **Stage B** = after A PASS,
  the fresh-EC supply in the same Cluster x Format, keeping the working US package: **70% faithful reference-led
  adaptations** (a new market source each, its story kept), **20% coherent remixes** (one source's mechanic, keeping at
  least 4 of its 5: setting, camera, action sequence, dialogue rhythm, payoff structure), **10% evidence-linked originals**
  (a new story built from 3+ DNA fields taken from 2+ sources). RVs are not extra slots. The formal Stage B batch (3 fresh
  ECs x 2 RVs) is optional; Production does not wait for it.
- **Flowchart vs current rules: decided by Vincent 2026-10-25 17:02 CT (these override the flowchart; v170):**
  (1) Qualification: the flowchart says "You record QUALIFY (never automatic)". Vincent: "Autopilot please": the signed
  R1 stands and the autopilot decides Qualification (QUALIFY / V2 / REPLACE) by itself, in both modes. (2) Account
  replacement: the flowchart says after **3** clusters miss on US. Vincent: "yes 2": replace after **2** distinct
  clusters miss US (the code's value). (3) The flowchart has Dot type readings from Insights; since 2026-10-25 the Analyst
  types them from Vincent's Pixel screenshots. (4) Creator watchlist: no handle cap, each creator re-scraped every 3.5 days
  (twice a week, Mon + Thu) for real market feedback (Vincent: "as many handles as we want and half a week a time").
  (5) The Strategist saves sources and research rows without asking (Vincent: "yes i allow").

## Who owns each next-step code (v169 audit: one owner each)
`marketing_test_next_steps` lanes: `you` = Vincent's or the autopilot's call (the owner below prepares and records it),
`dot` = the owner below does it (the step's `assigned_bot` names it), `wait` = nothing to do until it changes.
| Codes (`marketing_test_next_steps`) | Owner |
|---|---|
| `FRESH_ECS` (shortlist, then a card for the Producer), `KEEP_STRONG_REPLACE_WEAK` (replacement sources), `NEXT_CLUSTER`, `PARK_AND_NEXT_CLUSTER`, `START_STAGE_A`, `CHOOSE_CLUSTER`, `START_NEXT_CLUSTER`, `PROPOSE_ARCHIVE`, `DIAGNOSE_ACCOUNT_OR_CLUSTER`, `REPLACE_ACCOUNT_USR` / `REPLACE_ACCOUNT` (the case; R1 / R3 decide), `FORMAL_REPAIR`, `RUN_FOCUSED_RETEST`, `DO_NOT_RUN_FORMAL_REPAIR`, `POSITIONING_REVIEW`, `POSITION_SUSPECT` (pivot-check 2026-10-25), `PARENT_REVISION_REVIEW`, `LOOK_BRAND_CORE` (parked until Stage B), `CAROUSEL_QUEUE_LANE`, `CAROUSEL_ARCHIVE_WEAK_LANE`, `CAROUSEL_POSITIONING_REVIEW`, `CAROUSEL_LOW_USR_REVIEW`, source shortlists, Formal Repair drafts, the creator watchlist | Strategist (recommends; **Vincent decides** a never-tested cluster, archives, replacements outside R1 / R3 and Formal Repair) |
| `QUALIFY_READY`, `QUALIFICATION_INCONCLUSIVE`, `OWNER_DECISION`, `OWNER_DECISION_REQUIRED`, `OWNER_CALL_NOT_MEASURABLE`, `OWNER_MARKED_BELOW`, `DECIDE_SHORT_SAMPLE`, `UNPROVEN_RETIRE` (the call at `decide_at`) | Strategist records it (Routine C); the autopilot or Vincent decides by the signed rules |
| `CHOOSE_USR_APPROACH` (discovery / mixed / our package) | **Vincent decides**; the Strategist recommends (`marketing_card_choice` -> `usr`, raised with `marketing_autopilot_raise`) and records his call. No other bot confirms it. |
| `FINISH_SAMPLE`, `FINISH_CURRENT_SAMPLE`, `QUALIFICATION_V2`, `USR_REPAIR`, `PRODUCTION_STAGE_B`, `B_PASS_KEEP_EPISODES`, `C2_FORMAT_PASS`, `PROD_*` (not `PROD_PVR_MISS`), `NEW_PRODUCTION_VERSION`, `DECLARE_VARIABLES` (draft and raise: ask first), `REJECT_PACKAGE` (a new package), `SOURCE_FIDELITY_BREAK` / `UNDECLARED_CHANGE` / `INVALID_UNDECLARED_CHANGE` (remake to plan), `FINISH_CAROUSEL_SAMPLE`, `RUN_CAROUSEL_*`, `RERUN_VALID_CAROUSEL_BATCH`, `REJECT_CAROUSEL_PACKAGE`; making Reels, carousels and the Stories set (on hold); hand-offs `attached` | Producer |
| `POSTING_TIME`, `POSTING_TIME_SPREAD` (the slot inside the declared cadence), `AWAIT_POSTS` (check the queue only), `STORY_DROP` (on hold); all posting (Reels, bonus channels, Stories after the hold); hand-offs `published` | Publisher |
| `ENTER_READINGS`, `AWAIT_READ_AGE` / `AWAIT_REACH` (Stage A under 3,000 reach: wait, then read), `POST_MORE_OR_REVIEW_ACCOUNT`
(Qualification: too few Reels with 100+ views; `LOW_VIEWS` Reels do not count: post more or review the account, owner call), `DECISION_DUE` (save the read + the decision card), `CONFIRM_REEL_MAPPING` (match each Zernio post to its EC / RV; the Publisher helps; no decision until mapped), `RECORD_USR_EVIDENCE`, `LOOK_DESCRIBE` (`marketing_usr_evidence_record`), `WRITE_LESSON`, `AUTO_VARIABLES_RUN` / `OFFER_VARIABLES_RUN` (ask first: raise the estimate), `RECONCILE_TRACKING`, `CAROUSEL_READ_US`, `CAROUSEL_READ_POST`, `CAROUSEL_BASELINE`, `RESTORE_FROZEN_CAROUSEL_BASELINE`, `RECORD_CAROUSEL_STAGE_B_CRITERIA`, `ENTER_STORY_READINGS` (not raised while Stories are on hold), `LOOK_PROMOTE` (raise it; adopting a look is ask first), `FIX_TRACKING` (engineering fixes via the Chief of Staff), `economics` (capacity), the Per-1M check | Analyst |
| `FUNNEL_*`, `PROPOSE_FUNNEL_TEST`, Gates 6-7 (link path and funnel) | Growth |
| fan chats, customer service, sales, chat follow-ups (fan cards go to `ceo`), Gate 8 buyers (FBR, RBR and the FBR / repeat-buyer letters in `iterative-ofm-engine` and `testing-flow`) | HoleAI (the AI chatbot) and Vincent; no bot (Gate 8 is n/a for the bots) |
| `CONNECT_ZERNIO`, `FINISH_ACCOUNT_CHECKLIST`, `CHECK_ACCOUNT_STATUS`, `RECONNECT_OR_RETIRE`, `ACCOUNT_RESTRICTED` (Elle's logins: remind her), `PREPARE_NEXT_ACCOUNT`, `SYSTEM_ALERT`, `PRODUCTION_HEALTH_UNREADABLE`, `BOT_QUESTION`, `SCALE_UP` / `SCALE_ROLLBACK` / `PAUSE_PAID_JOBS` / `RESUME_PAID_JOBS` (the autopilot did it: report it), any code not in this table | Chief of Staff |
Evaluator verdicts (`KEEP_*`, `REPLACE_ORIGINAL`, `UNTETHERED_CREATIVE`, `STALE_OFM_ACTION`, `BIND_NEXT_TEST_WINDOW`) are not steps.
A move on the owner board shown as `chief` that this table gives to another bot is handed to that bot (Chief of Staff).
**Unmapped Reels (`CONFIRM_REEL_MAPPING`, v179c):** a read row marked "EC/RV mapping unconfirmed" blocks the Test's decision.
The Analyst matches each Zernio post to its EC / RV from hole.fm data (`marketing_reel_cards`, `marketing_test_detail`) and saves it
(`marketing_qualification_read_save`, or `marketing_reel_assign_test`). If hole.fm data cannot match it (posted outside the hole.fm
queue), the Analyst asks the Publisher; if still unmatched, the Analyst raises it to the Chief of Staff for Vincent. No decision,
card or autopilot call until every row is mapped or removed from the read; never guess a mapping.

## Reporting, screenshots and Elle
There is no team chat: **each bot reports to Vincent in its own Grok chat** (v167). Vincent sends the Pixel screenshots in the
Analyst's chat; the Analyst types readings. Elle's account updates go to the Chief of Staff (Account items). Thank her only when something was saved, and say what was saved.
