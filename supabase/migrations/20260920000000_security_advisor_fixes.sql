-- Clears the Supabase Security Advisor warnings before launch.
--
-- Nothing here changes behaviour; each statement closes a way the database
-- could be misused that the advisor flagged on the production project.

-- --- Pin the search path on the two functions that left it mutable ---------
--
-- A function without an explicit search_path resolves unqualified names using
-- whatever the caller's search_path happens to be. Combined with a schema the
-- caller can write to, that is a route to executing someone else's function in
-- place of the intended one. `handle_new_user` already pinned it; these two
-- were missed.
--
-- `public` rather than `''` because both bodies reference public objects
-- unqualified, so this fixes the exposure without rewriting either function.

alter function public.set_updated_at() set search_path = public;

alter function public.progress_meets_target(
  public.goal_unit, integer, integer, integer, numeric, integer
) set search_path = public;

-- --- Stop handle_new_user being callable over the API ----------------------
--
-- It is a SECURITY DEFINER trigger function that provisions a profile row for
-- a newly created auth user. It is only ever meant to be fired by its trigger
-- on auth.users, but living in `public` made it callable through PostgREST by
-- anonymous AND signed-in callers, which the advisor flagged twice.
--
-- Revoking EXECUTE does not affect the trigger: a trigger runs as the table
-- owner, not as the caller, so the provisioning path is untouched.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
