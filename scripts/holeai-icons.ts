// Draws the HoleBot app icons (HOLEAI-FORK.md, "HoleBot name").
//   bun scripts/holeai-icons.ts
// A dark hole.fm tile with a soft bot token on it, turned a little like Grok Bot's, with two dark
// pill eyes like the agent faces. The token takes the logo color, so each variant and each logo
// color is the same drawing in another color. Sizes up to 48 px use a bolder drawing that still
// reads at 16 px. Writes the desktop, web and phone icons. Uses sharp from node_modules (it comes
// with miniflare). The macOS 26 icon catalog (`build/macos/Assets.car`) is made on a Mac only.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { APP_LOGO_COLOR_HEX, APP_LOGO_COLORS, DEFAULT_APP_LOGO_COLOR } from "@openbot/contracts/app-logo-color";
import { createOpenBotLogger } from "@openbot/logging";
import sharp from "sharp";

const logger = createOpenBotLogger("holeai-icons");
const root = join(import.meta.dir, "..");
const build = join(root, "build");

const EYE = "#08060b";
/** The app variants keep the colors of their earlier icons, so a dev build is told apart at once. */
const VARIANTS = { production: APP_LOGO_COLOR_HEX[DEFAULT_APP_LOGO_COLOR], dev: "#e3b866", preview: "#61c985" };

interface Drawing {
  /** Space around the tile: none for Windows and the web, Apple's safe area for macOS. */
  margin: number;
  /** "small" for 48 px and below: no glow, a bigger token and wider eyes. */
  small: boolean;
  /** iOS rounds the corners itself and refuses transparency. */
  square?: boolean;
  /** The token alone on transparency: the layer of the iOS 26 icon, which draws its own background. */
  bare?: boolean;
  /** One flat white shape with the eyes cut out: the Android notification icon. */
  silhouette?: boolean;
}

function hex(color: string): [number, number, number] {
  const value = Number.parseInt(color.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function shade(color: string, factor: number): string {
  const mix = (channel: number) => Math.round(factor < 1 ? channel * factor : channel + (255 - channel) * (factor - 1));
  return `#${hex(color)
    .map((channel) => Math.min(255, mix(channel)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** A superellipse, the soft square of the agent tokens. */
function squircle(cx: number, cy: number, width: number, height: number, power = 4.2): string {
  const points: string[] = [];
  for (let step = 0; step < 96; step += 1) {
    const angle = (step / 96) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = cx + (width / 2) * Math.sign(cos) * Math.abs(cos) ** (2 / power);
    const y = cy + (height / 2) * Math.sign(sin) * Math.abs(sin) ** (2 / power);
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M${points.join("L")}Z`;
}

function pill(cx: number, cy: number, width: number, height: number): string {
  return `<rect x="${cx - width / 2}" y="${cy - height / 2}" width="${width}" height="${height}" rx="${width / 2}"/>`;
}

export function iconSvg(color: string, drawing: Drawing): string {
  const { margin, small } = drawing;
  const tile = 1024 - margin * 2;
  const scale = tile / 1024;
  const at = (value: number) => margin + value * scale;
  const size = (value: number) => value * scale;
  const token = small
    ? { w: 760, h: 700, depth: 46, eyeW: 132, eyeH: 260, gap: 280 }
    : { w: 640, h: 590, depth: 40, eyeW: 84, eyeH: 186, gap: 196 };
  const cx = 512;
  const cy = small ? 500 : 492;
  const corner = drawing.square ? 0 : size(small ? 200 : 228);
  // The token is turned to the left: its side shows on the right and below, and the eyes sit left of centre.
  const steps = 12;
  const layers = Array.from({ length: steps }, (_, index) => steps - index)
    .map((step) => {
      const offset = (token.depth / steps) * step;
      const fill = shade(color, 0.7 - (0.12 * step) / steps);
      return `<path d="${squircle(at(cx + offset * 0.55), at(cy + offset), size(token.w), size(token.h))}" fill="${fill}"/>`;
    })
    .join("");
  const eyeX = cx - (small ? 22 : 34);
  const eyeY = cy - (small ? 6 : 14);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <title>HoleBot</title>
  <defs>
    <radialGradient id="hole" cx="50%" cy="44%" r="70%">
      <stop offset="0" stop-color="#25222b"/>
      <stop offset="1" stop-color="#09080b"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset=".55" stop-color="${color}" stop-opacity=".28"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(color, 1.18)}"/>
      <stop offset="1" stop-color="${color}"/>
    </linearGradient>
  </defs>
  ${drawing.bare || drawing.silhouette ? "" : `<rect x="${margin}" y="${margin}" width="${tile}" height="${tile}" rx="${corner}" fill="url(#hole)"/>`}
  ${small || drawing.bare || drawing.silhouette ? "" : `<circle cx="${at(cx)}" cy="${at(cy + 16)}" r="${size(470)}" fill="url(#glow)"/>`}
  ${drawing.silhouette ? "" : layers}
  <path d="${squircle(at(cx), at(cy), size(token.w), size(token.h))}" fill="${drawing.silhouette ? "#fff" : "url(#face)"}"/>
  <g fill="${drawing.silhouette ? "#000" : EYE}">${pill(at(eyeX - token.gap / 2), at(eyeY), size(token.eyeW), size(token.eyeH))}${pill(at(eyeX + token.gap / 2), at(eyeY), size(token.eyeW), size(token.eyeH))}</g>
</svg>
`;
}

async function png(svg: string, pixels: number): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: Math.max(72, (72 * pixels) / 1024) * 2 })
    .resize(pixels, pixels)
    .png()
    .toBuffer();
}

/** A Windows icon of PNG images, which Windows reads since Vista. */
async function ico(color: string, sizes: readonly number[]): Promise<Buffer> {
  const images = await Promise.all(
    sizes.map((pixels) => png(iconSvg(color, { margin: 0, small: pixels <= 48 }), pixels)),
  );
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    const pixels = sizes[index] ?? 0;
    header.writeUInt8(pixels >= 256 ? 0 : pixels, entry);
    header.writeUInt8(pixels >= 256 ? 0 : pixels, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  return Buffer.concat([header, ...images]);
}

/** A macOS icon of PNG images (`ic07` 128 px to `ic10` 1024 px). */
async function icns(color: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for (const [type, pixels] of [
    ["ic07", 128],
    ["ic08", 256],
    ["ic09", 512],
    ["ic10", 1024],
  ] as const) {
    const image = await png(iconSvg(color, { margin: 100, small: false }), pixels);
    const head = Buffer.alloc(8);
    head.write(type, 0, "latin1");
    head.writeUInt32BE(image.length + 8, 4);
    chunks.push(head, image);
  }
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "latin1");
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

/** White where the drawing is light, clear where it is dark: the eyes become holes in the token. */
async function silhouette(pixels: number): Promise<Buffer> {
  const drawn = await sharp(await png(iconSvg("#ffffff", { margin: 0, small: true, silhouette: true }), pixels))
    .flatten({ background: "#000" })
    .greyscale()
    .raw()
    .toBuffer();
  const white = Buffer.alloc(pixels * pixels * 4, 255);
  for (let index = 0; index < pixels * pixels; index += 1) white[index * 4 + 3] = drawn[index] ?? 0;
  return sharp(white, { raw: { width: pixels, height: pixels, channels: 4 } })
    .png()
    .toBuffer();
}

/** The iOS and macOS 26 icon: its own dark background, and the token as a layer that iOS lights as glass. */
async function iosIcon(folder: string, color: string) {
  const layer = await sharp(await png(iconSvg(color, { margin: 0, small: false, bare: true }), 1024))
    .trim()
    .toBuffer();
  await writeFile(join(folder, "Assets", "token.png"), layer);
  await rm(join(folder, "Assets", "eyes.png"), { force: true });
  const hole = ["display-p3:0.14510,0.13333,0.16863,1.00000", "display-p3:0.03529,0.03137,0.04314,1.00000"];
  const fill = { "linear-gradient": hole, orientation: { start: { x: 0.5, y: 0 }, stop: { x: 0.5, y: 0.7 } } };
  const config = {
    "fill-specializations": [{ value: fill }, { appearance: "dark", value: fill }],
    groups: [
      {
        layers: [
          {
            "blend-mode": "normal",
            "fill-specializations": [{ value: "automatic" }],
            "glass-specializations": [
              { value: true },
              { appearance: "dark", value: true },
              { appearance: "tinted", value: true },
            ],
            hidden: false,
            "image-name": "token.png",
            name: "token",
            opacity: 1,
            position: { scale: 0.62, "translation-in-points": [0, -6] },
          },
        ],
        shadow: { kind: "neutral", opacity: 0.5 },
        translucency: { enabled: true, value: 0.5 },
      },
    ],
    "supported-platforms": { circles: ["watchOS"], squares: "shared" },
  };
  await writeFile(
    join(folder, "icon.json"),
    `${JSON.stringify(config, null, 2)}
`,
  );
}

const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256] as const;

async function main() {
  const big = (color: string) => iconSvg(color, { margin: 0, small: false });
  const mac = (color: string) => iconSvg(color, { margin: 100, small: false });
  const lavender = VARIANTS.production;
  await writeFile(join(build, "icon.svg"), big(lavender));
  await writeFile(join(build, "icon.ico"), await ico(lavender, ICO_SIZES));
  await writeFile(join(build, "icon-production.icns"), await icns(lavender));
  for (const [variant, color] of Object.entries(VARIANTS)) {
    await writeFile(join(build, `icon-${variant}.png`), await png(big(color), 1024));
    await writeFile(join(build, `icon-${variant}-macos-safe-area.png`), await png(mac(color), 1024));
    await writeFile(join(build, `icon-${variant}.ico`), await ico(color, ICO_SIZES));
  }
  await mkdir(join(build, "logo-colors"), { recursive: true });
  for (const name of APP_LOGO_COLORS) {
    if (name === DEFAULT_APP_LOGO_COLOR) continue;
    const color = APP_LOGO_COLOR_HEX[name];
    await writeFile(join(build, "logo-colors", `icon-${name}.png`), await png(big(color), 1024));
    await writeFile(join(build, "logo-colors", `icon-${name}-macos-safe-area.png`), await png(mac(color), 1024));
  }

  const web = join(root, "apps/auth-api/public");
  await writeFile(join(web, "favicon.ico"), await ico(lavender, [16, 32, 48]));
  await writeFile(join(web, "favicon-32x32.png"), await png(iconSvg(lavender, { margin: 0, small: true }), 32));
  await writeFile(
    join(web, "apple-touch-icon.png"),
    await png(iconSvg(lavender, { margin: 0, small: false, square: true }), 180),
  );
  await writeFile(join(web, "icon-192x192.png"), await png(big(lavender), 192));
  await writeFile(join(web, "icon-512x512.png"), await png(big(lavender), 512));

  const phone = join(root, "apps/mobile/assets/icons");
  await writeFile(join(phone, "notification-icon.png"), await silhouette(96));
  await iosIcon(join(phone, "app-icon.icon"), lavender);
  // The macOS 26 source; `bun scripts/compile-macos-icon.ts` on a Mac turns it into build/macos/Assets.car.
  await iosIcon(join(build, "icon-production.icon"), lavender);
  await writeFile(
    join(phone, "app-icon.png"),
    await png(iconSvg(lavender, { margin: 0, small: false, square: true }), 1024),
  );
  logger.info("Wrote the HoleBot icons.");
}

if (import.meta.main) await main();
