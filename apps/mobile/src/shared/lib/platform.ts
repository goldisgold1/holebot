const platform = process.env.EXPO_OS ?? "unknown";

export const isIOS = platform === "ios";
export const isAndroid = platform === "android";
/** HoleA.I: the web build of the app (/m). */
export const isWeb = platform === "web";

/** The long-press time in milliseconds: 400 ms on Android, as Android waits. React Native waits 500 ms. */
export const longPressDelay = isAndroid ? 400 : undefined;
