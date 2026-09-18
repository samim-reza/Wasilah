/**
 * Runtime access to the active colour palette.
 *
 * Most styling should use Tailwind classes, which resolve through CSS variables
 * and need nothing from this module. This exists for the cases that cannot:
 * native status/navigation bars, React Navigation themes, SVG fills, gradient
 * stops and rendered share cards.
 */
import { colorSchemes, type ColorPalette, type ColorSchemeName } from './tokens';

export function getPalette(scheme: ColorSchemeName): ColorPalette {
  return colorSchemes[scheme];
}

/**
 * Applies an alpha channel to a token colour.
 *
 * Returns the input untouched when it is already a functional colour, because
 * `rgba(...)` values carry their own alpha and re-wrapping them is a no-op that
 * would produce invalid CSS.
 */
export function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#')) return color;

  const hex =
    color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
