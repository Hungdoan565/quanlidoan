-- =====================================================
-- Migration 036: Add bio fields to profiles
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'interests'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN interests TEXT[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'bio_public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN bio_public BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.bio IS 'Short personal bio (plain text)';
COMMENT ON COLUMN public.profiles.interests IS 'Comma-separated interests stored as text[]';
COMMENT ON COLUMN public.profiles.bio_public IS 'Whether bio is visible in public-facing views';
