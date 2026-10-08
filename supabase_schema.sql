-- ==============================================================================
-- RIMBA MOBILE: SUPABASE DATABASE SCHEMA & POLICIES
-- ==============================================================================
-- Menyiapkan tabel 'profiles', 'game_saves', trigger auto-create profile,
-- Row Level Security (RLS), dan bucket storage 'avatars'.
-- Jalankan skrip ini langsung di Supabase SQL Editor.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL PROFILES (Data Identitas Ranger Rimba)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT NOT NULL DEFAULT 'Penjaga Rimba',
    avatar_url TEXT DEFAULT '🦌',
    bio TEXT DEFAULT 'Penjaga Hutan Suaka',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexing untuk performa kueri
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON public.profiles(xp DESC);

-- 3. TABEL GAME_SAVES (Cloud Save Suaka Rimba)
CREATE TABLE IF NOT EXISTS public.game_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    save_version INTEGER NOT NULL DEFAULT 1,
    save_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexing untuk pencarian cepat save data user
CREATE INDEX IF NOT EXISTS idx_game_saves_user_id ON public.game_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_updated_at ON public.game_saves(updated_at DESC);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

-- Kebijakan Profiles:
-- Semua user terautentikasi / publik dapat melihat data profil dasar (untuk Leaderboard & Kunjungan Suaka)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- User hanya dapat memperbarui profil miliknya sendiri
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- User dapat menginsert profil miliknya
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Kebijakan Game Saves:
-- Hanya pemilik akun yang dapat membaca save data suakanya
DROP POLICY IF EXISTS "Users can view own save data" ON public.game_saves;
CREATE POLICY "Users can view own save data" 
ON public.game_saves FOR SELECT 
USING (auth.uid() = user_id);

-- Hanya pemilik akun yang dapat menambah save data
DROP POLICY IF EXISTS "Users can insert own save data" ON public.game_saves;
CREATE POLICY "Users can insert own save data" 
ON public.game_saves FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Hanya pemilik akun yang dapat memperbarui save data suakanya
DROP POLICY IF EXISTS "Users can update own save data" ON public.game_saves;
CREATE POLICY "Users can update own save data" 
ON public.game_saves FOR UPDATE 
USING (auth.uid() = user_id);

-- 5. TRIGGER OTOMATIS SAAT USER BARU MENDAFTAR (auth.users -> public.profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    initial_name TEXT;
BEGIN
    initial_name := COALESCE(
        new.raw_user_meta_data->>'display_name',
        split_part(new.email, '@', 1),
        'Penjaga Rimba'
    );

    INSERT INTO public.profiles (id, email, display_name, avatar_url, bio, created_at, updated_at)
    VALUES (
        new.id,
        new.email,
        initial_name,
        '🦌',
        'Penjaga Hutan Suaka',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang Trigger ke tabel auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. STORAGE BUCKET UNTUK AVATAR
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Storage Avatars
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update their avatars" ON storage.objects;
CREATE POLICY "Users can update their avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Selesai!
