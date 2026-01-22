-- ============================================================
-- SEED DATA: Test Users for TechForge QL_DoAN
-- ============================================================
-- 
-- HOW TO USE:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
-- 
-- This will create:
-- - 1 Admin account
-- - 2 Teacher accounts
-- - 3 Student accounts
--
-- All passwords: Test@123456
-- ============================================================

-- First, create the users in auth.users using Supabase Dashboard
-- Then run this script to create profiles (if trigger didn't work)

-- ============================================================
-- OPTION A: If you created users via Dashboard with correct metadata
-- The trigger should have created profiles automatically.
-- Check if profiles exist:
-- ============================================================
SELECT id, email, full_name, role FROM public.profiles;

-- ============================================================
-- OPTION B: Manual profile creation (if trigger bypass occurred)
-- Use when creating users from Dashboard without proper metadata
-- ============================================================

-- NOTE: Replace the UUIDs below with actual auth.users.id values
-- You can get them from: Supabase Dashboard → Authentication → Users

-- Example format:
-- INSERT INTO public.profiles (id, email, full_name, role, teacher_code, student_code, department, is_active)
-- VALUES (
--     'uuid-from-auth-users-table',
--     'email@example.com',
--     'Full Name',
--     'role', -- 'admin', 'teacher', or 'student'
--     'GV001', -- for teachers
--     '20110001', -- for students
--     'Công nghệ thông tin', -- for teachers
--     true
-- );


-- ============================================================
-- TEST DATA TEMPLATE
-- ============================================================
-- Copy these to create test accounts in Dashboard:

/*
=== ADMIN ===
Email: admin@dnc.edu.vn
Password: Test@123456
User Metadata (JSON):
{
    "role": "admin",
    "full_name": "Quản Trị Hệ Thống"
}

=== TEACHER 1 ===
Email: gv.nguyenvana@dnc.edu.vn
Password: Test@123456
User Metadata (JSON):
{
    "role": "teacher",
    "full_name": "TS. Nguyễn Văn A",
    "teacher_code": "GV001"
}

=== TEACHER 2 ===
Email: gv.tranthib@dnc.edu.vn
Password: Test@123456
User Metadata (JSON):
{
    "role": "teacher",
    "full_name": "ThS. Trần Thị B",
    "teacher_code": "GV002"
}

=== STUDENT 1 ===
Email: sv.20110001@dnc.edu.vn
Password: Test@123456
User Metadata (JSON):
{
    "role": "student",
    "full_name": "Lê Văn Sinh Viên A",
    "student_id": "20110001"
}

=== STUDENT 2 ===
Email: sv.20110002@dnc.edu.vn
Password: Test@123456
User Metadata (JSON):
{
    "role": "student",
    "full_name": "Trần Thị Sinh Viên B",
    "student_id": "20110002"
}

=== STUDENT 3 ===
Email: sv.20110003@dnc.edu.vn
Password: Test@123456
User Metadata (JSON):
{
    "role": "student",
    "full_name": "Phạm Văn Sinh Viên C",
    "student_id": "20110003"
}
*/


-- ============================================================
-- VERIFY PROFILES
-- ============================================================
-- Run this after creating users to verify profiles exist:

SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.teacher_code,
    p.student_code,
    p.is_active,
    p.created_at
FROM public.profiles p
ORDER BY 
    CASE p.role 
        WHEN 'admin' THEN 1 
        WHEN 'teacher' THEN 2 
        WHEN 'student' THEN 3 
    END,
    p.created_at;


-- ============================================================
-- FIX MISSING PROFILES (Emergency recovery)
-- ============================================================
-- If a user exists in auth.users but NOT in profiles, run:

/*
INSERT INTO public.profiles (id, email, full_name, role, teacher_code)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'role', 'student'),
    u.raw_user_meta_data->>'teacher_code'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
*/


-- ============================================================
-- UPDATE TEACHER FOR CLASS ASSIGNMENT
-- ============================================================
-- After creating teachers, you may need to assign them to classes.
-- First get their IDs:

SELECT id, full_name, teacher_code FROM profiles WHERE role = 'teacher';

-- Then update classes to assign teachers:
-- UPDATE public.classes SET teacher_id = 'teacher-uuid' WHERE id = 'class-id';
