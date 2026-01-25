-- Migration 032: Profile Avatars Storage Bucket & Notification Settings
-- This migration creates storage for user avatars and notification preferences table

-- =====================================================
-- 1. CREATE STORAGE BUCKET FOR AVATARS
-- =====================================================

-- Insert bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatars', 'avatars', true, 2097152) -- 2MB limit, public for easy display
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    public = EXCLUDED.public;

-- =====================================================
-- 2. AVATAR STORAGE RLS POLICIES
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Policy: Users can upload their own avatar
-- Path format: {user_id}/{filename}
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- =====================================================
-- 3. CREATE NOTIFICATION SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Email notification preferences
    email_topic_updates BOOLEAN DEFAULT true,
    email_logbook_feedback BOOLEAN DEFAULT true,
    email_grade_published BOOLEAN DEFAULT true,
    email_deadline_reminders BOOLEAN DEFAULT true,
    email_system_announcements BOOLEAN DEFAULT true,
    
    -- In-app notification preferences  
    push_topic_updates BOOLEAN DEFAULT true,
    push_logbook_feedback BOOLEAN DEFAULT true,
    push_grade_published BOOLEAN DEFAULT true,
    push_deadline_reminders BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure one settings record per user
    CONSTRAINT unique_user_notification_settings UNIQUE (user_id)
);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_notification_settings_user 
ON public.notification_settings(user_id);

-- =====================================================
-- 4. RLS POLICIES FOR NOTIFICATION SETTINGS
-- =====================================================

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own notification settings"
ON public.notification_settings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own settings
CREATE POLICY "Users can insert own notification settings"
ON public.notification_settings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own settings
CREATE POLICY "Users can update own notification settings"
ON public.notification_settings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own settings
CREATE POLICY "Users can delete own notification settings"
ON public.notification_settings FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- 5. AUTO-CREATE NOTIFICATION SETTINGS FOR NEW USERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create settings when profile is created
DROP TRIGGER IF EXISTS on_profile_created_notification_settings ON public.profiles;
CREATE TRIGGER on_profile_created_notification_settings
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_notification_settings();

-- =====================================================
-- 6. UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_settings_timestamp ON public.notification_settings;
CREATE TRIGGER update_notification_settings_timestamp
    BEFORE UPDATE ON public.notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_settings_timestamp();

-- =====================================================
-- 7. CREATE SETTINGS FOR EXISTING USERS
-- =====================================================

INSERT INTO public.notification_settings (user_id)
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.notification_settings)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 8. DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.notification_settings IS 
'Stores user notification preferences for email and in-app notifications';

COMMENT ON COLUMN public.notification_settings.email_topic_updates IS
'Receive email when topic status changes (approved, rejected, etc.)';

COMMENT ON COLUMN public.notification_settings.email_logbook_feedback IS
'Receive email when teacher provides feedback on logbook entries';

COMMENT ON COLUMN public.notification_settings.email_grade_published IS
'Receive email when grades are published';

COMMENT ON COLUMN public.notification_settings.email_deadline_reminders IS
'Receive email reminders before deadlines';

-- =====================================================
-- END OF MIGRATION 032
-- =====================================================
