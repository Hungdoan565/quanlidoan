-- Migration 019: Create Storage Bucket for Logbook Attachments
-- This migration creates the "logbook-attachments" bucket and sets up RLS policies

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

-- Insert bucket for logbook attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('logbook-attachments', 'logbook-attachments', false, 5242880) -- 5MB limit per file
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit;

-- =====================================================
-- 2. STORAGE RLS POLICIES
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can upload logbook attachments" ON storage.objects;
DROP POLICY IF EXISTS "Students can view own logbook attachments" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete own logbook attachments" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view mentee logbook attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all logbook attachments" ON storage.objects;

-- Policy: Students can upload files to their own topic folder
-- Path format: {topic_id}/{timestamp}_{filename}
CREATE POLICY "Students can upload logbook attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'logbook-attachments' AND
    -- Extract topic_id from path (first segment)
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = (storage.foldername(name))[1]::uuid
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress', 'submitted')
    )
);

-- Policy: Students can read their own logbook attachments
CREATE POLICY "Students can view own logbook attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'logbook-attachments' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = (storage.foldername(name))[1]::uuid
        AND t.student_id = auth.uid()
    )
);

-- Policy: Students can delete their own logbook attachments
CREATE POLICY "Students can delete own logbook attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'logbook-attachments' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = (storage.foldername(name))[1]::uuid
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress', 'submitted')
    )
);

-- Policy: Teachers can view attachments of their mentees
CREATE POLICY "Teachers can view mentee logbook attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'logbook-attachments' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = (storage.foldername(name))[1]::uuid
        AND t.advisor_id = auth.uid()
    )
);

-- Policy: Admins can view all logbook attachments
CREATE POLICY "Admins can view all logbook attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'logbook-attachments' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- 3. COMMENT FOR DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN public.logbook_entries.attachments IS 
'JSONB array of file attachments. Format: [{"name": "filename.pdf", "url": "...", "path": "topic_id/timestamp_filename", "size": 12345, "type": "application/pdf"}]';

-- =====================================================
-- END OF MIGRATION 019
-- =====================================================
