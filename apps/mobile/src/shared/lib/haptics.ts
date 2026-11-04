import * as ExpoHaptics from "expo-haptics";
import { useHapticsPreference } from "../../features/settings/model/haptics";
import { isAndroid } from "./platform";

async function play(feedback: () => Promise<void>): Promise<void> {
  const { enabled, ready } = useHapticsPreference.getState();
  if (!ready || !enabled) return;
  try {
    await feedback();
  } catch {
    // Missing hardware or a native failure must not interrupt the user's action.
  }
}

/** Shared mobile feedback. From a worklet, call through scheduleOnRN. */
export const haptics = {
  selection: (): Promise<void> => play(() => ExpoHaptics.selectionAsync()),
  impact: (style: "light" | "medium" | "heavy" | "soft" | "rigid" = "light"): Promise<void> =>
    play(() =>
      ExpoHaptics.impactAsync(
        {
          light: ExpoHaptics.ImpactFeedbackStyle.Light,
          medium: ExpoHaptics.ImpactFeedbackStyle.Medium,
          heavy: ExpoHaptics.ImpactFeedbackStyle.Heavy,
          soft: ExpoHaptics.ImpactFeedbackStyle.Soft,
          rigid: ExpoHaptics.ImpactFeedbackStyle.Rigid,
        }[style],
      ),
    ),
  /**
   * The key tap of a button that sends or stops, as the bot app gives it: Android's virtual-key tick, and a light
   * knock on iOS, which has no such pattern.
   */
  press: (): Promise<void> =>
    play(() =>
      isAndroid
        ? ExpoHaptics.performAndroidHapticsAsync(ExpoHaptics.AndroidHaptics.Virtual_Key)
        : ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
    ),
  /** The tick when a long press opens a menu, so the user knows the finger can lift. */
  longPress: (): Promise<void> =>
    play(() =>
      isAndroid
        ? ExpoHaptics.performAndroidHapticsAsync(ExpoHaptics.AndroidHaptics.Long_Press)
        : ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium),
    ),
  notification: (type: "success" | "warning" | "error" = "success"): Promise<void> =>
    play(() =>
      ExpoHaptics.notificationAsync(
        {
          success: ExpoHaptics.NotificationFeedbackType.Success,
          warning: ExpoHaptics.NotificationFeedbackType.Warning,
          error: ExpoHaptics.NotificationFeedbackType.Error,
        }[type],
      ),
    ),
};
