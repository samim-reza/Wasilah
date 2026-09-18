/**
 * Translation text sanitisation.
 *
 * The Content API returns translation bodies containing inline footnote markup,
 * e.g. `...the Book<sup foot_note=12345>1</sup>...`. React Native has no HTML
 * renderer, so the markup is stripped rather than displayed. Footnote markers
 * are preserved as superscript digits because they are part of the translator's
 * text and removing them silently would misrepresent the edition.
 *
 * This only ever touches TRANSLATION text. Arabic Quran text is never processed.
 */

/** Maps ASCII digits to Unicode superscripts so footnote markers stay legible. */
const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

function toSuperscript(digits: string): string {
  return digits.replace(/\d/g, (d) => SUPERSCRIPT_DIGITS[Number(d)] ?? d);
}

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

export function sanitizeTranslationText(raw: string): string {
  return (
    raw
      // Footnote markers: keep the number, drop the tag.
      .replace(/<sup[^>]*>(\d+)<\/sup>/gi, (_, digits: string) => toSuperscript(digits))
      // Any other superscript content is decoration; drop it entirely.
      .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z#0-9]+;/gi, (entity) => NAMED_ENTITIES[entity.toLowerCase()] ?? entity)
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

/**
 * Splits search-result text containing `<em>` highlight markers into runs, so
 * the UI can style matches without an HTML renderer.
 */
export interface TextRun {
  text: string;
  highlighted: boolean;
}

export function parseHighlightedText(raw: string): TextRun[] {
  const runs: TextRun[] = [];
  const pattern = /<em>(.*?)<\/em>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: raw.slice(lastIndex, match.index), highlighted: false });
    }
    runs.push({ text: match[1] ?? '', highlighted: true });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < raw.length) {
    runs.push({ text: raw.slice(lastIndex), highlighted: false });
  }

  return runs.filter((run) => run.text.length > 0);
}
