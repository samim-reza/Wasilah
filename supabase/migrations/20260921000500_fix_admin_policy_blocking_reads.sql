-- Fixes public reads broken by the admin policies.
--
-- The admin policies were written `for all`, which includes SELECT. Postgres
-- evaluates every applicable policy, so an anonymous read of these tables
-- called `is_admin()` — a function whose EXECUTE had been revoked from anon
-- and authenticated. The read failed with "permission denied for function
-- is_admin" rather than simply returning rows, so notification templates,
-- feature flags, announcements and the daily ayah stopped loading for every
-- user on every platform.
--
-- Two changes, both needed:
--
--   1. The admin policies now name only the write commands. Reads go through
--      the existing public SELECT policies and never touch the function.
--   2. EXECUTE is granted to `authenticated`, because a policy is evaluated
--      as the caller — an admin performing a write has to be able to call it.
--      Still withheld from `anon`: an anonymous caller has no admin identity
--      to check, and the write policies do not apply to them.
--
-- The function stays SECURITY DEFINER with a pinned search_path, and returns
-- only whether the CALLER is an admin, so granting it exposes nothing about
-- anyone else.

drop policy if exists "admins write templates" on public.notification_templates;
drop policy if exists "admins write feature flags" on public.feature_flags;
drop policy if exists "admins write announcements" on public.app_announcements;
drop policy if exists "admins write daily ayah" on public.daily_ayah_selections;

grant execute on function public.is_admin() to authenticated;

create policy "admins insert templates" on public.notification_templates
  for insert to authenticated with check (public.is_admin());
create policy "admins update templates" on public.notification_templates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete templates" on public.notification_templates
  for delete to authenticated using (public.is_admin());

create policy "admins insert feature flags" on public.feature_flags
  for insert to authenticated with check (public.is_admin());
create policy "admins update feature flags" on public.feature_flags
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete feature flags" on public.feature_flags
  for delete to authenticated using (public.is_admin());

create policy "admins insert announcements" on public.app_announcements
  for insert to authenticated with check (public.is_admin());
create policy "admins update announcements" on public.app_announcements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete announcements" on public.app_announcements
  for delete to authenticated using (public.is_admin());

create policy "admins insert daily ayah" on public.daily_ayah_selections
  for insert to authenticated with check (public.is_admin());
create policy "admins update daily ayah" on public.daily_ayah_selections
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete daily ayah" on public.daily_ayah_selections
  for delete to authenticated using (public.is_admin());
