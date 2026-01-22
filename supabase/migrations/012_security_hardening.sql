-- Migration 012: Security Hardening & Final Policies
-- Final security review and policy additions

-- =====================================================
-- 1. ADDITIONAL RLS POLICIES FOR AUDIT_LOGS
-- =====================================================

-- Ensure audit_logs RLS is enabled (already in 010)
-- Add read policy for admins only
DROP POLICY IF EXISTS "Admins can read all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- 2. GRADES TABLE POLICIES (HARDENING)
-- =====================================================

-- Ensure students can only view their own grades
DROP POLICY IF EXISTS "Students can view own grades" ON public.grades;
CREATE POLICY "Students can view own grades"
ON public.grades FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = grades.topic_id
        AND t.student_id = auth.uid()
    )
);

-- Teachers can view grades of their mentees
DROP POLICY IF EXISTS "Teachers can view mentee grades" ON public.grades;
CREATE POLICY "Teachers can view mentee grades"
ON public.grades FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.topics t
        JOIN public.classes c ON t.class_id = c.id
        WHERE t.id = grades.topic_id
        AND c.advisor_id = auth.uid()
    )
);

-- Teachers can insert/update grades for their mentees
DROP POLICY IF EXISTS "Teachers can manage mentee grades" ON public.grades;
CREATE POLICY "Teachers can manage mentee grades"
ON public.grades FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.topics t
        JOIN public.classes c ON t.class_id = c.id
        WHERE t.id = grades.topic_id
        AND c.advisor_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.topics t
        JOIN public.classes c ON t.class_id = c.id
        WHERE t.id = grades.topic_id
        AND c.advisor_id = auth.uid()
    )
);

-- =====================================================
-- 3. REPORTS TABLE POLICIES (HARDENING)
-- =====================================================

-- Ensure students can only view their own reports
DROP POLICY IF EXISTS "Students can view own reports" ON public.reports;
CREATE POLICY "Students can view own reports"
ON public.reports FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = reports.topic_id
        AND t.student_id = auth.uid()
    )
);

-- Students can insert reports for their approved topics
DROP POLICY IF EXISTS "Students can insert own reports" ON public.reports;
CREATE POLICY "Students can insert own reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = reports.topic_id
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress')
    )
);

-- Teachers can view reports of their mentees
DROP POLICY IF EXISTS "Teachers can view mentee reports" ON public.reports;
CREATE POLICY "Teachers can view mentee reports"
ON public.reports FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.topics t
        JOIN public.classes c ON t.class_id = c.id
        WHERE t.id = reports.topic_id
        AND c.advisor_id = auth.uid()
    )
);

-- =====================================================
-- 4. LOGBOOK ENTRIES POLICIES (VERIFY)
-- =====================================================

-- Drop and recreate logbook policies to ensure consistency
DROP POLICY IF EXISTS "Students can manage own logbook entries" ON public.logbook_entries;
CREATE POLICY "Students can manage own logbook entries"
ON public.logbook_entries FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = logbook_entries.topic_id
        AND t.student_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = logbook_entries.topic_id
        AND t.student_id = auth.uid()
        AND t.status IN ('approved', 'in_progress')
    )
);

-- Teachers can view and confirm logbook entries of mentees
DROP POLICY IF EXISTS "Teachers can view mentee logbook" ON public.logbook_entries;
CREATE POLICY "Teachers can view mentee logbook"
ON public.logbook_entries FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.topics t
        JOIN public.classes c ON t.class_id = c.id
        WHERE t.id = logbook_entries.topic_id
        AND c.advisor_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Teachers can confirm mentee logbook" ON public.logbook_entries;
CREATE POLICY "Teachers can confirm mentee logbook"
ON public.logbook_entries FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.topics t
        JOIN public.classes c ON t.class_id = c.id
        WHERE t.id = logbook_entries.topic_id
        AND c.advisor_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.topics t
        JOIN public.classes c ON t.class_id = c.id
        WHERE t.id = logbook_entries.topic_id
        AND c.advisor_id = auth.uid()
    )
);

-- =====================================================
-- 5. CREATE INDEX FOR PERFORMANCE
-- =====================================================

-- Ensure essential indexes exist
CREATE INDEX IF NOT EXISTS idx_topics_student_id ON public.topics(student_id);
CREATE INDEX IF NOT EXISTS idx_topics_class_id ON public.topics(class_id);
CREATE INDEX IF NOT EXISTS idx_topics_status ON public.topics(status);
CREATE INDEX IF NOT EXISTS idx_classes_session_id ON public.classes(session_id);
CREATE INDEX IF NOT EXISTS idx_classes_advisor_id ON public.classes(advisor_id);
CREATE INDEX IF NOT EXISTS idx_logbook_entries_topic_id ON public.logbook_entries(topic_id);
CREATE INDEX IF NOT EXISTS idx_logbook_entries_week ON public.logbook_entries(week_number);
CREATE INDEX IF NOT EXISTS idx_grades_topic_id ON public.grades(topic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =====================================================
-- 6. FUNCTION TO AUTO-UPDATE TOPIC STATUS
-- =====================================================

-- When all phases submitted, mark topic as 'submitted'
CREATE OR REPLACE FUNCTION check_topic_submission_complete()
RETURNS TRIGGER AS $$
DECLARE
    phase_count INTEGER;
BEGIN
    -- Count distinct phases submitted for this topic
    SELECT COUNT(DISTINCT phase) INTO phase_count
    FROM public.reports
    WHERE topic_id = NEW.topic_id;

    -- If all 5 phases are submitted, update topic status
    IF phase_count >= 5 THEN
        UPDATE public.topics
        SET status = 'submitted'
        WHERE id = NEW.topic_id
        AND status = 'in_progress';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check after report insert
DROP TRIGGER IF EXISTS trigger_check_submission_complete ON public.reports;
CREATE TRIGGER trigger_check_submission_complete
    AFTER INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION check_topic_submission_complete();

-- =====================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profiles with role-based access. Roles: admin, teacher, student';
COMMENT ON TABLE public.sessions IS 'Academic sessions/semesters for thesis management';
COMMENT ON TABLE public.classes IS 'Thesis classes with single advisor (Unified Lecturer model)';
COMMENT ON TABLE public.topics IS 'Student thesis topics - Solo Student model (1 student = 1 topic)';
COMMENT ON TABLE public.logbook_entries IS 'Weekly progress logs for students';
COMMENT ON TABLE public.reports IS 'Submitted reports and files (Submission Vault)';
COMMENT ON TABLE public.grades IS 'Final grades for thesis defense';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for important actions';

COMMENT ON COLUMN public.classes.advisor_id IS 'Single advisor for the class (Unified Lecturer model, replaces teacher_pairs)';
COMMENT ON COLUMN public.topics.repo_url IS 'GitHub/GitLab repository URL for source code';
