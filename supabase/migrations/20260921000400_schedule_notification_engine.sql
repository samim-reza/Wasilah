-- Runs the reminder engine on a schedule.
--
-- Hourly, not daily. The push pass fires only inside each user's own reminder
-- window, checked against their timezone — a once-a-day job would serve one
-- timezone and miss every other. The email pass is guarded separately: a user
-- already notified today is excluded before anything is sent, so running
-- twenty-four times a day still produces at most one email each.
--
-- The service role key lives in Vault rather than inline in the job command.
-- `cron.job` is readable by roles that have no business holding that key, and
-- a credential pasted into a scheduled command is one nobody remembers to
-- rotate.
--
-- The function now requires a JWT, so an unauthenticated caller who finds the
-- URL gets a 401 instead of triggering a send.

select cron.unschedule('notification-engine-hourly')
  where exists (select 1 from cron.job where jobname = 'notification-engine-hourly');

select cron.schedule(
  'notification-engine-hourly',
  '7 * * * *',  -- Seven past, to stay off the busy top of the hour.
  $$
  select net.http_post(
    url := 'https://sdwfbwwrkphytuyhxvzu.supabase.co/functions/v1/notification-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'notification_engine_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
