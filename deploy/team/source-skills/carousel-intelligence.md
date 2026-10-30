# Carousel Intelligence

Carousel evidence is a parallel domain. Use `core/carousel_intelligence.py` for:

`source carousel -> ordered slides -> Hook/sequence/Payoff/Format/Strategy Cluster -> carousel ingredient bank -> carousel EC -> slide storyboard -> Brand Core assets -> image pack`

## Evidence contract

- Store ordered source slides with unique IDs, local paths or descriptions, visible text and source URL.
- Every Hook, sequence beat, Payoff, Format, Context, Core Tension, Strategy Cluster and visual-pattern
  claim cites the source slide IDs that support it.
- Keep source observations separate from `proposed_adaptation`.
- Only complete Carousel Intelligence records feed the carousel ingredient bank.
- Each carousel ingredient retains its source carousel ID and slide evidence IDs.

## Production contract

- Carousel ECs require complete H/S/T/A/Q/P, source ingredients or declared original material, Brand
  fit, Position proof, ICP desire, and production requirements.
- Give each slide a job: opening cover Hook, context, progression/escalation, character or Position
  proof, and Payoff with an optional profile CTA. Keep a recognizable world, look and framing library.
  For a non-story image set, name its visual idea and mark unused H/S/T/A/Q/P fields `N/A`.
- `build_slide_storyboard()` maps the approved EC into ordered slide roles without generating images.
- `build_image_pack()` requires a ready Brand Core asset plan and emits reviewable slide jobs. It makes
  no paid provider call.
- Paid slide generation remains behind the normal immutable-plan approval gate.

## Measurement boundary

Carousel results may roll up through carousel slide, carousel EC, and carousel Cluster x Format
evidence. They may never award Reel RV, Reel EC, or Reel Cluster PASS. Do not mix the two ingredient
banks or measurement windows.

Use `core/carousel_ofm.py` for the separate pilot loop. One complete carousel post is one sample.
One qualified account, one Carousel Cluster × carousel Format and nine distinct carousel ECs form a
pilot; one full post is one sample. Declare cadence (default three posts/week), Test ID, constants and
read date, then read every unboosted post at seven days. The first valid nine-post equal-age window
freezes a carousel-only median-reach baseline; it cannot pass against itself. Later nine-post windows
evaluate batch median reach divided by that baseline (1.5x working improvement signal), then
`USR = sum(post organic US reach) / sum(post reach)` (30% floor; 40% target), then
`PVR = sum(post-attributed profile visits) / sum(post reach)` (2.5% floor), with at least 3,000
summed post reach. Count raw numerators before dividing. Use `Viewers` as reach only when its unique
account definition is verified. Missing geography or attribution is `UNSCORED`; incomplete sample or
read is `WAIT`.

Weak attention selects fresh ECs or one declared cover/presentation treatment. Attention with USR
below 30% selects a fixed culture, setting, caption, outfit or music package. Attention and USR with
PVR below 2.5% selects a character, curiosity or CTA package while keeping US cues. Recheck every
earlier KPI in the new version. A useful window returns `CAROUSEL_LANE_SIGNAL` and a fresh-EC next
action. It does not award Reel PASS, Production confirmation or CORE. Do not invent a second fixed
carousel confirmation batch or borrow the Reel matrix. Keep carousel-attributed views and downstream
cohorts separate from Reel per-1M evidence; prevent shared-link double credit.
