-- =====================================================
-- Migration 025: Fix topic_grades RLS policies v2
-- Simpler approach: allow any authenticated user to manage their own grades
-- =====================================================

-- Drop ALL existing policies on topic_grades to start fresh
DROP POLICY IF EXISTS topic_grades_teacher_select ON public.topic_grades;
DROP POLICY IF EXISTS topic_grades_teacher_insert ON public.topic_grades;
DROP POLICY IF EXISTS topic_grades_teacher_update ON public.topic_grades;
DROP POLICY IF EXISTS topic_grades_student_select ON public.topic_grades;
DROP POLICY IF EXISTS topic_grades_admin_all ON public.topic_grades;

-- 1. SELECT: Teachers can see grades for their topics, students can see their own
CREATE POLICY topic_grades_select ON public.topic_grades
    FOR SELECT
    USING (
        -- Admin sees all
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
        OR
        -- Teacher who is advisor/reviewer of the topic
        EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = topic_id
            AND (t.advisor_id = auth.uid() OR t.reviewer_id = auth.uid())
        )
        OR
        -- Student sees their own topic grades
        EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = topic_id
            AND t.student_id = auth.uid()
        )
        OR
        -- Grader can see their own grades
        graded_by = auth.uid()
    );

-- 2. INSERT: User can insert grades where graded_by = their own ID
CREATE POLICY topic_grades_insert ON public.topic_grades
    FOR INSERT
    WITH CHECK (
        graded_by = auth.uid()
        AND (
            -- Admin can insert any grade
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'admin'
            )
            OR
            -- Teacher who is advisor/reviewer
            EXISTS (
                SELECT 1 FROM public.topics t
                WHERE t.id = topic_id
                AND (t.advisor_id = auth.uid() OR t.reviewer_id = auth.uid())
            )
            OR
            -- Teacher who is council member (for defense grading)
            EXISTS (
                SELECT 1 FROM public.council_members cm
                JOIN public.defense_schedules ds ON ds.council_id = cm.council_id
                WHERE ds.topic_id = topic_id
                AND cm.teacher_id = auth.uid()
            )
        )
    );

-- 3. UPDATE: User can update their own non-finalized grades
CREATE POLICY topic_grades_update ON public.topic_grades
    FOR UPDATE
    USING (
        graded_by = auth.uid()
        AND is_final = false
    )
    WITH CHECK (
        graded_by = auth.uid()
    );

-- 4. DELETE: Only admin can delete
CREATE POLICY topic_grades_delete ON public.topic_grades
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- =====================================================
-- END OF MIGRATION 025
-- =====================================================
