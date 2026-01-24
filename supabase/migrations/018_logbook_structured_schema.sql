-- =====================================================
-- Migration 018: Structured Logbook Schema
-- Full restructure for enhanced weekly journal entries
-- =====================================================

-- Step 1: Add new columns to logbook_entries
-- Using ALTER TABLE to preserve existing data

-- Week date range
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Meeting type (online/offline)
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(20) DEFAULT 'offline' 
CHECK (meeting_type IN ('offline', 'online'));

-- Structured task lists (JSONB for flexibility)
-- completed_tasks: ["task1", "task2", ...]
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS completed_tasks JSONB DEFAULT '[]'::jsonb;

-- in_progress_tasks: [{"task": "...", "progress": 70}, ...]
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS in_progress_tasks JSONB DEFAULT '[]'::jsonb;

-- planned_tasks: ["task1", "task2", ...]
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS planned_tasks JSONB DEFAULT '[]'::jsonb;

-- Issues/problems section
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS issues TEXT;

-- File attachments: [{"name": "...", "url": "...", "size": "..."}, ...]
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Status workflow: draft -> pending -> approved/needs_revision
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'
CHECK (status IN ('draft', 'pending', 'approved', 'needs_revision'));

-- Submission timestamp
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Teacher feedback (enhanced from teacher_note)
ALTER TABLE public.logbook_entries 
ADD COLUMN IF NOT EXISTS feedback_comment TEXT,
ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

-- Step 2: Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_logbook_status ON public.logbook_entries(status);
CREATE INDEX IF NOT EXISTS idx_logbook_submitted ON public.logbook_entries(submitted_at);

-- Step 3: Migrate existing data
-- Convert old 'content' field to new structure where applicable
-- This is safe to run multiple times
UPDATE public.logbook_entries
SET 
    status = CASE 
        WHEN teacher_confirmed = true THEN 'approved'
        ELSE 'pending'
    END,
    submitted_at = COALESCE(submitted_at, created_at),
    feedback_comment = COALESCE(feedback_comment, teacher_note),
    feedback_at = CASE 
        WHEN teacher_note IS NOT NULL THEN updated_at 
        ELSE NULL 
    END
WHERE status = 'draft' OR status IS NULL;

-- Step 4: Create storage bucket for logbook attachments (if not exists)
-- Note: This needs to be run via Supabase Dashboard or API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('logbook-attachments', 'logbook-attachments', false)
-- ON CONFLICT (id) DO NOTHING;

-- Step 5: Update RLS policies for new workflow

-- Students can only update draft entries (not submitted ones)
DROP POLICY IF EXISTS "Students can update own unconfirmed logbook" ON public.logbook_entries;

CREATE POLICY "Students can update own draft logbook"
  ON public.logbook_entries FOR UPDATE
  USING (
    status IN ('draft', 'needs_revision')
    AND EXISTS (
      SELECT 1 FROM public.topics
      WHERE topics.id = logbook_entries.topic_id
      AND topics.student_id = auth.uid()
    )
  );

-- Teachers can update status and feedback for pending entries
DROP POLICY IF EXISTS "Teachers can update advised students logbook" ON public.logbook_entries;

CREATE POLICY "Teachers can review advised students logbook"
  ON public.logbook_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.topics
      WHERE topics.id = logbook_entries.topic_id
      AND topics.advisor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.topics
      WHERE topics.id = logbook_entries.topic_id
      AND topics.advisor_id = auth.uid()
    )
  );

-- =====================================================
-- Helper function to calculate week dates
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_week_dates(
    topic_approved_at TIMESTAMPTZ,
    week_num INTEGER
)
RETURNS TABLE(start_date DATE, end_date DATE) AS $$
BEGIN
    start_date := (topic_approved_at + ((week_num - 1) * 7 || ' days')::interval)::date;
    end_date := (topic_approved_at + ((week_num * 7) - 1 || ' days')::interval)::date;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- END OF MIGRATION 018
-- =====================================================
