import {
  duaCatalogue,
  findOccasion,
  PLACEHOLDER_ARABIC,
  SOURCE_PLACEHOLDER,
} from '@/features/duas/data/duaCatalogue';

describe('dua catalogue', () => {
  it('has a stable, unique id for every occasion', () => {
    const ids = duaCatalogue.map((occasion) => occasion.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses ids that are safe in a route and a notification payload', () => {
    for (const occasion of duaCatalogue) {
      expect(occasion.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('gives every occasion a prompt, because that is the notification copy', () => {
    for (const occasion of duaCatalogue) {
      expect(occasion.prompt.trim().length).toBeGreaterThan(0);
      expect(occasion.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('finds an occasion by id and returns undefined for an unknown one', () => {
    expect(findOccasion('rain-falling')?.title).toBe('When it rains');
    expect(findOccasion('no-such-occasion')).toBeUndefined();
  });

  /**
   * The release gate for spec §23.
   *
   * While an entry still holds placeholder text it may carry a placeholder
   * source. The moment real Arabic is pasted in, the citation becomes
   * mandatory — so content cannot reach users without one, and nobody has to
   * remember the rule.
   */
  it('requires a real source on any occasion that has real content', () => {
    const uncited = duaCatalogue
      .filter((occasion) => occasion.text.arabic !== PLACEHOLDER_ARABIC)
      .filter((occasion) => occasion.text.source.trim() === SOURCE_PLACEHOLDER)
      .map((occasion) => occasion.id);

    expect(uncited).toEqual([]);
  });

  it('never leaves the source field blank, even while stubbed', () => {
    for (const occasion of duaCatalogue) {
      expect(occasion.text.source.trim().length).toBeGreaterThan(0);
    }
  });
});
