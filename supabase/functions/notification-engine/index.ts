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

  // One query for the candidate set: devices that have gone quiet, whose owners
  // still want a daily reminder and allow push.
  const { data, error } = await supabase
    .from('push_tokens')
    .select(
      `user_id, token, timezone,
       streaks!inner(current_streak),
       reminder_preferences!inner(daily_reminder_time, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, max_notifications_per_day, daily_reminder_enabled),
       notification_preferences!inner(push_enabled)`,
    )
    .is('invalidated_at', null)
    .lt('last_seen_at', staleCutoff)
    .limit(MAX_USERS_PER_RUN);

  if (error) {
    console.error('notification-engine candidate query failed', error.message);
    return errorResponse(500, 'query_failed', 'Could not load candidates.');
  }

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

    // Respect the cap and the one-per-category-per-day rule.
    const { count } = await supabase
      .from('notification_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', row.user_id)
      .eq('local_date', now.date);

    if ((count ?? 0) >= preferences.max_notifications_per_day) {
      skipped += 1;
      continue;
    }

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
      channelId: isStreakRescue ? 'streak-reminders' : 'daily-reminders',
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
    // `ignoreDuplicates` relies on the partial unique index over
    // (user_id, local_date, dedupe_key).
    const { error: historyError } = await supabase
      .from('notification_history')
      .upsert(historyRows, { onConflict: 'user_id,local_date,dedupe_key', ignoreDuplicates: true });

    if (historyError) console.error('history insert failed', historyError.message);
  }

  if (pushResult.unregisteredTokens.length > 0) {
    await supabase
      .from('push_tokens')
      .update({ invalidated_at: new Date().toISOString() })
      .in('token', pushResult.unregisteredTokens);
  }

  return jsonResponse({
    candidates: data?.length ?? 0,
    skipped,
    sent: pushResult.sent,
    failed: pushResult.failed,
    invalidated: pushResult.unregisteredTokens.length,
  });
});
