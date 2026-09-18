/**
 * Generates the Play Store graphic assets from the same brand source as the app.
 *
 * Google requires an exact 512x512 icon and a 1024x500 feature graphic, neither
 * of which the app itself uses. Deriving them here rather than exporting by hand
 * means the store listing cannot drift from the app's own identity when the
 * brand colour changes.
 *
 * Run with: npm run store:assets
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colorSchemes } from '../src/theme/tokens.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(projectRoot, 'store', 'assets');

const BRAND = colorSchemes.light.primary;
const ON_BRAND = colorSchemes.light.background;

/** The Rub el Hizb, as two overlapping squares. Mirrors generate-brand-assets. */
function starPath(cx: number, cy: number, half: number): string {
  const reach = half * Math.SQRT2;
  const square = `M ${cx - half} ${cy - half} H ${cx + half} V ${cy + half} H ${cx - half} Z`;
  const diamond = `M ${cx} ${cy - reach} L ${cx + reach} ${cy} L ${cx} ${cy + reach} L ${cx - reach} ${cy} Z`;
  return `${square} ${diamond}`;
}

function markSvg(size: number, scale: number): string {
  const centre = size / 2;
  const half = (size * scale) / 2;
  const hole = size * scale * 0.2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <mask id="hole">
      <rect width="${size}" height="${size}" fill="white"/>
      <circle cx="${centre}" cy="${centre}" r="${hole}" fill="black"/>
    </mask>
  </defs>
  <rect width="${size}" height="${size}" fill="${BRAND}"/>
  <path d="${starPath(centre, centre, half)}" fill="${ON_BRAND}" mask="url(#hole)"/>
</svg>`;
}

/**
 * The feature graphic is displayed at wildly different sizes and is often
 * cropped, so the mark sits left with generous margin and the wordmark is set
 * large enough to survive a thumbnail.
 */
function featureGraphicSvg(): string {
  const width = 1024;
  const height = 500;
  const markCentre = 250;
  const half = 92;
  const hole = half * 0.4;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <mask id="hole">
      <rect width="${width}" height="${height}" fill="white"/>
      <circle cx="${markCentre}" cy="${height / 2}" r="${hole}" fill="black"/>
    </mask>
  </defs>
  <rect width="${width}" height="${height}" fill="${BRAND}"/>
  <path d="${starPath(markCentre, height / 2, half)}" fill="${ON_BRAND}" mask="url(#hole)" fill-opacity="0.95"/>
  <text x="470" y="228" font-family="DejaVu Sans, Arial, sans-serif" font-size="82" font-weight="700" fill="${ON_BRAND}">Wasilah</text>
  <text x="470" y="298" font-family="DejaVu Sans, Arial, sans-serif" font-size="38" fill="${ON_BRAND}" fill-opacity="0.85">One ayah. Every day.</text>
</svg>`;
}

mkdirSync(outDir, { recursive: true });

const assets: { name: string; svg: string; width: number; height: number }[] = [
  // Google requires exactly 512x512 for the store icon.
  { name: 'play-store-icon', svg: markSvg(512, 0.52), width: 512, height: 512 },
  { name: 'feature-graphic', svg: featureGraphicSvg(), width: 1024, height: 500 },
];

for (const asset of assets) {
  const svgPath = join(outDir, `${asset.name}.svg`);
  const pngPath = join(outDir, `${asset.name}.png`);

  writeFileSync(svgPath, asset.svg, 'utf8');
  execFileSync('rsvg-convert', [svgPath, '-w', String(asset.width), '-h', String(asset.height), '-o', pngPath]);

  process.stdout.write(`${asset.name}.png  ${asset.width}x${asset.height}\n`);
}

process.stdout.write('\nStore assets written to store/assets/.\n');
