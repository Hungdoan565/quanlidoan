-- =====================================================
-- FIX: Remove triggers referencing student_id on logbook_entries
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop problematic notification triggers
DROP TRIGGER IF EXISTS notify_advisor_on_logbook_submit ON public.logbook_entries;
DROP TRIGGER IF EXISTS notify_student_on_logbook_confirm ON public.logbook_entries;

-- Step 2: Drop functions that reference student_id
DROP FUNCTION IF EXISTS notify_advisor_on_logbook_submit();
DROP FUNCTION IF EXISTS notify_student_on_logbook_confirm();

-- Step 3: Recreate functions WITHOUT student_id reference
-- These functions get student info from the topic table instead

CREATE OR REPLACE FUNCTION notify_advisor_on_logbook_submit()
RETURNS TRIGGER AS $$
DECLARE
    v_topic RECORD;
    v_student_name TEXT;
BEGIN
    -- Get topic and student info
    SELECT t.*, p.full_name INTO v_topic
    FROM topics t
    JOIN profiles p ON t.student_id = p.id
    WHERE t.id = NEW.topic_id;
    
    v_student_name := v_topic.full_name;
    
    -- Only notify on new submission (status changed to pending)
    IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_topic.advisor_id,
            'logbook_submitted',
            'Nhật ký mới cần duyệt',
            v_student_name || ' đã gửi nhật ký tuần ' || NEW.week_number,
            jsonb_build_object(
                'topic_id', NEW.topic_id,
                'entry_id', NEW.id,
                'week_number', NEW.week_number
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_student_on_logbook_confirm()
RETURNS TRIGGER AS $$
DECLARE
    v_topic RECORD;
BEGIN
    -- Get topic info
    SELECT * INTO v_topic FROM topics WHERE id = NEW.topic_id;
    
    -- Notify when status changes to approved or needs_revision
    IF NEW.status IN ('approved', 'needs_revision') AND OLD.status = 'pending' THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_topic.student_id,
            CASE WHEN NEW.status = 'approved' THEN 'logbook_approved' ELSE 'logbook_revision' END,
            CASE WHEN NEW.status = 'approved' THEN 'Nhật ký đã được duyệt' ELSE 'Nhật ký cần chỉnh sửa' END,
            'Nhật ký tuần ' || NEW.week_number || CASE WHEN NEW.status = 'approved' THEN ' đã được duyệt' ELSE ' cần chỉnh sửa' END,
            jsonb_build_object(
                'topic_id', NEW.topic_id,
                'entry_id', NEW.id,
                'week_number', NEW.week_number,
                'feedback', NEW.feedback_comment
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate triggers
CREATE TRIGGER notify_advisor_on_logbook_submit
    AFTER INSERT OR UPDATE ON public.logbook_entries
    FOR EACH ROW
    EXECUTE FUNCTION notify_advisor_on_logbook_submit();

CREATE TRIGGER notify_student_on_logbook_confirm
    AFTER UPDATE ON public.logbook_entries
    FOR EACH ROW
    EXECUTE FUNCTION notify_student_on_logbook_confirm();

-- =====================================================
-- Verify: List current triggers
-- =====================================================
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'logbook_entries';

-- =====================================================
-- END OF FIX
-- =====================================================
