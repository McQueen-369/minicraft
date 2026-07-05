-- Documents the intentional deny-all RLS posture on the minicraft tables.
-- (Already applied to the shared Supabase project as migration
-- `document_rls_deny_all_posture`; kept here as the reference copy.)
--
-- Supabase's security linter flags these tables as "RLS enabled, no policy"
-- (lint 0008). That is by design: direct PostgREST access is deny-all and all
-- reads/writes go through the token-checked SECURITY DEFINER minicraft_* RPCs
-- defined in 0001_minicraft_profiles_and_worlds.sql. These comments record the
-- intent so future security audits don't re-flag them as an oversight.

comment on table public.minicraft_profiles is
  'Deny-all by design: RLS enabled with no policies and no anon/authenticated grants. All access goes through token-checked SECURITY DEFINER minicraft_* RPCs (reference: minicraft repo supabase/migrations).';
comment on table public.minicraft_sessions is
  'Deny-all by design: RLS enabled with no policies and no anon/authenticated grants. All access goes through token-checked SECURITY DEFINER minicraft_* RPCs (reference: minicraft repo supabase/migrations).';
comment on table public.minicraft_worlds is
  'Deny-all by design: RLS enabled with no policies and no anon/authenticated grants. All access goes through token-checked SECURITY DEFINER minicraft_* RPCs (reference: minicraft repo supabase/migrations).';
