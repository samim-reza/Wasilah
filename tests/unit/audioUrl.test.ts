/**
 * Audio URL resolution tests.
 *
 * The Content API returns recitation paths RELATIVE to the audio host —
 * `"Alafasy/mp3/001001.mp3"`, not a URL. Passing that to the player produced
 * no sound and no error: the play button simply did nothing, which is the
 * hardest kind of failure to diagnose from the outside.
 */
import { mapAudioFiles, resolveAudioUrl } from '@/features/quran/services/quranMapper';
import { audioBaseUrl } from '@/config/quran';

describe('resolveAudioUrl', () => {
  it('resolves the relative path the API actually returns', () => {
    expect(resolveAudioUrl('Alafasy/mp3/001001.mp3')).toBe(`${audioBaseUrl}Alafasy/mp3/001001.mp3`);
  });

  it('leaves an absolute URL alone', () => {
    const absolute = 'https://audio.example.test/001001.mp3';
    expect(resolveAudioUrl(absolute)).toBe(absolute);
  });

  it('upgrades a protocol-relative URL to https', () => {
    expect(resolveAudioUrl('//cdn.example.test/a.mp3')).toBe('https://cdn.example.test/a.mp3');
  });

  it('does not double the slash on a leading-slash path', () => {
    expect(resolveAudioUrl('/Alafasy/mp3/001001.mp3')).toBe(
      `${audioBaseUrl}Alafasy/mp3/001001.mp3`,
    );
  });

  it('trims surrounding whitespace', () => {
    expect(resolveAudioUrl('  Alafasy/mp3/001001.mp3  ')).toBe(
      `${audioBaseUrl}Alafasy/mp3/001001.mp3`,
    );
  });

  it('returns empty for an empty path rather than a bare host', () => {
    // `${base}` alone would be a valid-looking URL that plays nothing.
    expect(resolveAudioUrl('')).toBe('');
    expect(resolveAudioUrl('   ')).toBe('');
  });
});

describe('mapAudioFiles', () => {
  it('maps the real shape returned by /recitations/{id}/by_ayah', () => {
    const tracks = mapAudioFiles({
      audio_files: [{ verse_key: '1:1', url: 'Alafasy/mp3/001001.mp3' }],
    });

    expect(tracks).toEqual([
      { verseKey: '1:1', url: `${audioBaseUrl}Alafasy/mp3/001001.mp3`, segments: null },
    ]);
  });

  it('keeps word timings when the reciter provides them', () => {
    const tracks = mapAudioFiles({
      audio_files: [{ verse_key: '1:1', url: 'a.mp3', segments: [[0, 1, 100, 400]] }],
    });

    expect(tracks[0]?.segments).toEqual([[0, 1, 100, 400]]);
  });

  it('drops a track with no usable URL instead of queueing silence', () => {
    const tracks = mapAudioFiles({
      audio_files: [
        { verse_key: '1:1', url: '' },
        { verse_key: '1:2', url: 'Alafasy/mp3/001002.mp3' },
      ],
    });

    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.verseKey).toBe('1:2');
  });

  it('handles a missing audio_files array', () => {
    expect(mapAudioFiles({} as never)).toEqual([]);
  });
});
