-- =====================================================
-- Migration 031: Expand topic_grades RLS for admin inserts/updates
-- =====================================================

-- Allow admins to insert/update grades (same as select/all access)
DROP POLICY IF EXISTS topic_grades_teacher_insert ON public.topic_grades;
CREATE POLICY topic_grades_teacher_insert ON public.topic_grades
    FOR INSERT
    WITH CHECK (
        (
            graded_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.topics t
                WHERE t.id = topic_id
                AND (t.advisor_id = auth.uid() OR t.reviewer_id = auth.uid())
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS topic_grades_teacher_update ON public.topic_grades;
CREATE POLICY topic_grades_teacher_update ON public.topic_grades
    FOR UPDATE
    USING (
        (
            graded_by = auth.uid()
            AND is_final = false
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- =====================================================
-- END OF MIGRATION 031
-- =====================================================
