-- Migration 011: Create Storage Bucket for Submissions
-- This migration creates the "submissions" bucket and sets up RLS policies

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================
-- Note: This needs to be run via Supabase Dashboard or API
-- as storage.buckets is a system table

-- Bucket configuration to create via Dashboard:
-- Name: submissions
-- Public: false (private bucket)
-- File size limit: 100MB
-- Allowed MIME types: application/pdf, application/msword, 
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--   application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation,
--   application/zip, application/x-rar-compressed, application/x-7z-compressed

-- Insert bucket if using migrations
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('submissions', 'submissions', false, 104857600) -- 100MB limit
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit;

-- =====================================================
-- 2. STORAGE RLS POLICIES
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can upload their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view mentee submissions" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all submissions" ON storage.objects;

-- Policy: Students can upload files to their own topic folder
-- Path format: {topic_id}/{phase}/{filename}
CREATE POLICY "Students can upload their own submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'submissions' AND
    -- Extract topic_id from path (first segment)
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = (storage.foldername(name))[1]::uuid
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress')
    )
);

-- Policy: Students can read their own submissions
CREATE POLICY "Students can view their own submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'submissions' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = (storage.foldername(name))[1]::uuid
        AND t.student_id = auth.uid()
    )
);

-- Policy: Students can update (replace) their own submissions
CREATE POLICY "Students can update their own submissions"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'submissions' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = (storage.foldername(name))[1]::uuid
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress')
    )
)
WITH CHECK (
    bucket_id = 'submissions' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = (storage.foldername(name))[1]::uuid
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress')
    )
);

-- Policy: Teachers can view submissions of their mentees
CREATE POLICY "Teachers can view mentee submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'submissions' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        JOIN public.classes c ON t.class_id = c.id
        WHERE t.id = (storage.foldername(name))[1]::uuid
        AND c.advisor_id = auth.uid()
    )
);

-- Policy: Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'submissions' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- 3. ADD INDEX FOR REPORT QUERIES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reports_topic_phase 
ON public.reports(topic_id, phase);

CREATE INDEX IF NOT EXISTS idx_reports_submitted_at 
ON public.reports(submitted_at DESC);

-- =====================================================
-- 4. COMMENT FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.reports IS 
'Stores metadata for student submissions. Actual files are in storage.objects (submissions bucket). 
Path format: {topic_id}/{phase}/{version}_{original_filename}';
