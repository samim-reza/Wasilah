/**
 * Generates the app's icon set from a single vector source.
 *
 * The mark is the Rub el Hizb (۞) — the eight-pointed star that has marked
 * quarter-sections of the Quran in manuscripts for centuries. It is geometric
 * rather than lettered, which means it needs no font, no Arabic shaping engine,
 * and stays legible at 48px in a notification tray.
 *
 * Every size is derived here rather than hand-exported, so changing the brand
 * colour is a one-line edit followed by `npm run brand:build`.
 *
 * Requires `rsvg-convert` (librsvg). Run with: npm run brand:build
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colorSchemes } from '../src/theme/tokens.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = join(projectRoot, 'assets', 'brand');
const assetsDir = join(projectRoot, 'assets');

const BRAND = colorSchemes.light.primary;
const ON_BRAND = colorSchemes.light.background;

/**
 * The eight-pointed star, as two overlapping squares.
 *
 * `scale` is the fraction of the canvas the star spans. Android's adaptive icon
 * masks away the outer third of the foreground layer, so that layer needs a
 * noticeably smaller star than a plain square icon does.
 */
function starPath(size: number, scale: number): string {
  const centre = size / 2;
  // Half-width of the axis-aligned square.
  const half = (size * scale) / 2;
  // The rotated square shares the same edge length, so its vertices sit
  // half * sqrt(2) from the centre along the axes.
  const reach = half * Math.SQRT2;

  const square = `M ${centre - half} ${centre - half} H ${centre + half} V ${centre + half} H ${centre - half} Z`;
  const diamond = `M ${centre} ${centre - reach} L ${centre + reach} ${centre} L ${centre} ${centre + reach} L ${centre - reach} ${centre} Z`;

  return `${square} ${diamond}`;
}

interface MarkOptions {
  size: number;
  scale: number;
  markColor: string;
  /** Omit for a transparent background. */
  backgroundColor?: string;
  /** Rounded-rect background; ignored when there is no background colour. */
  cornerRadius?: number;
  /** The small centre circle. Dropped at very small sizes where it fills in. */
  withCentre?: boolean;
}

function buildSvg({
  size,
  scale,
  markColor,
  backgroundColor,
  cornerRadius = 0,
  withCentre = true,
}: MarkOptions): string {
  const centre = size / 2;
  const centreRadius = size * scale * 0.2;

  const background = backgroundColor
    ? `<rect width="${size}" height="${size}" rx="${cornerRadius}" fill="${backgroundColor}"/>`
    : '';

  // The two squares must UNION into a solid star, which is `nonzero` — with
  // `evenodd` their overlap cancels out and only the eight points survive.
  //
  // The centre is then punched with a mask rather than an overlaid circle,
  // because several of these assets sit on a transparent background where an
  // opaque circle would show as a disc instead of a hole.
  const maskId = `centre-${size}`;
  const mask = withCentre
    ? `<mask id="${maskId}">
    <rect width="${size}" height="${size}" fill="white"/>
    <circle cx="${centre}" cy="${centre}" r="${centreRadius}" fill="black"/>
  </mask>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${mask}</defs>
  ${background}
  <path
    d="${starPath(size, scale)}"
    fill="${markColor}"
    fill-rule="nonzero"${
      withCentre
        ? `
    mask="url(#${maskId})"`
        : ''
    }
  />
</svg>`;
}

interface AssetSpec {
  /** Written to assets/brand for future editing. */
  svgName: string;
  /** Written to assets/ for the app to consume. */
  pngName: string;
  options: MarkOptions;
}

const assets: AssetSpec[] = [
  {
    // The primary icon. Square with no rounding — both platforms apply their own.
    svgName: 'icon.svg',
    pngName: 'icon.png',
    options: { size: 1024, scale: 0.52, markColor: ON_BRAND, backgroundColor: BRAND },
  },
  {
    // Android adaptive foreground: smaller, because the outer third is masked.
    svgName: 'android-icon-foreground.svg',
    pngName: 'android-icon-foreground.png',
    options: { size: 1024, scale: 0.36, markColor: ON_BRAND },
  },
  {
    // Themed icons are a single-colour silhouette; the system recolours it.
    svgName: 'android-icon-monochrome.svg',
    pngName: 'android-icon-monochrome.png',
    options: { size: 1024, scale: 0.36, markColor: '#FFFFFF' },
  },
  {
    // Splash: the mark alone on the themed background set in app.config.ts.
    svgName: 'splash-icon.svg',
    pngName: 'splash-icon.png',
    options: { size: 512, scale: 0.6, markColor: BRAND },
  },
  {
    // Android notification icons are rendered as a white silhouette, so this is
    // white-on-transparent and drops the centre detail that fills in at 24dp.
    svgName: 'notification-icon.svg',
    pngName: 'notification-icon.png',
    options: { size: 192, scale: 0.62, markColor: '#FFFFFF', withCentre: false },
  },
  {
    svgName: 'favicon.svg',
    pngName: 'favicon.png',
    options: {
      size: 96,
      scale: 0.56,
      markColor: ON_BRAND,
      backgroundColor: BRAND,
      cornerRadius: 18,
    },
  },
];

mkdirSync(brandDir, { recursive: true });

for (const asset of assets) {
  const svg = buildSvg(asset.options);
  const svgPath = join(brandDir, asset.svgName);
  const pngPath = join(assetsDir, asset.pngName);

  writeFileSync(svgPath, svg, 'utf8');

  execFileSync('rsvg-convert', [
    svgPath,
    '-w',
    String(asset.options.size),
    '-h',
    String(asset.options.size),
    '-o',
    pngPath,
  ]);

  process.stdout.write(`${asset.pngName}  ${asset.options.size}x${asset.options.size}\n`);
}

process.stdout.write('\nBrand assets regenerated. Sources are in assets/brand/.\n');
