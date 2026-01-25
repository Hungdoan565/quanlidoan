-- =====================================================
-- Migration 024: Fix topic_grades RLS policies
-- Issue: Admin policy missing WITH CHECK for INSERT
--        Teacher INSERT policy missing council role support
-- =====================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS topic_grades_teacher_insert ON public.topic_grades;
DROP POLICY IF EXISTS topic_grades_admin_all ON public.topic_grades;

-- Recreate teacher INSERT policy with council support
-- Teachers can insert grades for topics they advise/review OR are council members for
CREATE POLICY topic_grades_teacher_insert ON public.topic_grades
    FOR INSERT
    WITH CHECK (
        graded_by = auth.uid()
        AND (
            -- Advisor or Reviewer
            EXISTS (
                SELECT 1 FROM public.topics t
                WHERE t.id = topic_id
                AND (t.advisor_id = auth.uid() OR t.reviewer_id = auth.uid())
            )
            OR
            -- Council member (check council_members table if exists)
            EXISTS (
                SELECT 1 FROM public.council_members cm
                JOIN public.defense_schedules ds ON ds.council_id = cm.council_id
                WHERE ds.topic_id = topic_id
                AND cm.teacher_id = auth.uid()
            )
        )
    );

-- Recreate admin policy with BOTH USING and WITH CHECK
CREATE POLICY topic_grades_admin_all ON public.topic_grades
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- =====================================================
-- END OF MIGRATION 024
-- =====================================================
