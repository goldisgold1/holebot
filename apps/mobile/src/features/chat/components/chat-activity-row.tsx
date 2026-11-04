import type { AvatarMood } from "@openbot/brand/bloub-avatar-motion";
import type { LucideIcon } from "lucide-react-native";
import BookOpen from "lucide-react-native/icons/book-open";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Globe from "lucide-react-native/icons/globe";
import Hourglass from "lucide-react-native/icons/hourglass";
import ListChecks from "lucide-react-native/icons/list-checks";
import Monitor from "lucide-react-native/icons/monitor";
import MousePointerClick from "lucide-react-native/icons/mouse-pointer-click";
import NotebookPen from "lucide-react-native/icons/notebook-pen";
import PencilLine from "lucide-react-native/icons/pencil-line";
import Sparkles from "lucide-react-native/icons/sparkles";
import Users from "lucide-react-native/icons/users";
import Wrench from "lucide-react-native/icons/wrench";
import { useRef } from "react";
import { type ColorValue, Pressable, View } from "react-native";
import Animated, { Easing, ReduceMotion, withSpring, withTiming } from "react-native-reanimated";
import { BloubAvatarPreview } from "@/features/agents/components/bloub-avatar";
import type { MobileAgent } from "@/features/workspace/model/workspace-types";
import { haptics } from "@/shared/lib/haptics";
import { usePressScale } from "@/shared/lib/press-scale";
import { useText } from "@/shared/lib/text";
import {
  type ActivityKind,
  thinkingPhraseKey,
  thinkingPhrasesAvailable,
  turnPhraseDraw,
} from "../model/activity-label";
import { ThinkingTextGradient } from "./thinking-text-gradient";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// The fade carries the state change, so it survives reduced motion. The rise and the settle are
// decoration and stop with the system setting.
const FADE_IN = {
  duration: 260,
  easing: EASE_OUT,
  reduceMotion: ReduceMotion.Never,
};
const MOVE_IN = {
  duration: 260,
  easing: EASE_OUT,
  reduceMotion: ReduceMotion.System,
};
const FADE_OUT = {
  duration: 180,
  easing: EASE_OUT,
  reduceMotion: ReduceMotion.Never,
};
const MOVE_OUT = {
  duration: 180,
  easing: EASE_OUT,
  reduceMotion: ReduceMotion.System,
};
// The bot app's activity line: one line beside a 28 pt face, 12 pt apart. A long commentary step ends with an
// ellipsis rather than making the row tall; a tap opens every thought of the turn.
const LABEL_LINES = 1;
const MARK_SIZE = 28;
/** How far a new label rises into place, and how long it takes, as in the bot app. */
const LABEL_RISE = 5;
const LABEL_IN = { duration: 350, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
const LABEL_FADE_IN = { ...LABEL_IN, reduceMotion: ReduceMotion.Never };
// The face grows in from nothing on a soft spring (the bot app's mark arrival: 340 ms, damping ratio 0.82).
const MARK_ARRIVAL = { duration: 340, dampingRatio: 0.82, reduceMotion: ReduceMotion.System };
const KIND_ICONS: Readonly<Record<ActivityKind, LucideIcon>> = {
  web: Globe,
  browser: MousePointerClick,
  memory: NotebookPen,
  skill: Sparkles,
  computer: Monitor,
  reading: BookOpen,
  checking: ListChecks,
  editing: PencilLine,
  teammate: Users,
  tool: Wrench,
  waiting: Hourglass,
};

function activityEntering() {
  "worklet";
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 12 }, { scale: 0.92 }],
    },
    animations: {
      opacity: withTiming(1, FADE_IN),
      transform: [{ translateY: withTiming(0, MOVE_IN) }, { scale: withTiming(1, MOVE_IN) }],
    },
  };
}

function labelEntering() {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ translateY: LABEL_RISE }] },
    animations: {
      opacity: withTiming(1, LABEL_FADE_IN),
      transform: [{ translateY: withTiming(0, LABEL_IN) }],
    },
  };
}

function markEntering() {
  "worklet";
  return {
    initialValues: { transform: [{ scale: 0 }] },
    animations: { transform: [{ scale: withSpring(1, MARK_ARRIVAL) }] },
  };
}

function activityExiting() {
  "worklet";
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      opacity: withTiming(0, FADE_OUT),
      transform: [{ translateY: withTiming(-6, MOVE_OUT) }, { scale: withTiming(0.94, MOVE_OUT) }],
    },
  };
}

/**
 * What the row shows for one agent. The list rebuilds it every render, and
 * {@link import("./use-activity-presence").useActivityPresence} keeps the last one while the next
 * signal for the same turn arrives, so `key` must identify the agent rather than the signal.
 */
export interface ChatActivitySpec {
  key: string;
  label: string;
  accessibilityLabel: string;
  agent?: Pick<MobileAgent, "id" | "serverId" | "avatarHue" | "avatarSeed">;
  mood: AvatarMood;
  online: boolean;
  animateAvatar: boolean;
  shimmer: boolean;
  /** The kind of step the agent runs, which picks the icon beside the label. */
  kind: ActivityKind | null;
  /** The label only says that the agent thinks, so the turn's phrase may take its place. */
  thinking: boolean;
  /** The turn the row shows, which keeps one phrase for the whole turn. Null before the host names it. */
  turn?: string | null;
  /** Opens every thought of the turn. Absent when the chat cannot show them. */
  onPress?: () => void;
}

export function ChatActivityRow({
  spec,
  foreground,
  muted,
}: {
  spec: ChatActivitySpec;
  foreground: ColorValue;
  muted: ColorValue;
}) {
  const { t, locale } = useText();
  const { onPress } = spec;
  const press = usePressScale(Boolean(onPress));
  // One phrase per turn, as in the bot app; a step the agent runs names itself instead.
  const draw = useTurnDraw(spec.key, spec.turn ?? null);
  const phrase = spec.thinking && thinkingPhrasesAvailable(locale) ? t(thinkingPhraseKey(draw)) : null;
  const label = phrase ?? spec.label;
  // The label rises in when what it names changes: the turn's phrase, or a step of another kind. A
  // commentary line that grows keeps its place.
  const labelKey = phrase ?? spec.kind ?? (spec.thinking ? "thinking" : "detail");
  const firstLabelKey = useRef(labelKey);
  const Icon = spec.kind ? KIND_ICONS[spec.kind] : null;
  // The same views with or without `onPress`, so the row does not enter again when its turn starts.
  return (
    <Animated.View entering={activityEntering} exiting={activityExiting}>
      <Pressable
        accessible
        accessibilityLiveRegion="polite"
        accessibilityRole={onPress ? "button" : "text"}
        accessibilityLabel={spec.accessibilityLabel}
        accessibilityHint={onPress ? t("mobile.chat.thinking.openHint") : undefined}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          if (!onPress) return;
          void haptics.selection();
          onPress();
        }}
      >
        <Animated.View className="flex-row items-center gap-3 px-1 py-2" style={press.style}>
          {spec.agent ? (
            <Animated.View entering={markEntering}>
              <BloubAvatarPreview
                agentId={spec.agent.id}
                serverId={spec.agent.serverId}
                hue={spec.agent.avatarHue}
                seed={spec.agent.avatarSeed}
                size={MARK_SIZE}
                disconnected={!spec.online}
                mood={spec.mood}
                animateIdle={spec.animateAvatar}
              />
            </Animated.View>
          ) : null}
          <Animated.View
            key={labelKey}
            entering={labelKey === firstLabelKey.current ? undefined : labelEntering}
            className="min-w-0 flex-1 flex-row items-center gap-1.5"
          >
            {Icon ? <Icon size={14} color={muted} /> : null}
            <View className="min-w-0 flex-1">
              <ThinkingTextGradient
                text={label}
                numberOfLines={LABEL_LINES}
                foreground={foreground}
                muted={muted}
                enabled={spec.shimmer}
              />
            </View>
          </Animated.View>
          {onPress ? <ChevronRight size={16} color={muted} /> : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * The phrase draw of the turn the row shows. The host may name the turn after the row appears, so the draw made
 * before then stays; only another turn draws again.
 */
function useTurnDraw(key: string, turn: string | null): number {
  const current = useRef<{ turn: string | null; draw: number } | null>(null);
  const kept = current.current;
  if (!kept || (kept.turn !== null && turn !== null && kept.turn !== turn)) {
    current.current = { turn, draw: turnPhraseDraw(`${key}:${turn ?? ""}`) };
  } else if (kept.turn === null && turn !== null) {
    current.current = { turn, draw: kept.draw };
  }
  return current.current?.draw ?? 0;
}
