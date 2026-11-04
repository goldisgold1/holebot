import { BotEngine, type BotFrame, DEMI_VIEWBOX, POSES, RAYON } from "@norbert_bodziony/bloub";
import { type AvatarFaceMood, avatarMoodIsBusy, avatarMoodPresentation } from "@openbot/brand/bloub-avatar-motion";
import type { AvatarHue } from "@openbot/contracts/ipc";
import { prefersReducedMotion } from "@openbot/ui/utils";
import type { JSX } from "@solidjs/web";
import { createEffect, createMemo, createSignal, createUniqueId, For, onCleanup, onSettled, Show } from "solid-js";
import { type AvatarMotion, avatarHeadColor, type SupportedAvatarSilhouetteId } from "../../bloub-avatar";
import type { AgentProfile } from "../../data";
import { BotMarkFace } from "./BotMarkFace";
import type { BotMarkHandle, BotMarkState } from "./bot-mark/engine";
import { joinMarkStage, pokeMark } from "./bot-mark/mark-stage";

// Cap avatar animation at 30fps: uncapped bloub clocks measured 30% renderer / 24% GPU
// for two visible avatars. The shape is 24-40px, so the eye cannot see the difference.
const AVATAR_FPS = 30;
// HoleA.I: photo retries after a failed load: 3 s, 6 s, 12 s, 24 s, 48 s.
const AVATAR_IMAGE_RETRIES = 5;
const AVATAR_IMAGE_RETRY_MS = 3_000;

// HoleA.I: now and then one resting avatar on screen comes alive for a short burst, so a quiet sidebar does
// not look frozen. One shared clock picks a single avatar every 6-12 s, and only while the window has the
// focus: a timer per avatar kept about three of them animating at once, at all times (11% GPU while idle).
const AMBIENT_BURST_MS = 4_000;
const AMBIENT_MIN_GAP_MS = 6_000;
const AMBIENT_GAP_SPREAD_MS = 6_000;
const ambientCandidates = new Set<(on: boolean) => void>();
let ambientClock: ReturnType<typeof setTimeout> | undefined;

function scheduleAmbientBurst(): void {
  ambientClock = setTimeout(
    () => {
      const candidates = [...ambientCandidates];
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      if (chosen && document.visibilityState === "visible" && document.hasFocus()) {
        chosen(true);
        setTimeout(() => chosen(false), AMBIENT_BURST_MS);
      }
      if (ambientCandidates.size > 0) scheduleAmbientBurst();
      else ambientClock = undefined;
    },
    AMBIENT_MIN_GAP_MS + Math.random() * AMBIENT_GAP_SPREAD_MS,
  );
}

/** Puts an on-screen avatar in the draw for the next burst, or takes it out. */
function setAmbientCandidate(setAmbient: (on: boolean) => void, onScreen: boolean): void {
  if (onScreen) ambientCandidates.add(setAmbient);
  else ambientCandidates.delete(setAmbient);
  if (ambientCandidates.size > 0 && ambientClock === undefined) scheduleAmbientBurst();
}

// HoleA.I (from Vincent's bot app): a poke plays for its length (spin 0.9 s, bounce 0.62 s, nod 0.5 s), and a
// face that stops moving keeps its clock this long so it settles instead of freezing mid-motion.
const POKE_PLAY_MS = 1_000;
const SETTLE_TAIL_MS = 1_400;
// The bot app's hover gaze: the pointer offset over half the face's width, clamped to [-1, 1].
const GAZE_REACH = 0.5;

// Decor rings are sampled from the `orbit` pose, not played as a state: `orbit`
// replaces the body, while sampling only `frame.arcs` keeps the silhouette.
const RING_POSE = "orbit";

// Motions that rest until pointer/focus arrives. The sidebar is not virtualized, so every
// row would otherwise animate on screen; idle-window profiles showed 83 recalcs/s from
// four resting avatars. A mood with its own motion keeps animating as the busy signal.
const STATIC_MOTIONS: ReadonlySet<AvatarMotion> = new Set(["hover", "idle"]);

// Hover group lookup: the first `[data-avatar-hover]`/control ancestor, since dialogs and
// scroll regions with `[tabindex]` are too wide to count as one.
const HOVER_GROUP = "[data-avatar-hover], button, a, [role='button'], [role='link'], [role='menuitem']";

interface AgentAvatarProps {
  agent?: Pick<AgentProfile, "avatarSeed" | "avatarHue" | "avatarUrl"> | undefined;
  seed?: string | undefined;
  hue?: AvatarHue | null;
  url?: string | null | undefined;
  motion?: AvatarMotion;
  /** What the agent is doing. It chooses the face, never the silhouette. */
  mood?: AvatarFaceMood;
  cycleOffset?: number;
  animationOffset?: number;
  shape?: SupportedAvatarSilhouetteId;
  /**
   * The eyes follow the pointer, and a press makes the agent nod. The avatar then moves without hover,
   * so use it only where few avatars show. A photo avatar and reduced motion ignore it.
   */
  followPointer?: boolean;
  /** A bot-mark state that overrides the mood's, such as the step a working agent is on. */
  state?: BotMarkState | undefined;
  /** The eye colour of a generated face; omitted, the eyes are cut out of the body. */
  eyeColor?: string | undefined;
  class?: string;
  style?: Record<string, string>;
}

export function AgentAvatar(props: AgentAvatarProps) {
  const seed = () => props.seed ?? props.agent?.avatarSeed ?? "agent";
  const hue = () => (props.hue !== undefined ? props.hue : (props.agent?.avatarHue ?? null));
  const motion = () => props.motion ?? "hover";
  const url = () => (props.url !== undefined ? props.url : (props.agent?.avatarUrl ?? null));
  const mood = (): AvatarFaceMood => props.mood ?? "idle";
  const presentation = () => avatarMoodPresentation(mood());
  const [imageFailed, setImageFailed] = createSignal(false);
  // HoleA.I: a server photo can fail while the server is still connecting, and a tile drawn then kept
  // the generated face for good. Retry a few times with a growing wait before settling on it.
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  const imageLoadFailed = () => {
    setImageFailed(true);
    if (failures >= AVATAR_IMAGE_RETRIES) return;
    retryTimer = setTimeout(() => setImageFailed(false), AVATAR_IMAGE_RETRY_MS * 2 ** failures);
    failures += 1;
  };
  onCleanup(() => clearTimeout(retryTimer));
  createEffect(
    () => url(),
    () => {
      clearTimeout(retryTimer);
      failures = 0;
      setImageFailed(false);
    },
  );
  const className = () => `agent-avatar agent-avatar-motion-${motion()} ${props.class ?? ""}`;
  // The custom property rides with the attribute rather than being set on every avatar: the
  // keyframe is an infinite animation, and a selector that matched all of them would start one
  // behind every resting row in the sidebar.
  const breathe = () => (presentation().breathe > 0 ? String(presentation().breathe) : undefined);
  const style = (): Record<string, string> => {
    const amount = breathe();
    return amount ? { ...props.style, "--agent-avatar-breathe": amount } : { ...props.style };
  };
  return (
    <Show
      when={url() && !imageFailed()}
      fallback={
        <GeneratedAvatar
          seed={seed()}
          hue={hue()}
          motion={motion()}
          mood={mood()}
          cycleOffset={props.cycleOffset}
          animationOffset={props.animationOffset}
          shape={props.shape}
          followPointer={props.followPointer === true}
          state={props.state}
          eyeColor={props.eyeColor}
          breathe={breathe()}
          class={className()}
          style={style()}
        />
      }
    >
      <span
        class={`${className()} agent-avatar-custom`}
        style={style()}
        data-avatar="image"
        data-mood={mood()}
        data-breathe={breathe()}
        aria-hidden="true"
      >
        {/* A photo cannot wear an expression, so the Bloub's own decor carries the mood around it.
            A working agent used to hide behind three dots, which hid the one thing the person
            chose; it now keeps its face and flies the same rings the generated avatar does. */}
        <AvatarRings when={presentation().rings}>
          <AvatarImage url={url()} onFailed={imageLoadFailed} />
        </AvatarRings>
      </span>
    </Show>
  );
}

function AvatarImage(props: { url: string | null; onFailed: () => void }) {
  return <img src={props.url ?? ""} alt="" draggable={false} onError={() => props.onFailed()} />;
}

/**
 * Orbit rings drawn around the avatar instead of in place of it, sampled from a second
 * engine so a working avatar keeps its silhouette (`orbit` as a state is not shape-safe).
 */
function AvatarRings(props: { when: boolean; children: JSX.Element }) {
  return (
    <Show when={props.when} fallback={props.children}>
      <OrbitRings>{props.children}</OrbitRings>
    </Show>
  );
}

function OrbitRings(props: { children: JSX.Element }) {
  let elapsed = POSES[RING_POSE];
  let ringsSeen = false;
  let anchor: SVGSVGElement | undefined;
  const engine = new BotEngine(RAYON, RING_POSE);
  const [arcs, setArcs] = createSignal<BotFrame["arcs"]>(engine.sample(elapsed).arcs, { equals: false });

  onSettled(() => {
    if (prefersReducedMotion()) return;
    let handle = 0;
    let previousFrameAt = 0;
    let drawnAt = -Infinity;
    const step = (now: number) => {
      handle = requestAnimationFrame(step);
      elapsed += previousFrameAt ? Math.min((now - previousFrameAt) / 1000, 0.064) : 0;
      previousFrameAt = now;
      if (elapsed - drawnAt < 1 / AVATAR_FPS) return;
      drawnAt = elapsed;
      let sampled = engine.sample(elapsed);
      // A pose plays once, and its rings fade out before it ends - orbit holds them for 3.6s of a
      // 4.3s block. So the pose restarts on the frame its rings run out, which is the engine's own
      // measure of the cycle rather than a duration restated here.
      if (ringsSeen && sampled.arcs.length === 0) {
        ringsSeen = false;
        engine.reset(RING_POSE, elapsed);
        sampled = engine.sample(elapsed);
      }
      ringsSeen ||= sampled.arcs.length > 0;
      setArcs(sampled.arcs);
    };
    const stop = () => {
      if (!handle) return;
      cancelAnimationFrame(handle);
      handle = 0;
    };
    const start = () => {
      if (handle) return;
      // The clock restarts from the next frame, so a row that scrolls back in resumes where it
      // stopped rather than jumping forward by the time it spent out of sight.
      previousFrameAt = 0;
      handle = requestAnimationFrame(step);
    };
    // A `BloubBot` pauses itself off screen through its own observer. These rings are our loop, so
    // without the same gate every working row in a long sidebar keeps sampling an engine and
    // writing paths that nobody can see.
    const observer =
      anchor && window.IntersectionObserver
        ? new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting) start();
            else stop();
          })
        : undefined;
    if (observer && anchor) observer.observe(anchor);
    else start();
    return () => {
      observer?.disconnect();
      stop();
    };
  });

  return (
    <>
      <AvatarArcs arcs={arcs()} half="back" ref={(element) => (anchor = element)} />
      {props.children}
      <AvatarArcs arcs={arcs()} half="front" />
    </>
  );
}

function AvatarArcs(props: { arcs: BotFrame["arcs"]; half: "back" | "front"; ref?: (element: SVGSVGElement) => void }) {
  const gradientId = createUniqueId();
  return (
    <svg
      ref={props.ref}
      class="agent-avatar-arcs"
      viewBox={`${-DEMI_VIEWBOX} ${-DEMI_VIEWBOX} ${DEMI_VIEWBOX * 2} ${DEMI_VIEWBOX * 2}`}
      fill="none"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <defs>
        <For each={props.arcs} keyed={false}>
          {(arc) => (
            <linearGradient
              id={`${gradientId}-${arc().id}`}
              gradientUnits="userSpaceOnUse"
              x1={arc().grad.x1}
              y1={arc().grad.y1}
              x2={arc().grad.x2}
              y2={arc().grad.y2}
            >
              <For each={arc().grad.stops} keyed={false}>
                {(stop, index) => (
                  <stop offset={index / Math.max(1, arc().grad.stops.length - 1)} stop-color={stop()} />
                )}
              </For>
            </linearGradient>
          )}
        </For>
      </defs>
      <For each={props.arcs} keyed={false}>
        {(arc) => (
          <path
            d={props.half === "back" ? arc().back : arc().front}
            stroke={`url(#${gradientId}-${arc().id})`}
            stroke-width={arc().width}
            opacity={arc().opacity}
          />
        )}
      </For>
    </svg>
  );
}

function GeneratedAvatar(props: {
  seed: string;
  hue: AvatarHue | null;
  motion: AvatarMotion;
  mood: AvatarFaceMood;
  cycleOffset?: number | undefined;
  animationOffset?: number | undefined;
  shape?: SupportedAvatarSilhouetteId | undefined;
  followPointer: boolean;
  state?: BotMarkState | undefined;
  eyeColor?: string | undefined;
  breathe?: string | undefined;
  class: string;
  style?: Record<string, string>;
}) {
  let element: HTMLSpanElement | undefined;
  const [mark, setMark] = createSignal<BotMarkHandle | undefined>(undefined, { equals: false });
  const [interacting, setInteracting] = createSignal(false);
  const [ambient, setAmbient] = createSignal(false);
  const [poking, setPoking] = createSignal(false);
  const [stageEmphasis, setStageEmphasis] = createSignal(false);
  const [settling, setSettling] = createSignal(false);
  const [reducedMotion, setReducedMotion] = createSignal(prefersReducedMotion());
  const presentation = createMemo(() => avatarMoodPresentation(props.mood));
  // A mood that carries its own motion has to be seen without being pointed at, and so do eyes that
  // follow the pointer; the resting moods keep the hover gating that the perf note above is about.
  const moving = () =>
    !reducedMotion() &&
    (props.followPointer ||
      avatarMoodIsBusy(props.mood) ||
      !STATIC_MOTIONS.has(props.motion) ||
      interacting() ||
      ambient() ||
      poking() ||
      stageEmphasis());
  // HoleA.I (from Vincent's bot app): a face that stops keeps its clock for a moment, so it settles.
  createEffect(moving, (on, before) => {
    if (on || !before) {
      setSettling(false);
      return;
    }
    setSettling(true);
    const timer = setTimeout(() => setSettling(false), SETTLE_TAIL_MS);
    return () => clearTimeout(timer);
  });
  const animated = () => moving() || (settling() && !reducedMotion());
  // Hover emphasis: the surprised face, while this face or any copy of it on the stage is pointed at.
  createEffect(
    () => [mark(), interacting() || stageEmphasis()] as const,
    ([handle, emphasized]) => handle?.setEmphasized(emphasized),
  );
  // Every copy of this face on screen takes the pokes and hover emphasis of the others.
  let pokeTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect(
    () => props.seed,
    (seed) =>
      joinMarkStage(seed, {
        poke: (kind) => {
          if (reducedMotion()) return;
          setPoking(true);
          mark()?.poke(kind);
          clearTimeout(pokeTimer);
          pokeTimer = setTimeout(() => setPoking(false), POKE_PLAY_MS);
        },
        emphasize: setStageEmphasis,
      }),
  );
  onCleanup(() => clearTimeout(pokeTimer));

  onSettled(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setReducedMotion(media?.matches ?? false);
    syncReducedMotion();
    media?.addEventListener?.("change", syncReducedMotion);

    // What must be hovered or focused for a resting avatar to move: the control the avatar sits in or
    // beside, marked with `data-avatar-hover` when the avatar is only a neighbour of it. A dialog and a
    // scroll region are focusable as well, and taking one of those would start every avatar on it at once.
    const group = element?.closest<HTMLElement>(`${HOVER_GROUP}, [tabindex]`);
    const interactionTarget = group?.matches(HOVER_GROUP) ? group : element;
    const startInteraction = () => setInteracting(true);
    const stopInteraction = () => {
      setInteracting(false);
      lookAt(null);
    };
    // HoleA.I (from Vincent's bot app): while the pointer is over the face's control, the engine turns the
    // body and eyes toward it, and a press pokes every copy of the face: spin, then bounce, then nod.
    const lookAt = (pointer: { x: number; y: number } | null) => {
      const handle = mark();
      if (!element || !handle || props.followPointer) return;
      if (!pointer) {
        handle.gaze(null);
        return;
      }
      const box = element.getBoundingClientRect();
      const reach = Math.max(1, box.width * GAZE_REACH);
      const clamp = (value: number) => Math.min(1, Math.max(-1, value));
      handle.gaze([
        clamp((pointer.x - (box.left + box.width / 2)) / reach),
        clamp(-(pointer.y - (box.top + box.height / 2)) / reach),
      ]);
    };
    const followPointer = (event: Event) => {
      if (event instanceof PointerEvent) lookAt({ x: event.clientX, y: event.clientY });
    };
    const poke = () => {
      if (!reducedMotion()) pokeMark(props.seed);
    };
    const pointerScope: HTMLElement | Window | undefined = props.followPointer ? window : interactionTarget;
    // Only keyboard focus starts the avatar. A click leaves the focus on the button it lands on, such as
    // the sidebar row of the open channel, and the window gives that button `focusin` again each time it
    // comes back to the front. No pointer is there to leave, so the avatar moved until the next click.
    const startFocusInteraction = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.matches(":focus-visible")) startInteraction();
    };
    const stopFocusInteraction = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !interactionTarget?.contains(event.relatedTarget)) {
        stopInteraction();
      }
    };
    interactionTarget?.addEventListener("pointerenter", startInteraction);
    interactionTarget?.addEventListener("pointerleave", stopInteraction);
    pointerScope?.addEventListener("pointermove", followPointer, { passive: true });
    interactionTarget?.addEventListener("pointerdown", poke);
    interactionTarget?.addEventListener("focusin", startFocusInteraction);
    interactionTarget?.addEventListener("focusout", stopFocusInteraction);

    // Only an avatar on screen is in the draw for the shared ambient burst.
    const observer =
      element && typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => setAmbientCandidate(setAmbient, entry?.isIntersecting ?? false))
        : undefined;
    if (element) observer?.observe(element);

    return () => {
      setAmbientCandidate(setAmbient, false);
      setAmbient(false);
      observer?.disconnect();
      media?.removeEventListener?.("change", syncReducedMotion);
      interactionTarget?.removeEventListener("pointerenter", startInteraction);
      interactionTarget?.removeEventListener("pointerleave", stopInteraction);
      pointerScope?.removeEventListener("pointermove", followPointer);
      interactionTarget?.removeEventListener("pointerdown", poke);
      clearTimeout(pokeTimer);
      interactionTarget?.removeEventListener("focusin", startFocusInteraction);
      interactionTarget?.removeEventListener("focusout", stopFocusInteraction);
    };
  });

  return (
    <span
      ref={element}
      class={`${props.class} agent-avatar-bloub`}
      style={props.style}
      data-avatar="generated"
      data-mood={props.mood}
      data-breathe={props.breathe}
      aria-hidden="true"
    >
      <AvatarRings when={presentation().rings}>
        <BotMarkFace
          seed={props.seed}
          color={avatarHeadColor(props.seed, props.hue)}
          mood={props.mood}
          playing={animated()}
          followPointer={props.followPointer}
          state={props.state}
          eyeColor={props.eyeColor}
          handle={setMark}
        />
      </AvatarRings>
    </span>
  );
}
