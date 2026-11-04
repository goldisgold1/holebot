import { type BotMarkHandle, mountBotMark } from "@openbot/brand/bot-mark-engine";
import { type ComponentRef, useEffect, useRef } from "react";
import { View } from "react-native";
import { type BotMarkFaceProps, MOOD_STATES, seededShape } from "./bot-mark-face-model";

/** On the web the engine runs live, as on the desktop: its own clips for each state, blinks and glances. */
export function BotMarkFace({ seed, color, mood, size, playing }: BotMarkFaceProps) {
  const host = useRef<ComponentRef<typeof View>>(null);
  const mark = useRef<BotMarkHandle | null>(null);
  const shape = seededShape(seed);
  const state = MOOD_STATES[mood] ?? "idle";

  // biome-ignore lint/correctness/useExhaustiveDependencies: the mark mounts once; the effects below keep it in step.
  useEffect(() => {
    // react-native-web renders View as a DOM element.
    const element = host.current;
    if (!(element instanceof HTMLElement)) return;
    mark.current = mountBotMark(element, { shape, color, state, seed, playing, sizePx: size, maxFrameRate: 30 });
    return () => {
      mark.current?.destroy();
      mark.current = null;
    };
  }, []);
  useEffect(() => mark.current?.setState(state), [state]);
  useEffect(() => mark.current?.setColor(color), [color]);
  useEffect(() => mark.current?.setShape(shape), [shape]);
  useEffect(() => mark.current?.setPlaying(playing), [playing]);

  return <View ref={host} pointerEvents="none" style={{ width: size, height: size, position: "relative" }} />;
}
