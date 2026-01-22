-- =====================================================
-- Migration 010: Solo Student & Unified Lecturer Model
-- Hệ thống Quản lý Đồ án - MASTER_PLAN Migration
-- =====================================================
-- 
-- Mục tiêu:
-- 1. Chuyển từ mô hình cặp GV (GVHD + GVPB) sang Unified Lecturer
-- 2. Chuyển từ mô hình nhóm SV sang Solo Student (1 SV = 1 đề tài)
-- 3. Thêm repo_url để lưu link GitHub/GitLab
-- 4. Cập nhật RLS policies không còn phụ thuộc reviewer
-- 5. Thêm audit_logs table để tracking
-- =====================================================

-- =====================================================
-- STEP 1: ADD NEW COLUMNS & TABLES
-- =====================================================

-- 1.1 Thêm repo_url vào topics
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS repo_url TEXT;

COMMENT ON COLUMN public.topics.repo_url IS 'Link GitHub/GitLab repository của sinh viên';

-- 1.2 Thêm advisor_id vào classes (GV phụ trách lớp - optional)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS advisor_id UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.classes.advisor_id IS 'Giảng viên phụ trách lớp (Unified Lecturer model)';

-- 1.3 Cập nhật sample_topics.max_students default = 1 (Solo)
ALTER TABLE public.sample_topics 
ALTER COLUMN max_students SET DEFAULT 1;

-- 1.4 Tạo audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'topic', 'logbook', 'grade', 'report'
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Audit trail cho mọi thao tác quan trọng trong hệ thống';

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs policies
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- STEP 2: MIGRATE DATA FROM teacher_pairs TO classes
-- =====================================================

-- 2.1 Copy advisor_id từ teacher_pairs sang classes
UPDATE public.classes c
SET advisor_id = tp.advisor_id
FROM public.teacher_pairs tp
WHERE tp.class_id = c.id
AND c.advisor_id IS NULL;

-- 2.2 Update topics.advisor_id nếu chưa có (từ class advisor)
UPDATE public.topics t
SET advisor_id = c.advisor_id
FROM public.classes c
WHERE t.class_id = c.id
AND t.advisor_id IS NULL
AND c.advisor_id IS NOT NULL;

-- =====================================================
-- STEP 3: UPDATE GRADES TABLE
-- =====================================================

-- 3.1 Cập nhật constraint cho grader_role (bỏ 'reviewer', chỉ còn advisor + council)
-- Trước tiên migrate các grade có role='reviewer' sang role='advisor'
UPDATE public.grades
SET grader_role = 'advisor'
WHERE grader_role = 'reviewer';

-- =====================================================
-- STEP 4: UPDATE RLS POLICIES - REMOVE REVIEWER DEPENDENCY
-- =====================================================

-- 4.1 Drop old policies that reference reviewer_id
DROP POLICY IF EXISTS "topics_select" ON public.topics;
DROP POLICY IF EXISTS "topics_update" ON public.topics;
DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "logbook_select" ON public.logbook_entries;
DROP POLICY IF EXISTS "logbook_update" ON public.logbook_entries;

-- 4.2 Recreate policies without reviewer_id

-- Topics Select: Student own + Advisor + Admin
CREATE POLICY "topics_select" ON public.topics
    FOR SELECT USING (
        public.is_admin()
        OR student_id = auth.uid()
        OR advisor_id = auth.uid()
    );

-- Topics Update: Student (pending/revision) + Advisor + Admin
CREATE POLICY "topics_update" ON public.topics
    FOR UPDATE USING (
        (student_id = auth.uid() AND status IN ('pending', 'revision'))
        OR advisor_id = auth.uid()
        OR public.is_admin()
    );

-- Reports Select: Owner + Advisor + Admin
CREATE POLICY "reports_select" ON public.reports
    FOR SELECT USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = reports.topic_id
            AND t.student_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = reports.topic_id
            AND t.advisor_id = auth.uid()
        )
    );

-- Logbook Select: Owner + Advisor + Admin
CREATE POLICY "logbook_select" ON public.logbook_entries
    FOR SELECT USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = logbook_entries.topic_id
            AND t.student_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = logbook_entries.topic_id
            AND t.advisor_id = auth.uid()
        )
    );

-- Logbook Update: Student own + Advisor
CREATE POLICY "logbook_update" ON public.logbook_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = logbook_entries.topic_id
            AND t.student_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.topics t
            WHERE t.id = logbook_entries.topic_id
            AND t.advisor_id = auth.uid()
        )
    );

-- =====================================================
-- STEP 5: UPDATE TRIGGERS
-- =====================================================

-- 5.1 Drop old trigger that uses teacher_pairs
DROP TRIGGER IF EXISTS assign_teachers_on_topic_insert ON public.topics;
DROP FUNCTION IF EXISTS public.assign_teachers_to_topic();

-- 5.2 Create new trigger that uses classes.advisor_id
CREATE OR REPLACE FUNCTION public.assign_advisor_to_topic()
RETURNS TRIGGER AS $$
BEGIN
    -- Gán advisor từ class nếu topic chưa có advisor
    IF NEW.advisor_id IS NULL THEN
        SELECT advisor_id INTO NEW.advisor_id
        FROM public.classes
        WHERE id = NEW.class_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_advisor_on_topic_insert
    BEFORE INSERT ON public.topics
    FOR EACH ROW EXECUTE FUNCTION public.assign_advisor_to_topic();

-- 5.3 Update notify function to remove reviewer references
CREATE OR REPLACE FUNCTION public.notify_topic_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify student when status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Approved
        IF NEW.status = 'approved' THEN
            PERFORM public.create_notification(
                NEW.student_id,
                'topic_approved',
                'Đề tài được duyệt',
                'Đề tài "' || NEW.title || '" đã được phê duyệt. Bạn có thể bắt đầu thực hiện.',
                '/student/my-topic'
            );
        -- Revision requested
        ELSIF NEW.status = 'revision' THEN
            PERFORM public.create_notification(
                NEW.student_id,
                'topic_revision',
                'Yêu cầu chỉnh sửa đề tài',
                'Đề tài "' || NEW.title || '" cần được chỉnh sửa. Lý do: ' || COALESCE(NEW.revision_note, 'Xem chi tiết'),
                '/student/my-topic'
            );
        -- Rejected
        ELSIF NEW.status = 'rejected' THEN
            PERFORM public.create_notification(
                NEW.student_id,
                'topic_rejected',
                'Đề tài bị từ chối',
                'Đề tài "' || NEW.title || '" đã bị từ chối. Lý do: ' || COALESCE(NEW.rejection_reason, 'Xem chi tiết'),
                '/student/register'
            );
        END IF;

        -- Log to audit
        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
        VALUES (
            auth.uid(),
            'topic_status_change',
            'topic',
            NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 Create audit function for logbook confirm
CREATE OR REPLACE FUNCTION public.audit_logbook_confirm()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.teacher_confirmed IS DISTINCT FROM NEW.teacher_confirmed AND NEW.teacher_confirmed = true THEN
        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_value)
        VALUES (
            auth.uid(),
            'logbook_confirmed',
            'logbook',
            NEW.id,
            jsonb_build_object('week_number', NEW.week_number, 'topic_id', NEW.topic_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_logbook_confirm_trigger
    AFTER UPDATE ON public.logbook_entries
    FOR EACH ROW EXECUTE FUNCTION public.audit_logbook_confirm();

-- 5.5 Create audit function for grade finalize
CREATE OR REPLACE FUNCTION public.audit_grade_finalize()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_final IS DISTINCT FROM NEW.is_final AND NEW.is_final = true THEN
        INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_value)
        VALUES (
            auth.uid(),
            'grade_finalized',
            'grade',
            NEW.id,
            jsonb_build_object('topic_id', NEW.topic_id, 'total_score', NEW.total_score, 'grader_role', NEW.grader_role)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_grade_finalize_trigger
    AFTER UPDATE ON public.grades
    FOR EACH ROW EXECUTE FUNCTION public.audit_grade_finalize();

-- =====================================================
-- STEP 6: CREATE HELPER VIEWS (Optional - for backward compat)
-- =====================================================

-- View để lấy topic với thông tin đầy đủ
CREATE OR REPLACE VIEW public.topics_view AS
SELECT 
    t.*,
    p_student.full_name AS student_name,
    p_student.student_code,
    p_advisor.full_name AS advisor_name,
    p_advisor.teacher_code AS advisor_code,
    c.name AS class_name,
    c.code AS class_code,
    s.name AS session_name,
    s.academic_year,
    s.semester
FROM public.topics t
LEFT JOIN public.profiles p_student ON t.student_id = p_student.id
LEFT JOIN public.profiles p_advisor ON t.advisor_id = p_advisor.id
LEFT JOIN public.classes c ON t.class_id = c.id
LEFT JOIN public.sessions s ON c.session_id = s.id;

-- =====================================================
-- STEP 7: GRADING_CRITERIA - UPDATE CONSTRAINT
-- =====================================================

-- Cập nhật grading_criteria để chỉ còn advisor và council
-- Xóa các row có grader_role = 'reviewer'
DELETE FROM public.grading_criteria WHERE grader_role = 'reviewer';

-- Drop và tạo lại constraint
ALTER TABLE public.grading_criteria 
DROP CONSTRAINT IF EXISTS grading_criteria_grader_role_check;

ALTER TABLE public.grading_criteria 
ADD CONSTRAINT grading_criteria_grader_role_check 
CHECK (grader_role IN ('advisor', 'council'));

-- =====================================================
-- STEP 8: OPTIONAL - DROP OLD OBJECTS (Careful!)
-- =====================================================
-- Uncomment khi đã verify migration thành công

-- Drop reviewer_id column from topics (sau khi verify)
-- ALTER TABLE public.topics DROP COLUMN IF EXISTS reviewer_id;

-- Drop teacher_pairs table (sau khi verify)
-- DROP TABLE IF EXISTS public.teacher_pairs;

-- Drop old policies
DROP POLICY IF EXISTS "teacher_pairs_select" ON public.teacher_pairs;
DROP POLICY IF EXISTS "teacher_pairs_insert_admin" ON public.teacher_pairs;
DROP POLICY IF EXISTS "teacher_pairs_update_admin" ON public.teacher_pairs;

-- =====================================================
-- END OF MIGRATION 010
-- =====================================================
