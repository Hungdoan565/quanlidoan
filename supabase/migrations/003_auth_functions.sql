-- =====================================================
-- Migration 003: Auth Trigger & Functions
-- Hệ thống Quản lý Đồ án DNC
-- =====================================================

-- =====================================================
-- AUTO CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  
  INSERT INTO public.profiles (id, email, full_name, role, student_code, teacher_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role,
    -- Chỉ lưu student_code nếu role là student
    CASE WHEN v_role = 'student' THEN NEW.raw_user_meta_data->>'student_id' ELSE NULL END,
    -- Chỉ lưu teacher_code nếu role là teacher
    CASE WHEN v_role = 'teacher' THEN NEW.raw_user_meta_data->>'teacher_code' ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- NOTIFICATION FUNCTIONS
-- =====================================================

-- Create notification for user
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUTO ASSIGN ADVISOR/REVIEWER FROM TEACHER_PAIRS
-- =====================================================
CREATE OR REPLACE FUNCTION public.assign_teachers_to_topic()
RETURNS TRIGGER AS $$
DECLARE
  v_advisor_id UUID;
  v_reviewer_id UUID;
BEGIN
  -- Get teacher pair for this class
  SELECT advisor_id, reviewer_id INTO v_advisor_id, v_reviewer_id
  FROM public.teacher_pairs
  WHERE class_id = NEW.class_id;
  
  -- Assign if found
  IF v_advisor_id IS NOT NULL THEN
    NEW.advisor_id := v_advisor_id;
    NEW.reviewer_id := v_reviewer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_teachers_on_topic_insert
  BEFORE INSERT ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.assign_teachers_to_topic();

-- =====================================================
-- NOTIFY ON TOPIC STATUS CHANGE
-- =====================================================
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
        'Đề tài đã được duyệt',
        'Đề tài "' || NEW.title || '" đã được giảng viên phê duyệt.',
        '/student/topic'
      );
    -- Revision required
    ELSIF NEW.status = 'revision' THEN
      PERFORM public.create_notification(
        NEW.student_id,
        'topic_revision',
        'Yêu cầu chỉnh sửa đề tài',
        COALESCE(NEW.revision_note, 'Vui lòng chỉnh sửa và nộp lại.'),
        '/student/topic'
      );
    -- Rejected
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.create_notification(
        NEW.student_id,
        'topic_rejected',
        'Đề tài bị từ chối',
        COALESCE(NEW.rejection_reason, 'Đề tài không được chấp nhận.'),
        '/student/register'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_on_topic_status_change
  AFTER UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.notify_topic_status_change();

-- =====================================================
-- NOTIFY TEACHER ON NEW TOPIC REGISTRATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_advisor_on_new_topic()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  -- Get student name
  SELECT full_name INTO v_student_name
  FROM public.profiles WHERE id = NEW.student_id;
  
  -- Notify advisor
  IF NEW.advisor_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.advisor_id,
      'new_topic_registration',
      'Sinh viên đăng ký đề tài mới',
      v_student_name || ' đã đăng ký đề tài "' || NEW.title || '"',
      '/teacher/reviews/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_advisor_on_topic_insert
  AFTER INSERT ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.notify_advisor_on_new_topic();

-- =====================================================
-- UPDATE SAMPLE_TOPIC STUDENT COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_sample_topic_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.sample_topic_id IS NOT NULL THEN
    UPDATE public.sample_topics
    SET current_students = current_students + 1
    WHERE id = NEW.sample_topic_id;
  ELSIF TG_OP = 'DELETE' AND OLD.sample_topic_id IS NOT NULL THEN
    UPDATE public.sample_topics
    SET current_students = GREATEST(0, current_students - 1)
    WHERE id = OLD.sample_topic_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sample_topic_count_trigger
  AFTER INSERT OR DELETE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_sample_topic_count();

-- =====================================================
-- CALCULATE FINAL GRADE
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_final_grade(p_topic_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_advisor_grade DECIMAL;
  v_reviewer_grade DECIMAL;
  v_council_grade DECIMAL;
  v_final_grade DECIMAL;
BEGIN
  -- Get grades
  SELECT total_score INTO v_advisor_grade
  FROM public.grades WHERE topic_id = p_topic_id AND grader_role = 'advisor' AND is_final = true;
  
  SELECT total_score INTO v_reviewer_grade
  FROM public.grades WHERE topic_id = p_topic_id AND grader_role = 'reviewer' AND is_final = true;
  
  SELECT AVG(total_score) INTO v_council_grade
  FROM public.grades WHERE topic_id = p_topic_id AND grader_role = 'council' AND is_final = true;
  
  -- Calculate weighted average (GVHD: 40%, GVPB: 30%, HĐ: 30%)
  IF v_advisor_grade IS NOT NULL AND v_reviewer_grade IS NOT NULL THEN
    IF v_council_grade IS NOT NULL THEN
      v_final_grade := (v_advisor_grade * 0.4) + (v_reviewer_grade * 0.3) + (v_council_grade * 0.3);
    ELSE
      v_final_grade := (v_advisor_grade * 0.5) + (v_reviewer_grade * 0.5);
    END IF;
  END IF;
  
  RETURN ROUND(v_final_grade, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- END OF MIGRATION 003
-- =====================================================
