-- =============================================================================
-- RIMBA MOBILE (com.syntheticae.rimba) - COMPLETE SUPABASE SCHEMA & SECURITY
-- Idempotent Migration: Safe to run multiple times in Supabase SQL Editor
-- Includes:
--   1. public.profiles (Ranger profile & avatar metadata)
--   2. public.game_saves (Cloud JSONB sanctuary save state & focus history)
--   3. public.user_subscriptions (StoreKit 2 / RevenueCat entitlement sync)
--   4. storage.buckets ('avatars') + Storage RLS Policies
--   5. Auth User Creation Trigger (handle_new_rimba_user)
--   6. Apple Guideline 5.1.1(v) Account Deletion RPC (delete_user_account)
-- =============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Penjaga Rimba',
  bio TEXT DEFAULT 'Penjaga Hutan Suaka',
  avatar_url TEXT DEFAULT '🦌',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- 2. GAME SAVES TABLE (1 row per user_id for cloudSync.ts)
CREATE TABLE IF NOT EXISTS public.game_saves (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  save_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own game save" ON public.game_saves;
CREATE POLICY "Users can read their own game save"
  ON public.game_saves FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own game save" ON public.game_saves;
CREATE POLICY "Users can insert their own game save"
  ON public.game_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own game save" ON public.game_saves;
CREATE POLICY "Users can update their own game save"
  ON public.game_saves FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own game save" ON public.game_saves;
CREATE POLICY "Users can delete their own game save"
  ON public.game_saves FOR DELETE
  USING (auth.uid() = user_id);

-- 3. USER SUBSCRIPTIONS TABLE (StoreKit 2 / RevenueCat Cloud Mirror)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'none',
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NULL,
  store TEXT NOT NULL DEFAULT 'app_store',
  real_trees_pledged INTEGER NOT NULL DEFAULT 0,
  pioneer_badge BOOLEAN NOT NULL DEFAULT FALSE,
  tree_certificate_id TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can upsert their own subscription"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. AUTOMATIC PROFILE CREATION ON SIGNUP (Supports Email, Apple, & Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_rimba_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_avatar TEXT;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
     NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'Penjaga Rimba'
  );
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    '🦌'
  );

  INSERT INTO public.profiles (id, display_name, bio, avatar_url, created_at, updated_at)
  VALUES (NEW.id, v_name, 'Penjaga Hutan Suaka', v_avatar, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_rimba ON auth.users;
CREATE TRIGGER on_auth_user_created_rimba
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_rimba_user();

-- 5. STORAGE BUCKET FOR AVATARS ('avatars')
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. APPLE GUIDELINE 5.1.1(v) ACCOUNT & DATA DELETION RPC
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user's uploaded avatars in Storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = v_uid::text;

  -- Delete application data rows (also covered by ON DELETE CASCADE)
  DELETE FROM public.user_subscriptions WHERE user_id = v_uid;
  DELETE FROM public.game_saves WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE id = v_uid;

  -- Delete the user record from auth.users
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
