-- =====================================================
-- Migration 002: Row Level Security Policies
-- Hệ thống Quản lý Đồ án DNC
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.councils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defense_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_criteria ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
-- Everyone can read basic profiles
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- =====================================================
-- SESSIONS POLICIES
-- =====================================================
-- Everyone can read sessions
CREATE POLICY "sessions_select_all" ON public.sessions
  FOR SELECT USING (true);

-- Only admin can manage sessions
CREATE POLICY "sessions_insert_admin" ON public.sessions
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "sessions_update_admin" ON public.sessions
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "sessions_delete_admin" ON public.sessions
  FOR DELETE USING (public.is_admin());

-- =====================================================
-- CLASSES POLICIES
-- =====================================================
-- Everyone can read classes
CREATE POLICY "classes_select_all" ON public.classes
  FOR SELECT USING (true);

-- Only admin can manage classes
CREATE POLICY "classes_insert_admin" ON public.classes
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "classes_update_admin" ON public.classes
  FOR UPDATE USING (public.is_admin());

-- =====================================================
-- CLASS_STUDENTS POLICIES
-- =====================================================
-- Teachers/Admin can read all; Students can read their own
CREATE POLICY "class_students_select" ON public.class_students
  FOR SELECT USING (
    public.is_admin() 
    OR public.is_teacher() 
    OR student_id = auth.uid()
  );

-- Only admin can manage
CREATE POLICY "class_students_insert_admin" ON public.class_students
  FOR INSERT WITH CHECK (public.is_admin());

-- =====================================================
-- TEACHER_PAIRS POLICIES
-- =====================================================
-- Teachers/Admin can read
CREATE POLICY "teacher_pairs_select" ON public.teacher_pairs
  FOR SELECT USING (
    public.is_admin() 
    OR public.is_teacher()
  );

-- Only admin can manage
CREATE POLICY "teacher_pairs_insert_admin" ON public.teacher_pairs
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "teacher_pairs_update_admin" ON public.teacher_pairs
  FOR UPDATE USING (public.is_admin());

-- =====================================================
-- SAMPLE_TOPICS POLICIES
-- =====================================================
-- Everyone can read active topics
CREATE POLICY "sample_topics_select_all" ON public.sample_topics
  FOR SELECT USING (is_active = true OR teacher_id = auth.uid());

-- Teachers can manage their own topics
CREATE POLICY "sample_topics_insert_teacher" ON public.sample_topics
  FOR INSERT WITH CHECK (
    public.is_teacher() 
    AND teacher_id = auth.uid()
  );

CREATE POLICY "sample_topics_update_owner" ON public.sample_topics
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "sample_topics_delete_owner" ON public.sample_topics
  FOR DELETE USING (teacher_id = auth.uid());

-- =====================================================
-- TOPICS POLICIES
-- =====================================================
-- Students see their own; Teachers see assigned; Admin sees all
CREATE POLICY "topics_select" ON public.topics
  FOR SELECT USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR advisor_id = auth.uid()
    OR reviewer_id = auth.uid()
  );

-- Students can register topics
CREATE POLICY "topics_insert_student" ON public.topics
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'student'
    AND student_id = auth.uid()
  );

-- Students can update pending topics; Teachers can update assigned topics
CREATE POLICY "topics_update" ON public.topics
  FOR UPDATE USING (
    (student_id = auth.uid() AND status IN ('pending', 'revision'))
    OR advisor_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR public.is_admin()
  );

-- =====================================================
-- REPORTS POLICIES
-- =====================================================
-- Owner, assigned teachers, and admin can read
CREATE POLICY "reports_select" ON public.reports
  FOR SELECT USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = reports.topic_id
      AND (t.advisor_id = auth.uid() OR t.reviewer_id = auth.uid())
    )
  );

-- Students can upload their own reports
CREATE POLICY "reports_insert_student" ON public.reports
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- =====================================================
-- LOGBOOK_ENTRIES POLICIES
-- =====================================================
-- Similar to reports
CREATE POLICY "logbook_select" ON public.logbook_entries
  FOR SELECT USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = logbook_entries.topic_id
      AND (t.advisor_id = auth.uid() OR t.reviewer_id = auth.uid())
    )
  );

-- Students can create/update their logbook
CREATE POLICY "logbook_insert_student" ON public.logbook_entries
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "logbook_update" ON public.logbook_entries
  FOR UPDATE USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = logbook_entries.topic_id
      AND t.advisor_id = auth.uid()
    )
  );

-- =====================================================
-- GRADES POLICIES
-- =====================================================
-- Students see their final grades; Teachers see their grades; Admin sees all
CREATE POLICY "grades_select" ON public.grades
  FOR SELECT USING (
    public.is_admin()
    OR grader_id = auth.uid()
    OR (is_final = true AND EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = grades.topic_id AND t.student_id = auth.uid()
    ))
  );

-- Teachers can grade assigned topics
CREATE POLICY "grades_insert_teacher" ON public.grades
  FOR INSERT WITH CHECK (
    public.is_teacher()
    AND grader_id = auth.uid()
  );

CREATE POLICY "grades_update_teacher" ON public.grades
  FOR UPDATE USING (
    grader_id = auth.uid()
    AND is_final = false
  );

-- =====================================================
-- COUNCILS POLICIES
-- =====================================================
CREATE POLICY "councils_select" ON public.councils
  FOR SELECT USING (public.is_admin() OR public.is_teacher());

CREATE POLICY "councils_manage_admin" ON public.councils
  FOR ALL USING (public.is_admin());

-- =====================================================
-- COUNCIL_MEMBERS POLICIES
-- =====================================================
CREATE POLICY "council_members_select" ON public.council_members
  FOR SELECT USING (public.is_admin() OR public.is_teacher());

CREATE POLICY "council_members_manage_admin" ON public.council_members
  FOR ALL USING (public.is_admin());

-- =====================================================
-- DEFENSE_SCHEDULES POLICIES
-- =====================================================
CREATE POLICY "defense_schedules_select" ON public.defense_schedules
  FOR SELECT USING (
    public.is_admin()
    OR public.is_teacher()
    OR EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = defense_schedules.topic_id AND t.student_id = auth.uid()
    )
  );

CREATE POLICY "defense_schedules_manage_admin" ON public.defense_schedules
  FOR ALL USING (public.is_admin());

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================
-- Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- System/Admin can insert notifications
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- GRADING_CRITERIA POLICIES
-- =====================================================
CREATE POLICY "grading_criteria_select" ON public.grading_criteria
  FOR SELECT USING (true);

CREATE POLICY "grading_criteria_manage_admin" ON public.grading_criteria
  FOR ALL USING (public.is_admin());

-- =====================================================
-- END OF MIGRATION 002
-- =====================================================
