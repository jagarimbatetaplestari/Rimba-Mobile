-- Client roles must not receive TRUNCATE/TRIGGER/REFERENCES or write trusted entitlements.
-- RLS remains responsible for row ownership on game saves and profile writes.
-- Deploy with the mobile/web profile readers that request explicit public columns.
REVOKE ALL ON TABLE public.profiles, public.game_saves, public.user_subscriptions
  FROM PUBLIC, anon, authenticated;

-- Email stays server-only. Account email comes from the authenticated Auth session.
GRANT SELECT (id, display_name, avatar_url, bio, xp, level, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT INSERT (id, display_name, avatar_url, bio, created_at, updated_at)
  ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url, bio, updated_at)
  ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_saves TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
DROP POLICY IF EXISTS "Users can upsert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
-- service_role retains its existing server privileges; no user progress is deleted.
