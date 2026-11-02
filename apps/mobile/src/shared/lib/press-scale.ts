import { useCallback, useRef } from "react";
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "./motion";

/** How far a pressed control shrinks. */
export const PRESSED_SCALE = 0.97;
const PRESS_IN_MS = 90;
const PRESS_IN = { duration: PRESS_IN_MS, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System };
// A quick spring with a little give, so the control settles back rather than snapping.
const RELEASE = { damping: 16, stiffness: 340, mass: 0.6, reduceMotion: ReduceMotion.System };

/**
 * The one press feel of the app: a control shrinks over 90 ms while it is held and springs back when
 * it is let go. A tap shorter than the shrink first finishes it, so even a quick tap shows. Put
 * `style` on an animated view inside the pressable, and pass the handlers to the pressable.
 */
export function usePressScale(enabled = true) {
  const reducedMotion = useReducedMotion();
  const active = enabled && !reducedMotion;
  const scale = useSharedValue(1);
  const pressedAt = useRef(0);
  const onPressIn = useCallback(() => {
    if (!active) return;
    pressedAt.current = Date.now();
    scale.set(withTiming(PRESSED_SCALE, PRESS_IN));
  }, [active, scale]);
  const onPressOut = useCallback(() => {
    if (!active) {
      scale.set(1);
      return;
    }
    const left = Math.max(0, PRESS_IN_MS - (Date.now() - pressedAt.current));
    scale.set(withSequence(withTiming(PRESSED_SCALE, { ...PRESS_IN, duration: left }), withSpring(1, RELEASE)));
  }, [active, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return { style, onPressIn, onPressOut };
}
