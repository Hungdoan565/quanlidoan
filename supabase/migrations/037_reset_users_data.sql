-- =====================================================
-- RESET ALL USER DATA (Xóa sạch sinh viên & giảng viên)
-- =====================================================
-- Mục đích: Xóa toàn bộ data user để test lại import Excel mới
-- Giữ lại: Admins, structure (sessions, classes structure)
-- Xóa: Students, Teachers, và tất cả data liên quan

BEGIN;

-- =====================================================
-- 1. XÓA DATA LIÊN QUAN (Foreign key dependencies)
-- =====================================================

-- Notifications (student/teacher notifications)
DELETE FROM notifications 
WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE role IN ('student', 'teacher')
);

-- Storage files (logbook attachments, reports)
-- Note: RLS policies will handle deletion permissions
-- You may need to manually delete from storage buckets

-- =====================================================
-- XÓA TOPICS trước → CASCADE tự động xóa:
-- - reports (ON DELETE CASCADE)
-- - logbook_entries (ON DELETE CASCADE)  
-- - topic_grades (ON DELETE CASCADE)
-- - grades (ON DELETE CASCADE)
-- =====================================================
DELETE FROM topics 
WHERE student_id IN (
    SELECT id FROM profiles WHERE role = 'student'
);

-- Class students (SV trong lớp)
DELETE FROM class_students 
WHERE student_id IN (
    SELECT id FROM profiles WHERE role = 'student'
);

-- Audit logs (xóa trước khi xóa profiles)
DELETE FROM audit_logs 
WHERE actor_id IN (
    SELECT id FROM profiles WHERE role IN ('student', 'teacher')
);

-- =====================================================
-- 2. XÓA PROFILES (Student & Teacher)
-- =====================================================

-- Delete student profiles
DELETE FROM profiles 
WHERE role = 'student';

-- Delete teacher profiles  
DELETE FROM profiles 
WHERE role = 'teacher';

-- =====================================================
-- 3. XÓA AUTH USERS (Keep admins only)
-- =====================================================

-- Get admin user IDs to preserve
CREATE TEMP TABLE admin_ids AS
SELECT id FROM profiles WHERE role = 'admin';

-- Delete non-admin users from auth.users
-- Note: This requires superuser/service_role permissions
-- Run this manually via Supabase Dashboard SQL Editor if needed
DELETE FROM auth.users 
WHERE id NOT IN (SELECT id FROM admin_ids);

-- Cleanup temp table
DROP TABLE admin_ids;

-- =====================================================
-- 4. RESET CLASSES (Optional - uncomment if needed)
-- =====================================================

-- Option A: Keep classes but remove all students
-- Already done above via class_students deletion

-- Option B: Delete all classes (uncomment if needed)
-- DELETE FROM classes;

-- Option C: Delete all topics to start fresh (uncomment if needed)
-- DELETE FROM topics;

-- =====================================================
-- 5. RESET SEQUENCES (Optional)
-- =====================================================

-- Reset auto-increment IDs if needed
-- ALTER SEQUENCE profiles_id_seq RESTART WITH 1;
-- ALTER SEQUENCE classes_id_seq RESTART WITH 1;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

-- Check remaining data
DO $$
DECLARE
    student_count INT;
    teacher_count INT;
    admin_count INT;
    class_student_count INT;
BEGIN
    SELECT COUNT(*) INTO student_count FROM profiles WHERE role = 'student';
    SELECT COUNT(*) INTO teacher_count FROM profiles WHERE role = 'teacher';
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    SELECT COUNT(*) INTO class_student_count FROM class_students;
    
    RAISE NOTICE 'RESET COMPLETE';
    RAISE NOTICE 'Students remaining: %', student_count;
    RAISE NOTICE 'Teachers remaining: %', teacher_count;
    RAISE NOTICE 'Admins remaining: %', admin_count;
    RAISE NOTICE 'Class enrollments: %', class_student_count;
    
    IF student_count > 0 OR teacher_count > 0 THEN
        RAISE WARNING 'Some users were not deleted. Check constraints.';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- MANUAL CLEANUP REQUIRED
-- =====================================================

-- 1. Delete storage files manually:
--    - Go to Storage > submissions bucket
--    - Go to Storage > logbook_attachments bucket
--    - Go to Storage > avatars bucket (if needed)
--    - Delete all user files

-- 2. If auth.users deletion failed, run this via Dashboard:
--    DELETE FROM auth.users 
--    WHERE id NOT IN (
--        SELECT id FROM profiles WHERE role = 'admin'
--    );

-- 3. Verify via Dashboard:
--    SELECT role, COUNT(*) FROM profiles GROUP BY role;
--    SELECT COUNT(*) FROM class_students;
