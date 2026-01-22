-- =====================================================
-- Migration 007: Update logbook_entries schema + Enroll Student
-- =====================================================

-- Step 1: Update logbook_entries table to match frontend service
-- Drop old columns and add new ones

-- First, check if table exists and has old schema
-- If logbook_entries exists with old columns, alter it
-- If not exists, create with new schema

-- Drop and recreate (safer for development)
DROP TABLE IF EXISTS public.logbook_entries CASCADE;

CREATE TABLE public.logbook_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  
  week_number INTEGER NOT NULL,
  content TEXT NOT NULL,           -- Nội dung công việc
  meeting_date DATE,               -- Ngày gặp GV
  
  -- Teacher feedback
  teacher_note TEXT,               -- Ghi chú của GV
  teacher_confirmed BOOLEAN DEFAULT false,  -- GV đã xác nhận gặp
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(topic_id, week_number)
);

-- Index
CREATE INDEX idx_logbook_topic ON public.logbook_entries(topic_id);
CREATE INDEX idx_logbook_week ON public.logbook_entries(week_number);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_logbook_updated_at ON public.logbook_entries;
CREATE TRIGGER update_logbook_updated_at
  BEFORE UPDATE ON public.logbook_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies for logbook_entries
ALTER TABLE public.logbook_entries ENABLE ROW LEVEL SECURITY;

-- Students can view their own logbook
CREATE POLICY "Students can view own logbook"
  ON public.logbook_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.topics
      WHERE topics.id = logbook_entries.topic_id
      AND topics.student_id = auth.uid()
    )
  );

-- Students can insert their own logbook
CREATE POLICY "Students can insert own logbook"
  ON public.logbook_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.topics
      WHERE topics.id = logbook_entries.topic_id
      AND topics.student_id = auth.uid()
    )
  );

-- Students can update own unconfirmed entries
CREATE POLICY "Students can update own unconfirmed logbook"
  ON public.logbook_entries FOR UPDATE
  USING (
    teacher_confirmed = false
    AND EXISTS (
      SELECT 1 FROM public.topics
      WHERE topics.id = logbook_entries.topic_id
      AND topics.student_id = auth.uid()
    )
  );

-- Teachers can view logbook of their advised students
CREATE POLICY "Teachers can view advised students logbook"
  ON public.logbook_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.topics
      WHERE topics.id = logbook_entries.topic_id
      AND topics.advisor_id = auth.uid()
    )
  );

-- Teachers can update (add note, confirm) logbook
CREATE POLICY "Teachers can update advised students logbook"
  ON public.logbook_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.topics
      WHERE topics.id = logbook_entries.topic_id
      AND topics.advisor_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admin full access to logbook"
  ON public.logbook_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- Step 2: Enroll Student to a Class
-- Run these queries to find IDs:
-- =====================================================

-- Find student "Đoàn Vĩnh Hưng"
-- SELECT id, full_name, email FROM profiles WHERE full_name LIKE '%Vĩnh Hưng%';

-- Find available classes
-- SELECT id, name FROM classes LIMIT 10;

-- Then insert into class_students:
-- INSERT INTO class_students (class_id, student_id)
-- VALUES ('CLASS_UUID', 'STUDENT_UUID');

-- =====================================================
-- END OF MIGRATION 007
-- =====================================================
