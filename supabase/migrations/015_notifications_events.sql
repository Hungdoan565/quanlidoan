-- Notifications events & triggers

-- Helper: notify all admins
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    PERFORM public.create_notification(r.id, p_type, p_title, p_message, p_link);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify advisor when student submits report
CREATE OR REPLACE FUNCTION public.notify_advisor_on_report_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_advisor_id UUID;
  v_student_name TEXT;
  v_topic_title TEXT;
  v_phase_label TEXT;
BEGIN
  SELECT advisor_id, title INTO v_advisor_id, v_topic_title
  FROM public.topics WHERE id = NEW.topic_id;

  SELECT full_name INTO v_student_name
  FROM public.profiles WHERE id = NEW.student_id;

  v_phase_label := CASE NEW.phase
    WHEN 'report1' THEN 'Báo cáo 1'
    WHEN 'report2' THEN 'Báo cáo 2'
    WHEN 'final' THEN 'Báo cáo cuối'
    WHEN 'slide' THEN 'Slide'
    WHEN 'source_code' THEN 'Source code'
    ELSE NEW.phase
  END;

  IF v_advisor_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_advisor_id,
      'report_submitted',
      'Báo cáo mới',
      v_student_name || ' đã nộp ' || v_phase_label || ' cho đề tài "' || v_topic_title || '"',
      '/teacher/grading/' || NEW.topic_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_advisor_on_report_submit ON public.reports;
CREATE TRIGGER notify_advisor_on_report_submit
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_advisor_on_report_submit();

-- Notify advisor when student submits logbook entry
CREATE OR REPLACE FUNCTION public.notify_advisor_on_logbook_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_advisor_id UUID;
  v_student_name TEXT;
BEGIN
  SELECT t.advisor_id, p.full_name INTO v_advisor_id, v_student_name
  FROM public.topics t
  JOIN public.profiles p ON p.id = NEW.student_id
  WHERE t.id = NEW.topic_id;

  IF v_advisor_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_advisor_id,
      'logbook_submitted',
      'Nhật ký mới',
      v_student_name || ' đã cập nhật nhật ký tuần ' || NEW.week_number,
      '/teacher/logbook/' || NEW.topic_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_advisor_on_logbook_submit ON public.logbook_entries;
CREATE TRIGGER notify_advisor_on_logbook_submit
  AFTER INSERT ON public.logbook_entries
  FOR EACH ROW EXECUTE FUNCTION public.notify_advisor_on_logbook_submit();

-- Notify student when advisor confirms meeting/logbook
CREATE OR REPLACE FUNCTION public.notify_student_on_logbook_confirm()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.meeting_confirmed IS DISTINCT FROM NEW.meeting_confirmed
     AND NEW.meeting_confirmed = true THEN
    PERFORM public.create_notification(
      NEW.student_id,
      'logbook_confirmed',
      'Nhật ký được xác nhận',
      'GVHD đã xác nhận nhật ký tuần ' || NEW.week_number,
      '/student/logbook'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_student_on_logbook_confirm ON public.logbook_entries;
CREATE TRIGGER notify_student_on_logbook_confirm
  AFTER UPDATE ON public.logbook_entries
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_logbook_confirm();

-- Notify admins when class is created or deleted
CREATE OR REPLACE FUNCTION public.notify_admin_on_class_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins(
      'class_created',
      'Lớp mới được tạo',
      'Đã tạo lớp ' || NEW.code || ' - ' || NEW.name,
      '/admin/classes/' || NEW.id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.notify_admins(
      'class_deleted',
      'Lớp đã bị xóa',
      'Đã xóa lớp ' || OLD.code || ' - ' || OLD.name,
      '/admin/classes'
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_admin_on_class_insert ON public.classes;
CREATE TRIGGER notify_admin_on_class_insert
  AFTER INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_class_change();

DROP TRIGGER IF EXISTS notify_admin_on_class_delete ON public.classes;
CREATE TRIGGER notify_admin_on_class_delete
  AFTER DELETE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_class_change();
