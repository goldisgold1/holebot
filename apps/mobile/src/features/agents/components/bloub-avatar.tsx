import { avatarHeadColor } from "@openbot/brand/bloub-avatar";
import { type AvatarMood, avatarMoodIsBusy, avatarMoodPresentation } from "@openbot/brand/bloub-avatar-motion";
import { type BotEye, botClosedEyes, botToken } from "@openbot/brand/cute-face";
import type { AvatarHue } from "@openbot/contracts/ipc";
import { memo, useEffect, useMemo } from "react";
import { Platform, View } from "react-native";
import Animated, {
  cancelAnimation,
  convertToRGBA,
  type DerivedValue,
  Easing,
  ReduceMotion,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { G, Path, Rect } from "react-native-svg";
import { useAgentColorTransition } from "@/features/agents/components/agent-color-glow";
import { AgentOrbitRings } from "@/features/agents/components/agent-orbit-rings";
import { getBloubAvatarColor } from "@/features/agents/model/bloub-activity";
import {
  BLINK_MS,
  blinkOpenness,
  type FacePose,
  faceRhythm,
  GAZE_JUMP_MS,
  POSE_MS,
  SWAY_CYCLE_MS,
} from "@/features/agents/model/face-motion";
import { useAgentActivity } from "@/features/workspace/components/use-agent-activity";
import {
  DISCONNECTED_APPEARANCE,
  useConnectionAppearance,
} from "@/features/workspace/components/use-connection-appearance";
import { useMobileWorkspaceSelector } from "@/features/workspace/context/mobile-workspace-context";
import { agentActivityMood } from "@/features/workspace/model/agent-activity";
import { showsOnline } from "@/features/workspace/model/server-status";
import { useReducedMotion } from "@/shared/lib/motion";
import { AgentPhoto, type AgentPhotoProps } from "./agent-photo";
import { BotMarkFace } from "./bot-mark-face";

interface BloubAvatarProps extends AgentPhotoProps {
  agentId: string;
  hue: AvatarHue | null;
  seed: string;
  size?: number;
  animateIdle?: boolean;
  /** Turns the desktop's orbit rings around the avatar while the agent works. */
  rings?: boolean;
}

// HoleA.I: the Grok Bot style face (see @openbot/brand/cute-face), the same drawing as the desktop.
const FACE_EYE = "#151515";
// The face is drawn in a 140-unit box, and the body's bottom edge is about 45 units under its centre.
const FACE_BOX = 140;
const FACE_SEAT = 45;
// A shut eye keeps a thin line, so the face never loses its eyes mid-blink.
const EYE_SHUT = 0.1;
const POSE_EASING = Easing.bezier(0.42, 0, 0.58, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function BloubAvatar({
  agentId,
  serverId: hostId,
  hue,
  seed,
  size = 54,
  animateIdle = true,
  rings = false,
}: BloubAvatarProps) {
  const serverId = useMobileWorkspaceSelector(
    (workspace) => hostId ?? workspace.agents.find((agent) => agent.id === agentId)?.serverId,
  );
  const disconnected = useMobileWorkspaceSelector(
    (workspace) => !workspace.servers.some((server) => server.id === serverId && showsOnline(server)),
  );
  const activity = useAgentActivity(agentId);
  return (
    <BloubAvatarPreview
      agentId={agentId}
      serverId={serverId}
      hue={hue}
      seed={seed}
      size={size}
      animateIdle={animateIdle}
      rings={rings}
      disconnected={disconnected}
      mood={disconnected ? "idle" : agentActivityMood(activity)}
    />
  );
}

interface AvatarPreviewOptions {
  disconnected?: boolean;
  mood?: AvatarMood;
  /** Eases the body to a new colour instead of swapping it. The value must hold this avatar's colour. */
  animatedColor?: SharedValue<string>;
}

export const BloubAvatarPreview = memo(function BloubAvatarPreview(
  props: Omit<BloubAvatarProps, "agentId"> & AgentPhotoProps & AvatarPreviewOptions,
) {
  const size = props.size ?? 54;
  const avatar = (
    <AgentPhoto {...props} size={size}>
      <AnimatedAvatarPreview {...props} />
    </AgentPhoto>
  );
  if (!props.rings) return avatar;
  // The ring wrapper stays mounted when work starts and stops, so the face keeps its glide.
  return (
    <AgentOrbitRings active={!props.disconnected && avatarMoodPresentation(props.mood ?? "idle").rings} size={size}>
      {avatar}
    </AgentOrbitRings>
  );
});

const AnimatedAvatarPreview = memo(function AnimatedAvatarPreview({
  hue,
  seed,
  size = 54,
  disconnected = false,
  mood = "idle",
  animateIdle = true,
}: Omit<BloubAvatarProps, "agentId"> & AvatarPreviewOptions) {
  const appearance = useConnectionAppearance(disconnected);
  const appearanceStyle = useAnimatedStyle(() => ({ opacity: appearance.get().opacity }));
  const color = getBloubAvatarColor(seed, hue);
  const reducedMotion = useReducedMotion();
  const busy = !disconnected && avatarMoodIsBusy(mood);
  const animate = (animateIdle || busy) && !disconnected && !reducedMotion;
  const face = useFaceMotion(seed, disconnected ? "idle" : mood, animate);
  const unit = size / FACE_BOX;
  const bodyStyle = useAnimatedStyle(() => {
    const [rot = 0, tx = 0, ty = 0, squash = 1, swayRot = 0, swayTx = 0, swayTy = 0, swaySquash = 0, hop = 0] =
      face.pose.get();
    const turn = face.clock.get();
    const mix = face.swayMix.get();
    const from = face.swayFrom.get();
    const to = face.swayTo.get();
    // Each part of the sway runs at its own speed and phase, so the body never moves on one line.
    const wave = (speed: number, shift: number) =>
      Math.sin(from * speed * turn + shift) * (1 - mix) + Math.sin(to * speed * turn + shift) * mix;
    const stretch = squash + swaySquash * wave(2, 0);
    const lift = ty + swayTy * wave(2, 0.6) - hop * Math.abs(wave(1, 0));
    return {
      transform: [
        { translateX: (tx + swayTx * wave(1, 1.3)) * unit },
        // The body squashes on its seat, so its bottom edge stays where it is.
        { translateY: (lift + (1 - stretch) * FACE_SEAT) * unit },
        { rotate: `${rot + swayRot * wave(1, 0)}deg` },
        { scaleX: 2 - stretch },
        { scaleY: stretch },
      ],
    };
  });

  // The opacity stays on the native view: react-native-svg on Android crashes with
  // "Underflow in restore" when a filtered <G> has an opacity other than 1.
  // HoleA.I (Vincent, Nov 4 2026): the desktop's face (the bot app's engine). On the web the engine plays
  // its own motion; in the native app its still frame rides the mood's sway above.
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ width: size, height: size }, appearanceStyle, Platform.OS === "web" ? null : bodyStyle]}
    >
      <BotMarkFace
        seed={seed}
        color={disconnected ? thumbnailColor(color, true) : avatarHeadColor(seed, hue)}
        mood={disconnected ? "idle" : mood}
        size={size}
        playing={animate}
      />
    </Animated.View>
  );
});

interface FaceEyes {
  x: number;
  y: number;
  /** 1 is open, 0 shut; a little over 1 as the eye pops open after a blink. */
  open: number;
}

/**
 * Plays the face's own motion for a mood: blinks on the agent's own seeded rhythm, glances that stay
 * inside the body, and the mood's lean and sway. A still face holds the mood's lean with its eyes open
 * and centred. Each loop is a round of animations that repeats on the UI thread, so a list of faces
 * runs no JavaScript timers.
 */
function useFaceMotion(seed: string, mood: AvatarMood, animate: boolean) {
  const rhythm = useMemo(() => faceRhythm(seed, mood), [seed, mood]);
  const blink = useSharedValue(0);
  const glance = useSharedValue(0);
  const gazePoints = useSharedValue<number[]>(rhythm.gazePoints);
  const clock = useSharedValue(0);
  const pose = useSharedValue<number[]>(poseValues(rhythm.pose, animate));
  const swayFrom = useSharedValue(rhythm.sways);
  const swayTo = useSharedValue(rhythm.sways);
  const swayMix = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(blink);
    blink.set(0);
    if (!animate || rhythm.blinkWaits.length === 0) return;
    // One value counts the blinks of a round: each whole number is one blink.
    blink.set(
      withRepeat(
        withSequence(
          ...rhythm.blinkWaits.map((wait, index) =>
            withDelay(wait, withTiming(index + 1, { duration: BLINK_MS, easing: Easing.linear })),
          ),
        ),
        -1,
      ),
    );
  }, [animate, rhythm, blink]);
  useEffect(() => {
    cancelAnimation(glance);
    gazePoints.set(rhythm.gazePoints);
    glance.set(0);
    if (!animate || rhythm.gazeHolds.length === 0) return;
    glance.set(
      withRepeat(
        withSequence(
          ...rhythm.gazeHolds.map((hold, index) =>
            withDelay(hold, withTiming(index + 1, { duration: GAZE_JUMP_MS, easing: Easing.out(Easing.quad) })),
          ),
        ),
        -1,
      ),
    );
  }, [animate, rhythm, glance, gazePoints]);
  useEffect(() => {
    // The sway speed eases from the last mood's to this one's, so the body does not jump.
    swayFrom.set(swayTo.get());
    swayTo.set(rhythm.sways);
    swayMix.set(0);
    swayMix.set(withTiming(1, { duration: POSE_MS, easing: POSE_EASING }));
    pose.set(
      withTiming(poseValues(rhythm.pose, animate), {
        duration: POSE_MS,
        easing: POSE_EASING,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [animate, rhythm, pose, swayFrom, swayTo, swayMix]);
  useEffect(() => {
    cancelAnimation(clock);
    if (!animate) return;
    clock.set(0);
    clock.set(withRepeat(withTiming(Math.PI * 2, { duration: SWAY_CYCLE_MS, easing: Easing.linear }), -1));
  }, [animate, clock]);
  const eyes = useDerivedValue<FaceEyes>(() => {
    const points = gazePoints.get();
    const last = Math.max(0, points.length / 2 - 1);
    const at = Math.min(glance.get(), last);
    const index = Math.min(Math.floor(at), Math.max(0, last - 1));
    const step = at - index;
    const fromX = points[index * 2] ?? 0;
    const fromY = points[index * 2 + 1] ?? 0;
    const toX = points[index * 2 + 2] ?? fromX;
    const toY = points[index * 2 + 3] ?? fromY;
    return {
      x: fromX + (toX - fromX) * step,
      y: fromY + (toY - fromY) * step,
      open: Math.max(EYE_SHUT, blinkOpenness(blink.get())),
    };
  });
  return { eyes, clock, pose, swayFrom, swayTo, swayMix };
}

/** The pose as the flat list the body style reads. A still face keeps the lean but not the sway. */
function poseValues(pose: FacePose, moving: boolean): number[] {
  const sway = moving ? 1 : 0;
  return [
    pose.rot,
    pose.tx,
    pose.ty,
    pose.squash,
    pose.swayRot * sway,
    pose.swayTx * sway,
    pose.swayTy * sway,
    pose.swaySquash * sway,
    pose.hop * sway,
  ];
}

function CuteFaceSvg({
  seed,
  mood,
  size,
  color,
  eyes,
  opacity = 1,
}: {
  seed: string;
  mood: AvatarMood;
  size: number;
  color: DerivedValue<string> | string;
  eyes?: DerivedValue<FaceEyes>;
  opacity?: number;
}) {
  const token = useMemo(() => botToken(seed), [seed]);
  const closedEyes = botClosedEyes(token, mood);
  return (
    <Svg
      accessibilityElementsHidden
      accessible={false}
      height={size}
      opacity={opacity}
      pointerEvents="none"
      viewBox="-70 -70 140 140"
      width={size}
    >
      <G transform="translate(-50 -50)">
        {token.slices.map((slice) => (
          <FaceBody key={slice.transform} d={token.shape.body.path} transform={slice.transform} color={color} />
        ))}
        <G transform={token.front}>
          {closedEyes ? (
            <Path d={closedEyes} fill="none" stroke={FACE_EYE} strokeWidth={4.5} strokeLinecap="round" />
          ) : (
            token.eyes.map((eye) => <FaceEye key={eye.x} eye={eye} up={mood === "waiting"} eyes={eyes} />)
          )}
        </G>
        {mood === "asleep" ? (
          <Path d="M 80 12 h 8 l -8 9 h 8" fill="none" stroke={FACE_EYE} strokeWidth={2.6} opacity={0.7} />
        ) : null}
      </G>
    </Svg>
  );
}

function FaceBody({ d, transform, color }: { d: string; transform: string; color: DerivedValue<string> | string }) {
  const props = useAnimatedProps(() => ({ fill: typeof color === "string" ? color : color.get() }));
  return <AnimatedPath d={d} transform={transform} fillRule="evenodd" animatedProps={props} />;
}

function FaceEye({ eye, up, eyes }: { eye: BotEye; up: boolean; eyes?: DerivedValue<FaceEyes> | undefined }) {
  const top = eye.y - (up ? 3 : 0);
  const eyeProps = useAnimatedProps(() => {
    const at = eyes?.get();
    const height = eye.height * (at?.open ?? 1);
    return {
      x: eye.x + (at?.x ?? 0),
      // A blink shuts the pill toward its middle.
      y: top + (at?.y ?? 0) + (eye.height - height) / 2,
      height,
    };
  });
  return <AnimatedRect width={eye.width} rx={eye.width / 2} fill={FACE_EYE} animatedProps={eyeProps} />;
}

// Choices show the same idle pose without mounting animation clocks, worklets,
// filters, or masks for every item in the picker.
export const BloubAvatarThumbnail = memo(function BloubAvatarThumbnail(
  props: Omit<BloubAvatarProps, "agentId"> & AgentPhotoProps & { disconnected?: boolean },
) {
  return (
    <AgentPhoto {...props} size={props.size ?? 48}>
      <AvatarThumbnail {...props} />
    </AgentPhoto>
  );
});

// Draws the idle pose without the photo lookup, for pickers that never show a photo.
export const AvatarThumbnail = memo(function AvatarThumbnail({
  seed,
  hue,
  size = 48,
  disconnected = false,
  animateColor = false,
}: Omit<BloubAvatarProps, "agentId"> & {
  disconnected?: boolean;
  /** Eases the body to a new colour, for a picker where the colour changes in place. */
  animateColor?: boolean;
}) {
  const color = thumbnailColor(avatarHeadColor(seed, hue), disconnected);
  const opacity = disconnected ? DISCONNECTED_APPEARANCE.opacity : 1;
  return animateColor ? (
    <AnimatedThumbnailFace seed={seed} size={size} color={color} opacity={opacity} />
  ) : (
    <View style={{ opacity }}>
      <BotMarkFace seed={seed} color={color} mood="idle" size={size} playing={false} />
    </View>
  );
});

function AnimatedThumbnailFace(props: { seed: string; size: number; color: string; opacity: number }) {
  const animated = useAgentColorTransition(props.color);
  return <CuteFaceSvg seed={props.seed} mood="idle" size={props.size} color={animated} opacity={props.opacity} />;
}

function saturateColor(color: string, saturation: number) {
  "worklet";
  if (saturation >= 1) return color;
  const [r, g, b, a] = convertToRGBA(color);
  const gray = r * 0.213 + g * 0.715 + b * 0.072;
  const channel = (value: number) => Math.round((gray + (value - gray) * saturation) * 255);
  return `rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${a})`;
}

export function thumbnailColor(color: string, disconnected: boolean) {
  return disconnected ? saturateColor(color, DISCONNECTED_APPEARANCE.saturation) : color;
}
