-- =====================================================
-- Add navigation link to logbook notifications
-- So students can click notification to go to logbook
-- =====================================================

-- Drop and recreate the student notification function with link
CREATE OR REPLACE FUNCTION notify_student_on_logbook_confirm()
RETURNS TRIGGER AS $$
DECLARE
    v_topic RECORD;
    v_notification_type TEXT;
    v_notification_title TEXT;
    v_notification_message TEXT;
BEGIN
    -- Get topic info
    SELECT * INTO v_topic FROM topics WHERE id = NEW.topic_id;
    
    -- Notify when status changes to approved or needs_revision
    IF NEW.status IN ('approved', 'needs_revision') AND OLD.status = 'pending' THEN
        -- Determine notification content based on status
        IF NEW.status = 'approved' THEN
            v_notification_type := 'logbook_approved';
            v_notification_title := 'Nhật ký đã được duyệt';
            v_notification_message := 'Nhật ký tuần ' || NEW.week_number || ' đã được giảng viên duyệt';
        ELSE
            v_notification_type := 'logbook_revision';
            v_notification_title := 'Nhật ký cần chỉnh sửa';
            v_notification_message := 'Nhật ký tuần ' || NEW.week_number || ' cần chỉnh sửa';
            -- Include feedback in message if available
            IF NEW.feedback_comment IS NOT NULL AND NEW.feedback_comment != '' THEN
                v_notification_message := v_notification_message || ': ' || LEFT(NEW.feedback_comment, 100);
            END IF;
        END IF;
        
        INSERT INTO notifications (user_id, type, title, message, link, data)
        VALUES (
            v_topic.student_id,
            v_notification_type,
            v_notification_title,
            v_notification_message,
            '/student/logbook',  -- Navigation link for student
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

-- Also update advisor notification to include link
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
        INSERT INTO notifications (user_id, type, title, message, link, data)
        VALUES (
            v_topic.advisor_id,
            'logbook_submitted',
            'Nhật ký mới cần duyệt',
            v_student_name || ' đã gửi nhật ký tuần ' || NEW.week_number,
            '/teacher/logbook/' || NEW.topic_id,  -- Navigate to student's logbook detail
            jsonb_build_object(
                'topic_id', NEW.topic_id,
                'entry_id', NEW.id,
                'week_number', NEW.week_number,
                'student_name', v_student_name
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
