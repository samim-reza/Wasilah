import { findOccasion } from '@/features/duas/data/duaCatalogue';
import { buildDuaNotification, compactDuaText } from '@/features/duas/utils/duaNotification';

describe('buildDuaNotification', () => {
  it('says when in the title and gives the dua in the body', () => {
    const occasion = findOccasion('leaving-home')!;
    const notification = buildDuaNotification(occasion);

    expect(notification.title).toBe('Say this when you leave the house.');
    expect(notification.title).not.toMatch(/do you know/i);
    expect(notification.body).toContain(occasion.text.arabic);
    expect(notification.data.route).toBe('/dua/leaving-home');
  });

  it('leaves long Arabic to the dua screen and shortens the meaning', () => {
    const occasion = findOccasion('friday')!;
    const body = compactDuaText(occasion);

    expect(body).not.toContain(occasion.text.arabic);
    expect(body.length).toBeLessThanOrEqual(141);
  });

  it('never asks a question in place of the words', () => {
    // Every cue in the catalogue is direct now.
    const everyday = ['before-eating', 'after-wudu', 'entering-masjid', 'sneezing'];
    for (const id of everyday) {
      expect(findOccasion(id)!.prompt).toMatch(/^Say this/);
    }
  });
});
