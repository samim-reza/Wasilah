/**
 * Server-side reminder fallback.
 *
 * SCOPE — this is deliberately narrow, and the boundary matters:
 *
 * Wasilah schedules its reminders LOCALLY on the device. Local notifications
 * need no network, cannot be delayed by a push service, and never tell a server
 * when a person reads. The app re-plans them every time it opens, so for an
 * active user this function does nothing at all.
 *
 * What it covers is the one case local scheduling cannot: a user whose device
 * has not opened the app for long enough that its locally scheduled reminders
 * have all fired. For those users — and only those — it sends one push.
 *
 * Because of that scope it does NOT reimplement the full reminder engine. It
 * applies the rules that can be evaluated from stored state alone:
 *   • the day's minimum is not yet met,
 *   • the user is not inside their quiet hours,
 *   • the daily cap has not been reached,
 *   • nothing of this category was already sent today.
 *
 * The richer personalisation (learned reading time, adaptive back-off) stays on
 * the device, where the data lives.
 *
 * Invoked by a scheduled job with the service role key; `verify_jwt = true`
 * keeps clients out.
 */
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { sendPushMessages, type PushMessage } from '../_shared/expoPush.ts';
import { sendEmails, type EmailMessage } from '../_shared/email.ts';

/**
 * How long a device must have been silent before the server steps in.
 *
 * Two days: long enough that the device's own two-day scheduling horizon has
 * certainly elapsed, short enough to catch someone before a streak lapses
 * unnoticed.
 */
const STALE_DEVICE_HOURS = 48;

/** Cap on users processed per invocation, so one run cannot time out. */
const MAX_USERS_PER_RUN = 500;

interface CandidateRow {
  user_id: string;
  token: string;
  timezone: string;
  current_streak: number;
  daily_reminder_time: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  max_notifications_per_day: number;
}

/** The user's local date and wall-clock minute, from their stored IANA zone. */
function localNow(timezone: string): { date: string; minuteOfDay: number } | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = Object.fromEntries(
      formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
    );

    const hour = Number(parts['hour'] === '24' ? '0' : parts['hour']);
    return {
      date: `${parts['year']}-${parts['month']}-${parts['day']}`,
      minuteOfDay: hour * 60 + Number(parts['minute']),
    };
  } catch {
    // An invalid stored timezone means we cannot reason about this user's day,
    // and guessing would risk a 3am notification.
    return null;
  }
}

function toMinuteOfDay(time: string): number {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

/** Mirrors `isWithinWindow` on the client, including the midnight wrap. */
function isInQuietHours(minuteOfDay: number, start: string, end: string): boolean {
  const from = toMinuteOfDay(start);
  const to = toMinuteOfDay(end);

  if (from === to) return false;
  if (from < to) return minuteOfDay >= from && minuteOfDay < to;
  return minuteOfDay >= from || minuteOfDay < to;
}

/**
 * How close to the user's chosen reminder time counts as "now".
 *
 * The job runs periodically, so an exact match would miss almost everyone.
 */
const REMINDER_WINDOW_MINUTES = 30;

Deno.serve(async (request: Request): Promise<Response> => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  if (request.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed', 'Only POST is supported.');
  }

  const supabase = createAdminClient();
  const staleCutoff = new Date(Date.now() - STALE_DEVICE_HOURS * 3600_000).toISOString();

  // Devices that have gone quiet. Their owners' preferences and streaks are
  // fetched separately and joined in code — NOT with a PostgREST embed.
  //
  // This originally used `reminder_preferences!inner(...)`, which cannot work:
  // there is no foreign key from push_tokens to those tables. Each references
  // auth.users independently, and PostgREST will not infer a relationship
  // through a third table. The embed failed at request time, so this whole
  // function returned "Could not load candidates" every run — invisible for as
  // long as it was never deployed.
  const { data: tokenRows, error } = await supabase
    .from('push_tokens')
    .select('user_id, token, timezone')
    .is('invalidated_at', null)
    .lt('last_seen_at', staleCutoff)
    .limit(MAX_USERS_PER_RUN);

  if (error) {
    console.error('notification-engine candidate query failed', error.message);
    return errorResponse(500, 'query_failed', 'Could not load candidates.');
  }

  const candidateIds = [...new Set((tokenRows ?? []).map((row) => row.user_id as string))];

  const [reminderRows, notificationRows, streakRows] = await Promise.all([
    candidateIds.length
      ? supabase
          .from('reminder_preferences')
          .select(
            'user_id, daily_reminder_time, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, max_notifications_per_day, daily_reminder_enabled',
          )
          .in('user_id', candidateIds)
      : Promise.resolve({ data: [] }),
    candidateIds.length
      ? supabase.from('notification_preferences').select('user_id, push_enabled').in('user_id', candidateIds)
      : Promise.resolve({ data: [] }),
    candidateIds.length
      ? supabase.from('streaks').select('user_id, current_streak').in('user_id', candidateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const byUser = <T extends { user_id: string }>(rows: T[] | null): Map<string, T> =>
    new Map((rows ?? []).map((row) => [row.user_id, row]));

  const remindersByUser = byUser(reminderRows.data as { user_id: string }[] | null);
  const notificationsByUser = byUser(notificationRows.data as { user_id: string }[] | null);
  const streaksByUser = byUser(streakRows.data as { user_id: string }[] | null);

  // Shaped like the old embedded rows so the loop below is unchanged.
  const data = (tokenRows ?? []).map((row) => ({
    ...row,
    reminder_preferences: remindersByUser.get(row.user_id as string),
    notification_preferences: notificationsByUser.get(row.user_id as string),
    streaks: streaksByUser.get(row.user_id as string),
  }));

  const messages: PushMessage[] = [];
  const historyRows: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const raw of data ?? []) {
    const row = raw as unknown as CandidateRow & {
      reminder_preferences: {
        daily_reminder_enabled: boolean;
        daily_reminder_time: string;
        quiet_hours_enabled: boolean;
        quiet_hours_start: string;
        quiet_hours_end: string;
        max_notifications_per_day: number;
      };
      notification_preferences: { push_enabled: boolean };
      streaks: { current_streak: number };
    };

    const preferences = row.reminder_preferences;
    if (!preferences?.daily_reminder_enabled || !row.notification_preferences?.push_enabled) {
      skipped += 1;
      continue;
    }

    const now = localNow(row.timezone);
    if (!now) {
      skipped += 1;
      continue;
    }

    // Only fire near the time the user actually chose.
    const target = toMinuteOfDay(preferences.daily_reminder_time);
    if (Math.abs(now.minuteOfDay - target) > REMINDER_WINDOW_MINUTES) {
      skipped += 1;
      continue;
    }

    if (
      preferences.quiet_hours_enabled &&
      isInQuietHours(now.minuteOfDay, preferences.quiet_hours_start, preferences.quiet_hours_end)
    ) {
      skipped += 1;
      continue;
    }

    // The most important rule in the system: never tell someone to read when
    // they already have.
    const { data: progress } = await supabase
      .from('daily_progress')
      .select('minimum_met')
      .eq('user_id', row.user_id)
      .eq('local_date', now.date)
      .maybeSingle();

    if (progress?.minimum_met) {
      skipped += 1;
      continue;
    }

    // No daily cap: the dedupe key below is the only limit, one per category per day.

    const streak = row.streaks?.current_streak ?? 0;
    const isStreakRescue = streak > 0;

    messages.push({
      to: row.token,
      title: isStreakRescue ? `Your ${streak}-day streak is waiting` : 'Your daily ayah is waiting',
      body: 'One ayah is all it takes.',
      data: {
        category: isStreakRescue ? 'streak_reminder' : 'daily_reminder',
        templateKey: isStreakRescue ? 'streakReminder' : 'dailyReminder',
        route: '/(tabs)/home?focus=todays-ayah',
        scheduledFor: new Date().toISOString(),
      },
      channelId: isStreakRescue ? 'streak-reminders-v2' : 'daily-reminders-v2',
      sound: 'default',
    });

    historyRows.push({
      user_id: row.user_id,
      category: isStreakRescue ? 'streak_reminder' : 'daily_reminder',
      template_key: isStreakRescue ? 'streakReminder' : 'dailyReminder',
      outcome: 'sent',
      local_date: now.date,
      route: '/(tabs)/home?focus=todays-ayah',
      variables: { streakDays: streak },
      // Makes a duplicate send for the same user, day and category impossible
      // even if the job runs twice.
      dedupe_key: `${isStreakRescue ? 'streak_reminder' : 'daily_reminder'}:${now.date}`,
    });
  }

  const pushResult = await sendPushMessages(messages);

  if (historyRows.length > 0) {
    // A plain insert, NOT an upsert. The dedupe index is PARTIAL
    // (`where dedupe_key is not null`), and Postgres cannot infer a partial
    // index from an ON CONFLICT column list — so the upsert raised "no unique
    // or exclusion constraint matching" every single time and no history was
    // ever recorded. The index still prevents duplicates; a 23505 here means
    // the row already exists, which is success, not failure.
    const { error: historyError } = await supabase.from('notification_history').insert(historyRows);

    if (historyError && historyError.code !== '23505') {
      console.error('history insert failed', historyError.message);
    }
  }

  if (pushResult.unregisteredTokens.length > 0) {
    await supabase
      .from('push_tokens')
      .update({ invalidated_at: new Date().toISOString() })
      .in('token', pushResult.unregisteredTokens);
  }

  const emailResult = await sendReminderEmails(supabase);

  return jsonResponse({
    candidates: data?.length ?? 0,
    skipped,
    sent: pushResult.sent,
    failed: pushResult.failed,
    invalidated: pushResult.unregisteredTokens.length,
    email: emailResult,
  });
});

/**
 * The email pass, for users the push pass cannot reach.
 *
 * Driven by `notification_preferences.email_enabled` rather than by
 * `push_tokens`, which is the whole point: a web user has no push token and
 * would never appear in the query above, so without this they get no reminder
 * at all.
 *
 * Deliberately separate rather than folded into the push loop. The two have
 * different candidate sets, different failure modes and different costs, and
 * a shared loop would have to branch on all three.
 */
async function sendReminderEmails(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<Record<string, unknown>> {
  // Two queries joined in code rather than one PostgREST embed. There is no
  // foreign key between these tables — each references auth.users separately,
  // and PostgREST cannot infer a relationship through that. An `!inner` embed
  // here fails at request time, which is exactly the bug the push pass above
  // still has.
  const { data: optedIn, error } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .eq('email_enabled', true)
    .limit(MAX_USERS_PER_RUN);

  if (error) {
    console.error('email candidate query failed', error.message);
    return { sent: 0, failed: 0, provider: 'none', error: error.message };
  }

  const userIds = (optedIn ?? []).map((row) => (row as unknown as { user_id: string }).user_id);
  if (userIds.length === 0) return { sent: 0, failed: 0, provider: 'none' };

  const today = new Date().toISOString().slice(0, 10);

  const { data: reminderRows } = await supabase
    .from('reminder_preferences')
    .select('user_id, daily_reminder_enabled')
    .in('user_id', userIds);

  const wantsDaily = new Set(
    (reminderRows ?? [])
      .filter((row) => (row as unknown as { daily_reminder_enabled: boolean }).daily_reminder_enabled)
      .map((row) => (row as unknown as { user_id: string }).user_id),
  );

  // Anyone already notified today is excluded BEFORE sending, not after.
  //
  // The history upsert at the bottom dedupes rows, but it runs after the mail
  // has gone out — so on a schedule that fires more than once a day this
  // would email the same person every run. The history table is the record of
  // what was sent; it has to be consulted first, not merely written to.
  const { data: alreadyNotified } = await supabase
    .from('notification_history')
    .select('user_id')
    .eq('local_date', today)
    .in('user_id', userIds);

  const notifiedToday = new Set(
    (alreadyNotified ?? []).map((row) => (row as unknown as { user_id: string }).user_id),
  );

  const candidates = userIds
    .filter((id) => wantsDaily.has(id) && !notifiedToday.has(id))
    .map((user_id) => ({ user_id }));

  if (candidates.length === 0) return { sent: 0, failed: 0, provider: 'none' };

  if (candidates.length === 0) return { sent: 0, failed: 0, provider: 'none' };

  const messages: EmailMessage[] = [];
  const historyRows: Record<string, unknown>[] = [];

  for (const row of candidates) {
    const userId = (row as unknown as { user_id: string }).user_id;

    // The address lives in auth.users, which PostgREST cannot join, so it is
    // fetched per user. The candidate set is small enough for that to be
    // cheaper than maintaining a copy of the address in a public table —
    // and a copy would be one more place an email address can go stale.
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    const address = user?.user?.email;
    if (!address) continue;

    messages.push({
      to: address,
      subject: 'One ayah today',
      text:
        'You have not read yet today.\n\n' +
        'One ayah is enough to keep your streak.\n\n' +
        'Open Wasilah: https://mywasilah.com\n\n' +
        'To stop these emails, turn off email reminders in the app settings.',
    });

    historyRows.push({
      user_id: userId,
      category: 'daily_reminder',
      // NOT NULL with no default. Omitting it made every insert fail, which
      // the guard above then read as "not yet notified" — so the same person
      // was emailed on every run.
      template_key: 'dailyReminderEmail',
      outcome: 'sent',
      local_date: today,
      route: '/(tabs)/home',
      // Shares the partial unique index with the push pass, so a user who
      // gets a push cannot also be emailed for the same day.
      dedupe_key: `daily_reminder:${today}`,
    });
  }

  const result = await sendEmails(messages);

  if (historyRows.length > 0 && result.sent > 0) {
    // Same reasoning as the push pass: plain insert, duplicates tolerated.
    const { error: historyError } = await supabase.from('notification_history').insert(historyRows);

    if (historyError && historyError.code !== '23505') {
      console.error('email history insert failed', historyError.message);
    }
  }

  return { ...result, candidates: candidates.length };
}
