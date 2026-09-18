import {
  compareVerseKeys,
  formatVerseKey,
  isValidVerseKey,
  parseVerseKey,
  versesBetween,
} from '@/features/quran/utils/verseKey';
import {
  parseHighlightedText,
  sanitizeTranslationText,
} from '@/features/quran/utils/sanitizeTranslation';

describe('parseVerseKey', () => {
  it('parses a well-formed key', () => {
    expect(parseVerseKey('2:255')).toEqual({ chapterId: 2, verseNumber: 255 });
  });

  it('tolerates surrounding whitespace, since keys come from user input', () => {
    expect(parseVerseKey('  2:255 ')).toEqual({ chapterId: 2, verseNumber: 255 });
  });

  it('rejects out-of-range and malformed keys instead of throwing', () => {
    expect(parseVerseKey('0:1')).toBeNull();
    expect(parseVerseKey('115:1')).toBeNull();
    expect(parseVerseKey('2:0')).toBeNull();
    expect(parseVerseKey('2')).toBeNull();
    expect(parseVerseKey('two:255')).toBeNull();
    expect(parseVerseKey('')).toBeNull();
  });
});

describe('formatVerseKey', () => {
  it('round-trips through parse', () => {
    expect(parseVerseKey(formatVerseKey(2, 255))).toEqual({ chapterId: 2, verseNumber: 255 });
  });
});

describe('isValidVerseKey', () => {
  it('accepts the first and last surahs', () => {
    expect(isValidVerseKey('1:1')).toBe(true);
    expect(isValidVerseKey('114:6')).toBe(true);
  });
});

describe('compareVerseKeys', () => {
  it('orders numerically, not lexically', () => {
    // String comparison would put '2:10' before '2:9'.
    expect(compareVerseKeys('2:9', '2:10')).toBeLessThan(0);
  });

  it('orders by surah first', () => {
    expect(compareVerseKeys('10:1', '9:200')).toBeGreaterThan(0);
  });

  it('sorts a list into mushaf order', () => {
    const keys = ['2:10', '1:7', '2:9', '10:1'];
    expect([...keys].sort(compareVerseKeys)).toEqual(['1:7', '2:9', '2:10', '10:1']);
  });
});

describe('versesBetween', () => {
  it('is inclusive of both ends', () => {
    expect(versesBetween('2:1', '2:5')).toBe(5);
    expect(versesBetween('2:5', '2:5')).toBe(1);
  });

  it('is zero across different surahs', () => {
    expect(versesBetween('2:1', '3:1')).toBe(0);
  });

  it('is zero for a reversed range', () => {
    expect(versesBetween('2:5', '2:1')).toBe(0);
  });
});

describe('sanitizeTranslationText', () => {
  it('keeps footnote markers as superscripts', () => {
    const raw = 'the Book<sup foot_note=12345>1</sup> of guidance';
    expect(sanitizeTranslationText(raw)).toBe('the Book¹ of guidance');
  });

  it('strips non-numeric superscript decoration entirely', () => {
    expect(sanitizeTranslationText('guidance<sup>*</sup> for all')).toBe('guidance for all');
  });

  it('removes any remaining markup', () => {
    expect(sanitizeTranslationText('<i>Indeed</i>, Allah is <b>Merciful</b>')).toBe(
      'Indeed, Allah is Merciful',
    );
  });

  it('decodes common HTML entities', () => {
    expect(sanitizeTranslationText('Moses &amp; Aaron')).toBe('Moses & Aaron');
  });

  it('leaves ordinary text untouched', () => {
    const plain = 'All praise is for Allah, Lord of all worlds.';
    expect(sanitizeTranslationText(plain)).toBe(plain);
  });
});

describe('parseHighlightedText', () => {
  it('splits matches into styled runs', () => {
    expect(parseHighlightedText('the <em>mercy</em> of Allah')).toEqual([
      { text: 'the ', highlighted: false },
      { text: 'mercy', highlighted: true },
      { text: ' of Allah', highlighted: false },
    ]);
  });

  it('handles several matches', () => {
    const runs = parseHighlightedText('<em>a</em> and <em>b</em>');
    expect(runs.filter((run) => run.highlighted).map((run) => run.text)).toEqual(['a', 'b']);
  });

  it('returns a single run when nothing matched', () => {
    expect(parseHighlightedText('no markers here')).toEqual([
      { text: 'no markers here', highlighted: false },
    ]);
  });

  it('drops empty runs', () => {
    expect(parseHighlightedText('<em>only</em>')).toEqual([{ text: 'only', highlighted: true }]);
  });
});
