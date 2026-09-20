-- Two things the web version needs: email notifications, and an admin role.

-- --- Email notifications --------------------------------------------------
--
-- The web app cannot schedule a local notification and cannot hold a push
-- token, so the reminder that makes this app work has no delivery channel
-- there. Email is that channel.
--
-- Opt-in, defaulting to off. An app that starts emailing without being asked
-- is an app people unsubscribe from once and never trust again — and the
-- existing push preference follows the same rule.

alter table public.notification_preferences
  add column email_enabled boolean not null default false;

comment on column public.notification_preferences.email_enabled is
  'Opt-in for reminders by email. The only delivery channel available on web.';

-- --- Admin role -------------------------------------------------------------
--
-- A separate table rather than a boolean on `profiles`, for one reason: a
-- profile row is writable by its owner, so an `is_admin` column there would be
-- self-grantable. Nothing outside the service role may write here at all.
--
-- There is deliberately no INSERT/UPDATE/DELETE policy. Admins are added from
-- the SQL editor or with the service key, never through the API.

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- An admin may see that they are one; nobody can see the list, and nobody can
-- write to it through the API.
create policy "read own admin row" on public.admin_users for select
  using (auth.uid() = user_id);

/**
 * Whether the caller is an admin.
 *
 * SECURITY DEFINER so it can read `admin_users` from inside policies on other
 * tables, where the caller has no access of their own. `search_path` is
 * pinned and EXECUTE is revoked from the API roles below — the function is
 * for policies, not for callers.
 */
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin() from authenticated;

-- --- Admin access to the content tables -------------------------------------
--
-- These four already existed and were readable by everyone; what they lacked
-- was any way to WRITE them outside the SQL editor, which is what kept the
-- admin dashboard theoretical. Each now gets a policy naming `is_admin()`
-- rather than a client-side flag, so the check happens in the database and a
-- tampered client gains nothing.

create policy "admins write templates" on public.notification_templates for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admins write feature flags" on public.feature_flags for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admins write announcements" on public.app_announcements for all
  using (public.is_admin()) with check (public.is_admin());

create policy "admins write daily ayah" on public.daily_ayah_selections for all
  using (public.is_admin()) with check (public.is_admin());
