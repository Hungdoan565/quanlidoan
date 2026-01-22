-- =====================================================
-- Migration 001: Core Tables
-- Hệ thống Quản lý Đồ án DNC
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  phone TEXT,
  avatar_url TEXT,
  teacher_code TEXT UNIQUE, -- Mã giảng viên (cho teacher)
  student_code TEXT UNIQUE, -- MSSV (cho student)
  department TEXT,
  academic_rank TEXT, -- Học vị (ThS, TS, PGS.TS...)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_student_code ON public.profiles(student_code);
CREATE INDEX idx_profiles_teacher_code ON public.profiles(teacher_code);

-- =====================================================
-- 2. SESSIONS TABLE (Đợt đồ án)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL, -- VD: "2025-2026"
  semester INTEGER NOT NULL CHECK (semester IN (1, 2, 3)),
  session_type TEXT NOT NULL CHECK (session_type IN ('do_an_co_so', 'do_an_tot_nghiep')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  
  -- Deadlines
  registration_start TIMESTAMPTZ,
  registration_end TIMESTAMPTZ,
  report1_deadline TIMESTAMPTZ,
  report2_deadline TIMESTAMPTZ,
  final_deadline TIMESTAMPTZ,
  defense_start TIMESTAMPTZ,
  defense_end TIMESTAMPTZ,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_year ON public.sessions(academic_year, semester);

-- =====================================================
-- 3. CLASSES TABLE (Lớp học phần)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- VD: "DOAN_K11_01"
  name TEXT NOT NULL,
  max_students INTEGER DEFAULT 30,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, code)
);

-- Index
CREATE INDEX idx_classes_session ON public.classes(session_id);

-- =====================================================
-- 4. CLASS_STUDENTS TABLE (SV trong lớp)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(class_id, student_id)
);

-- Index
CREATE INDEX idx_class_students_class ON public.class_students(class_id);
CREATE INDEX idx_class_students_student ON public.class_students(student_id);

-- =====================================================
-- 5. TEACHER_PAIRS TABLE (Cặp GVHD-GVPB)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.teacher_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL REFERENCES public.profiles(id), -- GVHD
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id), -- GVPB
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(class_id)
);

-- Index
CREATE INDEX idx_teacher_pairs_advisor ON public.teacher_pairs(advisor_id);
CREATE INDEX idx_teacher_pairs_reviewer ON public.teacher_pairs(reviewer_id);

-- =====================================================
-- 6. SAMPLE_TOPICS TABLE (Đề tài mẫu của GV)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sample_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  technologies TEXT[], -- VD: ['React', 'Node.js', 'PostgreSQL']
  max_students INTEGER DEFAULT 2, -- Số SV tối đa đăng ký
  current_students INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_sample_topics_teacher ON public.sample_topics(teacher_id);
CREATE INDEX idx_sample_topics_session ON public.sample_topics(session_id);

-- =====================================================
-- 7. TOPICS TABLE (Đề tài sinh viên đăng ký)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  sample_topic_id UUID REFERENCES public.sample_topics(id), -- NULL nếu tự đề xuất
  
  title TEXT NOT NULL,
  description TEXT,
  technologies TEXT[],
  
  -- Giảng viên
  advisor_id UUID REFERENCES public.profiles(id), -- GVHD
  reviewer_id UUID REFERENCES public.profiles(id), -- GVPB
  
  -- Trạng thái
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Chờ duyệt
    'revision',     -- Yêu cầu sửa
    'approved',     -- Đã duyệt
    'in_progress',  -- Đang thực hiện
    'submitted',    -- Đã nộp
    'defended',     -- Đã bảo vệ
    'completed',    -- Hoàn thành
    'rejected'      -- Bị từ chối
  )),
  
  rejection_reason TEXT,
  revision_note TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  defended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, class_id)
);

-- Indexes
CREATE INDEX idx_topics_student ON public.topics(student_id);
CREATE INDEX idx_topics_class ON public.topics(class_id);
CREATE INDEX idx_topics_advisor ON public.topics(advisor_id);
CREATE INDEX idx_topics_status ON public.topics(status);

-- =====================================================
-- 8. REPORTS TABLE (Báo cáo nộp)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  
  phase TEXT NOT NULL CHECK (phase IN ('report1', 'report2', 'final', 'slide', 'source_code')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  
  version INTEGER DEFAULT 1,
  note TEXT,
  
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(topic_id, phase, version)
);

-- Index
CREATE INDEX idx_reports_topic ON public.reports(topic_id);
CREATE INDEX idx_reports_phase ON public.reports(phase);

-- =====================================================
-- 9. LOGBOOK TABLE (Nhật ký tiến độ)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.logbook_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  
  week_number INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  work_done TEXT NOT NULL,
  issues TEXT,
  next_week_plan TEXT,
  
  -- Ghi chú của GV
  advisor_note TEXT,
  meeting_confirmed BOOLEAN DEFAULT false,
  meeting_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(topic_id, week_number)
);

-- Index
CREATE INDEX idx_logbook_topic ON public.logbook_entries(topic_id);

-- =====================================================
-- 10. GRADES TABLE (Điểm số)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES public.profiles(id),
  grader_role TEXT NOT NULL CHECK (grader_role IN ('advisor', 'reviewer', 'council')),
  
  -- Điểm thành phần (cấu trúc linh hoạt)
  criteria JSONB NOT NULL DEFAULT '[]',
  -- VD: [{"name": "Nội dung", "weight": 0.4, "score": 8.5}, ...]
  
  total_score DECIMAL(4,2),
  comment TEXT,
  
  is_final BOOLEAN DEFAULT false,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(topic_id, grader_id, grader_role)
);

-- Index
CREATE INDEX idx_grades_topic ON public.grades(topic_id);

-- =====================================================
-- 11. COUNCILS TABLE (Hội đồng bảo vệ)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.councils (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room TEXT,
  defense_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. COUNCIL_MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.council_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  council_id UUID NOT NULL REFERENCES public.councils(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT NOT NULL CHECK (role IN ('chair', 'secretary', 'member')),
  
  UNIQUE(council_id, teacher_id)
);

-- =====================================================
-- 13. DEFENSE_SCHEDULES TABLE (Lịch bảo vệ)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.defense_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  council_id UUID NOT NULL REFERENCES public.councils(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id),
  
  scheduled_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  order_number INTEGER,
  
  UNIQUE(council_id, topic_id)
);

-- =====================================================
-- 14. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- =====================================================
-- 15. GRADING_CRITERIA TABLE (Tiêu chí chấm điểm)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.grading_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  grader_role TEXT NOT NULL CHECK (grader_role IN ('advisor', 'reviewer', 'council')),
  
  criteria JSONB NOT NULL DEFAULT '[]',
  -- VD: [{"name": "Điểm danh", "weight": 0.1, "max_score": 10}, ...]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, grader_role)
);

-- =====================================================
-- UPDATE TIMESTAMP TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sample_topics_updated_at
  BEFORE UPDATE ON public.sample_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_logbook_updated_at
  BEFORE UPDATE ON public.logbook_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- END OF MIGRATION 001
-- =====================================================
