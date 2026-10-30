---
name: reels-carousel-factory
description: Plan and produce source-linked Instagram carousel image packs for Reels Expert, including branded slide composites, per-slide QA, and parallel Codex worker coordination. Use for one or more carousels; do not use for Reel video masters or generic image editing.
---

> **Generation route (Vincent 2026-10-18/19).** Every paid generation goes through the hole.fm generation app MCP:
> `generation_paid_models` (approved engines only: Seedance, WAN, GPT Image 2.5, Nano Banana 2.1; Kling via Kling MCP),
> `generation_paid_model_schema`, `generation_paid_quote`, `generation_paid_run`, `generation_paid_status` (US$30 per
> budget key including retries, refused above the balance, a retried request_id replays). Kling goes only through the
> official Kling MCP (https://kling.ai/app/mcp). Do not call Kie, WaveSpeed, ElevenLabs, `reels_production` or
> `core/gen_cli.py` directly: lines below that name those direct routes now describe models, inputs and settings only.
> **Grok bots:** never call `generation_paid_*` yourselves: paid carousel work goes through a bridge job
> (`bridge_draft_job`, workstream `carousels`); the generation tools above are for the Claude worker inside that job.
> In Reels Factory jobs dot decides the route (mode, methods, first-frame recipe, engines, gates; skill
> `reel-creation-routes`, engines in `generation-capability-catalog`) and Claude executes it exactly.
> **USR per EC (Vincent 2026-10-19).** Before first frame and storyboard, each EC's outfit and background come from its
> own USR record (`marketing_usr_library`, dashboard USR page), approved or QA-passed, shared by all its RVs. Language,
> music and CTA come from the source Reel; the thesis also fixes the presentation RV jobs.

> **Carousel modes (owner 2026-10-23) — this wins over the steps below.** A carousels job names `carousel_mode`:
> `direct` = direct replacement (Scarlett replaces the person on every source slide; scene, pose, outfit, slide order and
> text meaning stay; Qualification carousels and pilot V1) or `full_ref` = full reference (every slide keeps the source
> pose, framing and camera; she wears the job's declared outfit in its declared locations; US / PVR package versions
> and Production). Plus `carousel_stage` (qualification / pilot / production) and `source`. The Claude worker follows its
> skill `carousel-factory` (Reel-Production-Claude `.claude/skills/carousel-factory/SKILL.md`): source analysis with
> slide roles (cover, context, escalation, pattern break, payoff, optional CTA), identity anchor slide first, per-mode
> prompts, QA, slide manifest. The face-swap commander/worker flow below is legacy.

> **Carousel tests (owner 2026-10-25, v152; guide section 5) — the formal pilot, separate from Qualification posts.**
> One Test = one lane (account x Carousel Cluster x Carousel Format); keep 2-3 lanes per account. Create it with
> `marketing_carousel_test_create` (stage `baseline` when the account has no 9 comparable carousels: the first 9 freeze the
> baseline and are never a win). Post 9 distinct ECs (default 3 posts/week, unboosted), read each post at 7 days from
> Insights and save one row per post with `marketing_carousel_test_post` (reach, views, non-follower reach, sends, saves,
> post US %, post-attributed profile visits, follows) plus the baseline (reach of the 9 comparable carousels before) and
> the three checks. `marketing_carousel_tests` scores it: Attention (batch median / baseline >= 1.5x) -> USR >= 30% ->
> PVR >= 2.5%; NF share, sends, saves and follows/visit are a diagnostic read. The next version is a new Test ID:
> V2 cover / presentation (or fresh ECs), V3 US package (Situation, Language, Outfit, Music; `full_ref` slides),
> V4 personality / curiosity / CTA package. A package that breaks an earlier KPI is rejected. Never a Reel or
> Production pass, never mixed into Reel per-1M targets.

# Reels Expert Carousel Factory

Work from the Reels Expert project root. Read its `AGENTS.md` and relevant `SOP.md` rules first. For evidence, ECs, and test decisions, also use the `reels-expert` skill's `references/carousel-intelligence.md`. Reels and carousels have separate evidence, storage IDs, tests and results. The same semantic Strategy Cluster may be adapted into a carousel lane; link its identity explicitly and validate carousel fit. A Reel PASS never becomes carousel evidence.

## Build the carousel before generating slides

Inspect every ordered source slide, including visible text and the source URL. Record observed Hook, sequence, Payoff, Format, and Carousel Cluster claims with slide IDs in `core/carousel_intelligence.py`. Keep observations separate from proposed branding. For a new carousel, validate its EC, compile an ordered slide storyboard with `build_slide_storyboard()`, resolve Brand Core references with `core/brand_assets.py`, and compile a reviewable pack with `build_image_pack()`. The pack is a dry plan, not a paid dispatcher.

Confirm the exact slide order, copy/text mode, outfit, setting, visual system, provider settings, per-slide requests, retry ceiling, and maximum cost in an immutable plan. Paid generation and live posting require approval of that concrete plan. Do not interpret approval of the source or storyboard as spend approval.

## First-frame method adapted to slides

Use the Reels first-frame *reference ownership* and one-pass branded composite method for slides that show the model. At 2K, 3:4, the default reference roles are: (1) approved identity/body reference; (2) approved source slide as the composition/camera/pose/subject-scale authority; (3) approved outfit reference only; (4) person-free in-house environment plate only. Include only roles actually needed. For a slide without a person, do not force identity, body, outfit, or a four-image composite. Use the operator-selected GPT Image 2.5 Sunburst image-to-image route for referenced slides unless the approved plan says otherwise.

Keep the source slide's framing, perspective, crop, headroom, subject placement, visible-body cutoff, and intended text-safe area. Rebuild the in-house room around that camera geometry; do not copy a person from the outfit or environment reference. Transfer garments only where visible in the crop. Ask for a neutral expression and open, visible eyes only on a slide where the model's face should appear. Preserve a deliberate source expression only if the approved carousel concept requires it. Do not carry a Reel's 9:16 canvas or motion/audio constraints into a static 3:4 slide.

Read `prompts/GPT_IMAGE_2_5_GUIDE.md`, `prompts/CHARACTER_REFERENCE_ASSET_BUILDER.md`, and `prompts/IMAGE_ASSET_QA.md` before writing or judging the image requests. Use `postproduction_overlay` for copy by default. Generate exact on-image text only when that copy is approved; check it character-for-character. A slide's content role and mobile readability matter as much as the person match.

## Commander and rolling slide jobs

For four or more slides or an explicitly parallel carousel, the primary Codex is the commander and may use up to three job-scoped Codex workers. Treat each slide as an independent state machine: `ready -> prepared -> submitted -> qa_ready -> accepted`, with a narrow retry or exception branch. There is no all-slides stage barrier. A passing slide advances immediately to overlay/export while other slides generate or undergo QA.

Workers prepare requests and QA completed slides in separate slide folders. One worker owns a slide folder at a time. The commander alone owns the immutable plan, paid provider queue, request deduplication, provider concurrency, task IDs, retries, cost ledger, and final pack acceptance. Codex-worker concurrency is distinct from provider concurrency; neither grants spend authorization. Prioritize QA and narrow fixes that finish a slide before starting untouched slides, while keeping approved provider slots filled.

Bind each paid request to ordered input hashes, prompt hash, model/settings, slide number, and stage. Persist the provider task ID before polling. Never resubmit an ambiguous or still-running task. Retry from the original approved references or last accepted asset, never from a rejected output. A provider fallback requires the same reference-role contract and a separately approved route when image identity fidelity has not been benchmarked.

## Fast QA and delivery

Check each returned slide once for identity and visible body-proportion match where relevant; source composition and camera; garment and scene ownership; open/visible face when required; anatomy; exact text or clean overlay space; 3:4 size; and mobile readability. Compare palette, margins, identity, and visual language across the accepted slides before pack acceptance. If identity fails, retry the original composite within the approved limit. A body-proportion correction is conditional, not a routine slide step: only when the visible canonical comparison clearly fails, use the approved Grok Imagine Quality one-edit route and re-QA; never make GPT Image perform that correction. Uncertain comparisons go to operator review without extra spend.

Deliver slides in approved order, with source/EC/storyboard lineage, final copy, provider URLs, task IDs, accepted file hashes, QA verdicts, actual known cost, and exceptions. A carousel is complete only when every required slide and its overlay/export pass QA. Do not post without separate live-action approval. The older `core/carousels.py` face-swap command is a legacy recreation path, not proof that this branded composite/commander lane has an automated paid dispatcher.
