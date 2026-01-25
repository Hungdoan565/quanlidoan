-- =====================================================
-- Migration 021: Fix Storage RLS Policies for new path format
-- Path format: session/{session_id}/class/{class_id}/topic/{topic_id}/...
-- Topic ID is at index 5 in the path (0-indexed)
-- =====================================================

-- Drop ALL existing policies on storage.objects for submissions bucket
DROP POLICY IF EXISTS "Students can upload their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view mentee submissions" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all submissions" ON storage.objects;

-- Helper function to extract topic_id from path
-- Path: session/{session_id}/class/{class_id}/topic/{topic_id}/...
CREATE OR REPLACE FUNCTION extract_topic_id_from_path(file_path TEXT)
RETURNS UUID AS $$
DECLARE
    parts TEXT[];
    topic_idx INT;
BEGIN
    parts := string_to_array(file_path, '/');
    
    -- Find 'topic' in path and get the next element
    FOR i IN 1..array_length(parts, 1) LOOP
        IF parts[i] = 'topic' AND i < array_length(parts, 1) THEN
            BEGIN
                RETURN parts[i + 1]::uuid;
            EXCEPTION WHEN OTHERS THEN
                RETURN NULL;
            END;
        END IF;
    END LOOP;
    
    -- Fallback: try first element (old format)
    BEGIN
        RETURN parts[1]::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Policy: Students can upload files to their own topic folder
CREATE POLICY "Students can upload their own submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'submissions' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = extract_topic_id_from_path(name)
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress', 'submitted')
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
        WHERE t.id = extract_topic_id_from_path(name)
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
        WHERE t.id = extract_topic_id_from_path(name)
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress', 'submitted')
    )
)
WITH CHECK (
    bucket_id = 'submissions' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = extract_topic_id_from_path(name)
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress', 'submitted')
    )
);

-- Policy: Students can delete their own submissions
CREATE POLICY "Students can delete their own submissions"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'submissions' AND
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = extract_topic_id_from_path(name)
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress', 'submitted')
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
        WHERE t.id = extract_topic_id_from_path(name)
        AND t.advisor_id = auth.uid()
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
-- END OF MIGRATION 021
-- =====================================================
