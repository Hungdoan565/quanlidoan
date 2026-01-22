-- =====================================================
-- Migration 004: Seed Data (Test Users)
-- Hệ thống Quản lý Đồ án DNC
-- =====================================================

-- IMPORTANT: Chạy file này SAU KHI đã tạo users trong Supabase Auth Dashboard
-- Hoặc sử dụng để reference tạo manual

-- =====================================================
-- SAMPLE SESSION
-- =====================================================
INSERT INTO public.sessions (id, name, academic_year, semester, session_type, status, registration_start, registration_end)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Đồ án tốt nghiệp K11 - HK1',
  '2025-2026',
  1,
  'do_an_tot_nghiep',
  'open',
  NOW(),
  NOW() + INTERVAL '30 days'
);

-- =====================================================
-- SAMPLE CLASSES
-- =====================================================
INSERT INTO public.classes (id, session_id, code, name, max_students)
VALUES 
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DATN_K11_01', 'Đồ án TN K11 - Nhóm 1', 25),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DATN_K11_02', 'Đồ án TN K11 - Nhóm 2', 25);

-- =====================================================
-- SAMPLE GRADING CRITERIA
-- =====================================================
INSERT INTO public.grading_criteria (session_id, grader_role, criteria)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'advisor',
    '[
      {"name": "Điểm danh, thái độ", "weight": 0.10, "max_score": 10},
      {"name": "Tiến độ thực hiện", "weight": 0.15, "max_score": 10},
      {"name": "Nội dung báo cáo", "weight": 0.35, "max_score": 10},
      {"name": "Demo sản phẩm", "weight": 0.30, "max_score": 10},
      {"name": "Hình thức trình bày", "weight": 0.10, "max_score": 10}
    ]'::jsonb
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'reviewer',
    '[
      {"name": "Nội dung đề tài", "weight": 0.40, "max_score": 10},
      {"name": "Phương pháp thực hiện", "weight": 0.30, "max_score": 10},
      {"name": "Kết quả đạt được", "weight": 0.20, "max_score": 10},
      {"name": "Hình thức báo cáo", "weight": 0.10, "max_score": 10}
    ]'::jsonb
  );

-- =====================================================
-- HOW TO CREATE TEST USERS
-- =====================================================
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create users with these emails:
--    - admin@dnc.edu.vn (role: admin)
--    - teacher@dnc.edu.vn (role: teacher)
--    - student@dnc.edu.vn (role: student)
--
-- 3. When creating, add user_metadata:
--    {
--      "full_name": "Admin DNC",
--      "role": "admin"
--    }
--
-- The profile will be auto-created by the trigger in 003_auth_functions.sql

-- =====================================================
-- END OF MIGRATION 004
-- =====================================================
