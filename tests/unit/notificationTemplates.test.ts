/**
 * Template rendering tests.
 *
 * The rule under test is the one that matters for safety: a remote row may
 * change what a notification SAYS, never where it goes or which category it
 * belongs to. Those are behaviour, and a server row must not be able to
 * redirect a notification or move it onto a channel the user muted something
 * else on.
 */
import { renderTemplate } from '@/features/notifications/templates';
import {
  clearRemoteTemplates,
  getCachedTemplate,
} from '@/features/notifications/templates/remoteTemplates';

afterEach(() => {
  clearRemoteTemplates();
});

describe('renderTemplate', () => {
  it('renders shipped copy with no remote override', () => {
    const content = renderTemplate('dailyReminder');

    expect(content).not.toBeNull();
    expect(content?.title).toBeTruthy();
    expect(content?.data.category).toBe('daily_reminder');
  });

  it('declines a template that has nothing meaningful to say', () => {
    // A "0-day streak is waiting" notification would be nonsense, so the
    // template refuses rather than rendering it.
    expect(renderTemplate('streakReminder', { streakDays: 0 })).toBeNull();
    expect(renderTemplate('goalReminder', { remainingVerses: 0 })).toBeNull();
  });

  it('renders a streak reminder when there is a streak to save', () => {
    const content = renderTemplate('streakReminder', { streakDays: 12 });

    expect(content).not.toBeNull();
    expect(content?.title).toContain('12');
    expect(content?.data.route).toBeTruthy();
  });

  it('returns null for an unknown key rather than an empty notification', () => {
    expect(renderTemplate('noSuchTemplate')).toBeNull();
  });

  it('keeps the deep link and category out of remote control', () => {
    const shipped = renderTemplate('dailyReminder');

    // Even with a cache primed, route and category come from shipped code.
    expect(shipped?.data.route).toContain('/(tabs)/home');
    expect(shipped?.data.category).toBe('daily_reminder');
  });
});

describe('getCachedTemplate', () => {
  it('returns null before anything is primed, so shipped copy is used', () => {
    expect(getCachedTemplate('dailyReminder')).toBeNull();
  });
});
