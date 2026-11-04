import { staticBotMarkSvg } from "@openbot/brand/bot-mark-engine";
import { useMemo } from "react";
import { SvgXml } from "react-native-svg";
import { type BotMarkFaceProps, seededShape } from "./bot-mark-face-model";

/**
 * In the native app the engine has no DOM to animate, so it draws the face's resting frame as SVG: the
 * same body and eyes as the desktop. The avatar around it still moves with the mood.
 */
export function BotMarkFace({ seed, color, size }: BotMarkFaceProps) {
  const xml = useMemo(() => staticBotMarkSvg(seededShape(seed), color, size), [seed, color, size]);
  return <SvgXml xml={xml} width={size} height={size} />;
}
