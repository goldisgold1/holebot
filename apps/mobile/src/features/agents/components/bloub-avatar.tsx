import { bloubAvatarProfile } from "@openbot/brand/bloub-avatar";
import { type AvatarMood, avatarMoodPresentation } from "@openbot/brand/bloub-avatar-motion";
import { CUTE_FACE_EYE, CUTE_FACE_EYES, cuteFaceBody, cuteFaceClosedEyes } from "@openbot/brand/cute-face";
import type { AvatarHue } from "@openbot/contracts/ipc";
import { memo, useEffect } from "react";
import Animated, {
  convertToRGBA,
  type DerivedValue,
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
import Svg, { Ellipse, Path } from "react-native-svg";
import { useAgentColorTransition } from "@/features/agents/components/agent-color-glow";
import { AgentOrbitRings } from "@/features/agents/components/agent-orbit-rings";
import { getBloubAvatarColor } from "@/features/agents/model/bloub-activity";
import { useAgentActivity } from "@/features/workspace/components/use-agent-activity";
import {
  DISCONNECTED_APPEARANCE,
  useConnectionAppearance,
} from "@/features/workspace/components/use-connection-appearance";
import { useMobileWorkspaceSelector } from "@/features/workspace/context/mobile-workspace-context";
import { agentActivityMood } from "@/features/workspace/model/agent-activity";
import { showsOnline } from "@/features/workspace/model/server-status";
import { AgentPhoto, type AgentPhotoProps } from "./agent-photo";

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
const FACE_EYE = "#f9f9f9";
// Where the eyes glance, in face units: they hold each spot and jump to the next, like the desktop face.
const GLANCES = [
  [0, 0],
  [-5, -1],
  [4, 1],
  [-2, 3],
  [3, -2],
  [0, 0],
] as const;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

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
  animatedColor,
}: Omit<BloubAvatarProps, "agentId"> & AvatarPreviewOptions) {
  const appearance = useConnectionAppearance(disconnected);
  const appearanceStyle = useAnimatedStyle(() => ({ opacity: appearance.get().opacity }));
  const color = getBloubAvatarColor(seed, hue);
  const bodyColor = useDerivedValue(() =>
    saturateColor(animatedColor ? animatedColor.get() : color, appearance.get().saturation),
  );
  const thinking = !disconnected && (mood === "working" || mood === "connecting");
  const animate = (animateIdle || thinking) && !disconnected;
  const blink = useSharedValue(1);
  const bob = useSharedValue(0);
  const wander = useSharedValue(0);
  const glance = useSharedValue(0);
  useEffect(() => {
    if (!animate) {
      blink.set(1);
      bob.set(0);
      return;
    }
    blink.set(
      withRepeat(
        withSequence(withDelay(2800, withTiming(0.1, { duration: 90 })), withTiming(1, { duration: 120 })),
        -1,
      ),
    );
    bob.set(withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })), -1));
  }, [animate, blink, bob]);
  useEffect(() => {
    if (!animate) {
      glance.set(0);
      return;
    }
    const hold = thinking ? 220 : 850;
    glance.set(
      withRepeat(
        withSequence(...GLANCES.slice(1).map((_, index) => withDelay(hold, withTiming(index + 1, { duration: 110 })))),
        -1,
      ),
    );
  }, [animate, thinking, glance]);
  // Thinking: the face wanders around its spot, in place of orbit rings.
  useEffect(() => {
    wander.set(thinking ? withRepeat(withTiming(Math.PI * 2, { duration: 2400 }), -1) : withTiming(0));
  }, [thinking, wander]);
  const bobStyle = useAnimatedStyle(() => {
    const turn = wander.get();
    return {
      transform: [
        { translateX: Math.sin(turn) * size * 0.06 },
        { translateY: -bob.get() * size * 0.03 - Math.abs(Math.sin(turn)) * size * 0.05 },
        { rotate: `${Math.sin(turn) * 6}deg` },
      ],
    };
  });

  // The opacity stays on the native view: react-native-svg on Android crashes with
  // "Underflow in restore" when a filtered <G> has an opacity other than 1.
  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size }, appearanceStyle, bobStyle]}>
      <CuteFaceSvg seed={seed} mood={mood} size={size} color={bodyColor} blink={blink} glance={glance} />
    </Animated.View>
  );
});

function CuteFaceSvg({
  seed,
  mood,
  size,
  color,
  blink,
  glance,
  opacity = 1,
}: {
  seed: string;
  mood: AvatarMood;
  size: number;
  color: DerivedValue<string> | string;
  blink?: SharedValue<number>;
  glance?: SharedValue<number>;
  opacity?: number;
}) {
  const body = cuteFaceBody(bloubAvatarProfile(seed, null).shape);
  const closedEyes = cuteFaceClosedEyes(mood);
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
      <FaceBody d={body} color={color} />
      {closedEyes ? (
        <Path d={closedEyes} fill="none" stroke={FACE_EYE} strokeWidth={4.5} strokeLinecap="round" />
      ) : (
        CUTE_FACE_EYES.map((x) => <FaceEye key={x} x={x} up={mood === "waiting"} blink={blink} glance={glance} />)
      )}
      {mood === "asleep" ? (
        <Path d="M 30 -36 h 9 l -9 10 h 9" fill="none" stroke={FACE_EYE} strokeWidth={2.6} opacity={0.7} />
      ) : null}
    </Svg>
  );
}

function FaceBody({ d, color }: { d: string; color: DerivedValue<string> | string }) {
  const props = useAnimatedProps(() => ({ fill: typeof color === "string" ? color : color.get() }));
  return <AnimatedPath d={d} animatedProps={props} />;
}

function FaceEye({
  x,
  up,
  blink,
  glance,
}: {
  x: number;
  up: boolean;
  blink?: SharedValue<number> | undefined;
  glance?: SharedValue<number> | undefined;
}) {
  const cy = CUTE_FACE_EYE.cy - (up ? 3 : 0);
  const eyeProps = useAnimatedProps(() => {
    const at = glance ? glance.get() : 0;
    const index = Math.min(Math.floor(at), GLANCES.length - 2);
    const step = at - index;
    const from = GLANCES[index] ?? GLANCES[0];
    const to = GLANCES[index + 1] ?? GLANCES[0];
    return {
      cx: x + from[0] + (to[0] - from[0]) * step,
      cy: cy + from[1] + (to[1] - from[1]) * step,
      ry: CUTE_FACE_EYE.ry * (blink ? blink.get() : 1),
    };
  });
  return <AnimatedEllipse rx={CUTE_FACE_EYE.rx} fill={FACE_EYE} animatedProps={eyeProps} />;
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
  const color = thumbnailColor(getBloubAvatarColor(seed, hue), disconnected);
  const opacity = disconnected ? DISCONNECTED_APPEARANCE.opacity : 1;
  return animateColor ? (
    <AnimatedThumbnailFace seed={seed} size={size} color={color} opacity={opacity} />
  ) : (
    <CuteFaceSvg seed={seed} mood="idle" size={size} color={color} opacity={opacity} />
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
