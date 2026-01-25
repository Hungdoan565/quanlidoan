-- =====================================================
-- Migration 023: Create topic_grades table
-- Table for storing individual criterion grades per topic
-- =====================================================

-- Create topic_grades table
CREATE TABLE IF NOT EXISTS public.topic_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    
    -- Criterion identification (from JSONB criteria in grading_criteria)
    criterion_name TEXT NOT NULL,
    
    -- Grading info
    graded_by UUID NOT NULL REFERENCES public.profiles(id),
    grader_role TEXT NOT NULL CHECK (grader_role IN ('advisor', 'reviewer', 'council')),
    
    -- Score and notes
    score DECIMAL(4,2) NOT NULL CHECK (score >= 0 AND score <= 10),
    notes TEXT,
    
    -- Finalization
    is_final BOOLEAN DEFAULT false,
    finalized_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one grade per criterion per grader
    UNIQUE(topic_id, criterion_name, graded_by)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_grades_topic ON public.topic_grades(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_grades_grader ON public.topic_grades(graded_by);
CREATE INDEX IF NOT EXISTS idx_topic_grades_role ON public.topic_grades(grader_role);

-- RLS Policies
ALTER TABLE public.topic_grades ENABLE ROW LEVEL SECURITY;

-- Teachers can view grades for topics they advise/review
CREATE POLICY topic_grades_teacher_select ON public.topic_grades
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = topic_id
            AND (t.advisor_id = auth.uid() OR t.reviewer_id = auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Teachers can insert/update grades for topics they advise/review
CREATE POLICY topic_grades_teacher_insert ON public.topic_grades
    FOR INSERT
    WITH CHECK (
        graded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = topic_id
            AND (t.advisor_id = auth.uid() OR t.reviewer_id = auth.uid())
        )
    );

CREATE POLICY topic_grades_teacher_update ON public.topic_grades
    FOR UPDATE
    USING (
        graded_by = auth.uid()
        AND is_final = false
    );

-- Students can view their own topic grades (read-only)
CREATE POLICY topic_grades_student_select ON public.topic_grades
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = topic_id
            AND t.student_id = auth.uid()
        )
    );

-- Admin full access
CREATE POLICY topic_grades_admin_all ON public.topic_grades
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Update trigger
CREATE TRIGGER update_topic_grades_updated_at
    BEFORE UPDATE ON public.topic_grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- END OF MIGRATION 023
-- =====================================================
