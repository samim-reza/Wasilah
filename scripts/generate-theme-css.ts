/**
 * Generates `global.css` from `src/theme/tokens.ts`.
 *
 * Why generate rather than hand-write: NativeWind resolves `dark:` variants
 * through CSS custom properties, so every semantic colour needs a `--color-*`
 * declaration in two blocks. Writing those by hand guarantees they drift from
 * the TypeScript tokens that runtime code reads. Generating them keeps exactly
 * one source of truth.
 *
 * It also emits `assets/brand/colors.json`. That exists because `app.config.ts`
 * is transpiled and required in isolation by the Expo CLI, so it cannot import
 * a TypeScript module — but it can `require` JSON. Without this bridge the
 * native splash and adaptive-icon colours would be hand-copied literals that
 * silently drift from the theme.
 *
 * Run with: npm run theme:build
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { colorSchemes, type ColorRole } from '../src/theme/tokens.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Tailwind's `<alpha-value>` placeholder only works with space-separated channel
 * values, so hex colours are expanded to `R G B`. Values that are already
 * functional colours (e.g. the overlay rgba) are emitted verbatim and simply
 * cannot participate in opacity modifiers.
 */
function toCssValue(color: string): string {
  const hex = color.trim();
  if (!hex.startsWith('#')) return hex;

  const normalized =
    hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `${r} ${g} ${b}`;
}

function kebab(role: string): string {
  return role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function declarationsFor(scheme: 'light' | 'dark'): string {
  return (Object.keys(colorSchemes[scheme]) as ColorRole[])
    .map((role) => `    --color-${kebab(role)}: ${toCssValue(colorSchemes[scheme][role])};`)
    .join('\n');
}

const css = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: src/theme/tokens.ts
 * Regenerate: npm run theme:build
 */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${declarationsFor('light')}
  }

  .dark:root {
${declarationsFor('dark')}
  }
}
`;

writeFileSync(join(projectRoot, 'global.css'), css, 'utf8');

// Only the handful of roles the native config actually needs, so the bridge
// file does not become a second, fuller copy of the palette.
const brandColors = {
  _comment: 'GENERATED from src/theme/tokens.ts by npm run theme:build. Do not edit.',
  brand: colorSchemes.light.primary,
  lightBackground: colorSchemes.light.background,
  darkBackground: colorSchemes.dark.background,
};

mkdirSync(join(projectRoot, 'assets', 'brand'), { recursive: true });
writeFileSync(
  join(projectRoot, 'assets', 'brand', 'colors.json'),
  `${JSON.stringify(brandColors, null, 2)}\n`,
  'utf8',
);

process.stdout.write(
  'global.css + assets/brand/colors.json regenerated from src/theme/tokens.ts\n',
);
