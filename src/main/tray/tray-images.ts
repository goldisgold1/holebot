import { join } from "node:path";
import { type NativeImage, nativeImage } from "electron";
import { FACE_FRAME_COUNT } from "./face-animation";
import type { TrayAvatar } from "./tray-agents";

/**
 * HoleA.I (Vincent, Nov 3 2026): the pictures of the tray, from the bot app's pre-rendered sprites in
 * `resources/tray-avatars`. Each sprite is black on transparent; its alpha is tinted with the agent's
 * colour. Bitmaps are premultiplied BGRA, as Electron gives and takes them.
 */

const SCALES = [1, 2] as const;
/** The size of one face frame in the strip, in DIP. */
const FACE_SIZE = 18;
const CACHE_LIMIT = 64;

interface Bitmap {
  width: number;
  height: number;
  bgra: Buffer;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function trayAssetsDirectory(isPackaged: boolean): string {
  return isPackaged ? join(process.resourcesPath, "tray-avatars") : join(__dirname, "../../resources/tray-avatars");
}

function parseHex(color: string): Rgb | null {
  const hex = color.startsWith("#") ? color.slice(1) : color;
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

/** The bitmap of each scale an image holds, skipping a scale that it cannot give at full size. */
function bitmapsOf(image: NativeImage): Array<{ scale: number; bitmap: Bitmap }> {
  const size = image.getSize();
  const result: Array<{ scale: number; bitmap: Bitmap }> = [];
  for (const scale of SCALES) {
    const width = size.width * scale;
    const height = size.height * scale;
    const bgra = image.toBitmap({ scaleFactor: scale });
    if (bgra.length === width * height * 4) result.push({ scale, bitmap: { width, height, bgra } });
  }
  return result;
}

function imageOf(representations: Array<{ scale: number; bitmap: Bitmap }>): NativeImage | null {
  if (representations.length === 0) return null;
  const image = nativeImage.createEmpty();
  for (const { scale, bitmap } of representations)
    image.addRepresentation({ scaleFactor: scale, width: bitmap.width, height: bitmap.height, buffer: bitmap.bgra });
  return image;
}

/** The alpha mask filled with one colour (`gNt` of the bot app). */
function tint(bitmap: Bitmap, color: Rgb): Bitmap {
  const bgra = Buffer.alloc(bitmap.bgra.length);
  for (let index = 0; index < bgra.length; index += 4) {
    const alpha = bitmap.bgra[index + 3] ?? 0;
    bgra[index] = Math.round((color.b * alpha) / 255);
    bgra[index + 1] = Math.round((color.g * alpha) / 255);
    bgra[index + 2] = Math.round((color.r * alpha) / 255);
    bgra[index + 3] = alpha;
  }
  return { width: bitmap.width, height: bitmap.height, bgra };
}

function slice(strip: Bitmap, x: number, size: number): Bitmap {
  const bgra = Buffer.alloc(size * size * 4);
  for (let row = 0; row < size; row += 1) {
    const start = (row * strip.width + x) * 4;
    strip.bgra.copy(bgra, row * size * 4, start, start + size * 4);
  }
  return { width: size, height: size, bgra };
}

/** Keeps the pixels inside the inscribed circle, with a soft edge (`yNt` of the bot app). */
function circle(bitmap: Bitmap): Bitmap {
  const radius = Math.min(bitmap.width, bitmap.height) / 2;
  const bgra = Buffer.alloc(bitmap.bgra.length);
  for (let y = 0; y < bitmap.height; y += 1)
    for (let x = 0; x < bitmap.width; x += 1) {
      const distance = Math.hypot(x + 0.5 - bitmap.width / 2, y + 0.5 - bitmap.height / 2);
      const coverage = Math.min(1, Math.max(0, radius - distance + 0.5));
      const index = (y * bitmap.width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1)
        bgra[index + channel] = Math.round((bitmap.bgra[index + channel] ?? 0) * coverage);
    }
  return { width: bitmap.width, height: bitmap.height, bgra };
}

function remember<Value>(cache: Map<string, Value>, key: string, value: Value): Value {
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, value);
  return value;
}

export type TrayFace = { kind: "animated"; frames: NativeImage[] } | { kind: "still"; image: NativeImage };

export interface TrayImages {
  /** The face of an agent for the tray: the animated strip, or its picture as a still. */
  face(avatar: TrayAvatar): TrayFace | null;
  /** The small still of an agent for its menu row. */
  menuAvatar(avatar: TrayAvatar): NativeImage | undefined;
  /** The working mark for a busy agent's menu row, in its colour. */
  working(color: string): NativeImage | undefined;
}

export function createTrayImages(directory: string): TrayImages {
  const faces = new Map<string, TrayFace | null>();
  const stills = new Map<string, NativeImage | undefined>();
  const load = (file: string) => {
    const image = nativeImage.createFromPath(join(directory, file));
    return image.isEmpty() ? null : image;
  };
  const tinted = (file: string, color: string): NativeImage | undefined => {
    const key = `${file}/${color}`;
    if (stills.has(key)) return stills.get(key);
    const source = load(file);
    const rgb = parseHex(color);
    const image =
      source && rgb
        ? (imageOf(bitmapsOf(source).map(({ scale, bitmap }) => ({ scale, bitmap: tint(bitmap, rgb) }))) ?? undefined)
        : (source ?? undefined);
    return remember(stills, key, image);
  };
  const photo = (dataUrl: string, size: number): NativeImage | null => {
    const source = nativeImage.createFromDataURL(dataUrl);
    if (source.isEmpty()) return null;
    const { width, height } = source.getSize();
    const side = Math.min(width, height);
    if (side === 0) return null;
    const square = source.crop({
      x: Math.floor((width - side) / 2),
      y: Math.floor((height - side) / 2),
      width: side,
      height: side,
    });
    return imageOf(
      SCALES.flatMap((scale) => {
        const pixels = size * scale;
        const bgra = square.resize({ width: pixels, height: pixels, quality: "best" }).toBitmap();
        return bgra.length === pixels * pixels * 4
          ? [{ scale, bitmap: circle({ width: pixels, height: pixels, bgra }) }]
          : [];
      }),
    );
  };

  return {
    face(avatar) {
      const key = avatar.photo
        ? `photo:${avatar.photo.length}:${avatar.photo.slice(-64)}`
        : `${avatar.shape}/${avatar.color}`;
      if (faces.has(key)) return faces.get(key) ?? null;
      if (avatar.photo) {
        const image = photo(avatar.photo, FACE_SIZE);
        if (image) return remember(faces, key, { kind: "still", image });
      }
      const strip = load(`bot-${avatar.shape}-face.png`);
      const rgb = parseHex(avatar.color);
      if (!strip || !rgb) return remember(faces, key, null);
      const scales = bitmapsOf(strip).filter(({ bitmap }) => bitmap.width === FACE_FRAME_COUNT * bitmap.height);
      const frames: NativeImage[] = [];
      for (let frame = 0; frame < FACE_FRAME_COUNT; frame += 1) {
        const image = imageOf(
          scales.map(({ scale, bitmap }) => ({
            scale,
            bitmap: tint(slice(bitmap, frame * bitmap.height, bitmap.height), rgb),
          })),
        );
        if (!image) return remember(faces, key, null);
        frames.push(image);
      }
      return remember(faces, key, { kind: "animated", frames });
    },
    menuAvatar(avatar) {
      if (avatar.photo) {
        const key = `menu-photo:${avatar.photo.length}:${avatar.photo.slice(-64)}`;
        if (stills.has(key)) return stills.get(key);
        const image = photo(avatar.photo, 16);
        if (image) return remember(stills, key, image);
      }
      return tinted(`bot-${avatar.shape}.png`, avatar.color);
    },
    working: (color) => tinted("working.png", color),
  };
}

// ---- The unread badge ----------------------------------------------------------------------------

/** A 3x5 pixel font for the count. */
const GLYPHS: Record<string, readonly string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "001", "001", "001"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  "+": ["000", "010", "111", "010", "000"],
};

const BADGE_COLOR: Rgb = { r: 0xe5, g: 0x48, b: 0x4d };
const BADGE_TEXT: Rgb = { r: 0xff, g: 0xff, b: 0xff };

export function badgeLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

/** Paints `color` over the pixel with `coverage`, premultiplied source-over. */
function paint(bitmap: Bitmap, x: number, y: number, color: Rgb, coverage: number): void {
  if (coverage <= 0 || x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return;
  const index = (y * bitmap.width + x) * 4;
  const keep = 1 - coverage;
  const { bgra } = bitmap;
  bgra[index] = Math.round(color.b * coverage + (bgra[index] ?? 0) * keep);
  bgra[index + 1] = Math.round(color.g * coverage + (bgra[index + 1] ?? 0) * keep);
  bgra[index + 2] = Math.round(color.r * coverage + (bgra[index + 2] ?? 0) * keep);
  bgra[index + 3] = Math.round(255 * coverage + (bgra[index + 3] ?? 0) * keep);
}

function erase(bitmap: Bitmap, x: number, y: number, coverage: number): void {
  if (coverage <= 0 || x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return;
  const index = (y * bitmap.width + x) * 4;
  for (let channel = 0; channel < 4; channel += 1)
    bitmap.bgra[index + channel] = Math.round((bitmap.bgra[index + channel] ?? 0) * (1 - coverage));
}

/**
 * Draws a red pill with the count, its bottom-right corner at the bitmap's. `height` is in pixels;
 * `pixel` is the size of one font pixel. A ring of `gap` pixels around it is cleared, so the badge
 * stands apart from the face under it.
 */
function drawBadge(bitmap: Bitmap, label: string, options: { height: number; pixel: number; gap: number }): void {
  const { height, pixel, gap } = options;
  const textWidth = label.length * 3 * pixel + (label.length - 1) * pixel;
  const width = Math.min(bitmap.width, Math.max(height, textWidth + 2 * pixel + Math.round(height / 3)));
  const left = bitmap.width - width;
  const top = bitmap.height - height;
  const radius = height / 2;
  // The signed distance to the pill: a segment between the centres of its two round ends.
  const distance = (px: number, py: number) => {
    const cy = top + radius;
    const cx = Math.min(Math.max(px, left + radius), left + width - radius);
    return Math.hypot(px - cx, py - cy) - radius;
  };
  for (let y = Math.max(0, top - gap); y < bitmap.height; y += 1)
    for (let x = Math.max(0, left - gap); x < bitmap.width; x += 1) {
      const d = distance(x + 0.5, y + 0.5);
      erase(bitmap, x, y, Math.min(1, Math.max(0, gap + 0.5 - d)));
      paint(bitmap, x, y, BADGE_COLOR, Math.min(1, Math.max(0, 0.5 - d)));
    }
  const textLeft = left + Math.floor((width - textWidth) / 2);
  const textTop = top + Math.floor((height - 5 * pixel) / 2);
  for (const [position, character] of [...label].entries()) {
    const glyph = GLYPHS[character];
    if (!glyph) continue;
    const glyphLeft = textLeft + position * 4 * pixel;
    for (const [row, bits] of glyph.entries())
      for (const [column, bit] of [...bits].entries()) {
        if (bit !== "1") continue;
        for (let dy = 0; dy < pixel; dy += 1)
          for (let dx = 0; dx < pixel; dx += 1)
            paint(bitmap, glyphLeft + column * pixel + dx, textTop + row * pixel + dy, BADGE_TEXT, 1);
      }
  }
}

/** The tray picture with the unread count in its corner; the picture itself when the count is 0. */
export function withBadge(image: NativeImage, count: number): NativeImage {
  if (count <= 0) return image;
  const label = badgeLabel(count);
  const badged = imageOf(
    bitmapsOf(image).map(({ scale, bitmap }) => {
      const copy = { width: bitmap.width, height: bitmap.height, bgra: Buffer.from(bitmap.bgra) };
      // 9 px of a 16 to 18 px icon at 1x: the 5 px digits stay readable.
      const height = Math.max(9, Math.round(bitmap.height * 0.56));
      drawBadge(copy, label, { height, pixel: Math.max(1, Math.floor(height / 9)), gap: scale });
      return { scale, bitmap: copy };
    }),
  );
  return badged ?? image;
}

/** The taskbar overlay of Windows: the badge alone at 16 px (and 32 px). */
export function overlayBadge(count: number): NativeImage | null {
  if (count <= 0) return null;
  const label = badgeLabel(count);
  return imageOf(
    SCALES.map((scale) => {
      const size = 16 * scale;
      const bitmap = { width: size, height: size, bgra: Buffer.alloc(size * size * 4) };
      drawBadge(bitmap, label, { height: size, pixel: (label.length > 1 ? 1 : 2) * scale, gap: 0 });
      return { scale, bitmap };
    }),
  );
}
