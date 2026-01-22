-- =====================================================
-- COMPREHENSIVE SEED DATA
-- Hệ thống Quản lý Đồ án DNC
-- =====================================================
-- 
-- HƯỚNG DẪN SỬ DỤNG:
-- 1. Chạy migrations 001, 002, 003 trước
-- 2. Tạo users trong Supabase Auth Dashboard (xem bên dưới)
-- 3. Chạy file này trong SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: TẠO USERS TRONG AUTH DASHBOARD
-- =====================================================
-- Vào Supabase Dashboard > Authentication > Users > Add User
-- Tạo các users sau với metadata:
--
-- 1. admin@dnc.edu.vn / Admin@123
--    Metadata: {"full_name": "Nguyễn Thị Admin", "role": "admin"}
--
-- 2. teacher1@dnc.edu.vn / Teacher@123
--    Metadata: {"full_name": "ThS. Trần Văn Hướng", "role": "teacher"}
--
-- 3. teacher2@dnc.edu.vn / Teacher@123
--    Metadata: {"full_name": "TS. Lê Thị Phản Biện", "role": "teacher"}
--
-- 4. teacher3@dnc.edu.vn / Teacher@123
--    Metadata: {"full_name": "PGS.TS Phạm Văn Chủ", "role": "teacher"}
--
-- 5-15. student1@dnc.edu.vn đến student10@dnc.edu.vn / Student@123
--    Metadata: {"full_name": "Sinh viên X", "role": "student", "student_id": "2152000X"}
--
-- SAU KHI TẠO USERS, trigger sẽ tự động tạo profiles
-- =====================================================

-- =====================================================
-- STEP 2: CẬP NHẬT THÔNG TIN PROFILES
-- =====================================================
-- Chạy sau khi đã tạo users trong Auth Dashboard

-- Cập nhật thông tin admin
UPDATE public.profiles 
SET 
    phone = '0901234567',
    department = 'Phòng Đào tạo'
WHERE email = 'admin@dnc.edu.vn';

-- Cập nhật thông tin giảng viên
UPDATE public.profiles 
SET 
    phone = '0912345678',
    department = 'Khoa Công nghệ Thông tin',
    academic_rank = 'ThS',
    teacher_code = 'GV001'
WHERE email = 'teacher1@dnc.edu.vn';

UPDATE public.profiles 
SET 
    phone = '0923456789',
    department = 'Khoa Công nghệ Thông tin',
    academic_rank = 'TS',
    teacher_code = 'GV002'
WHERE email = 'teacher2@dnc.edu.vn';

UPDATE public.profiles 
SET 
    phone = '0934567890',
    department = 'Khoa Công nghệ Thông tin',
    academic_rank = 'PGS.TS',
    teacher_code = 'GV003'
WHERE email = 'teacher3@dnc.edu.vn';

-- Cập nhật thông tin sinh viên
UPDATE public.profiles SET student_code = '21520001', phone = '0900000001' WHERE email = 'student1@dnc.edu.vn';
UPDATE public.profiles SET student_code = '21520002', phone = '0900000002' WHERE email = 'student2@dnc.edu.vn';
UPDATE public.profiles SET student_code = '21520003', phone = '0900000003' WHERE email = 'student3@dnc.edu.vn';
UPDATE public.profiles SET student_code = '21520004', phone = '0900000004' WHERE email = 'student4@dnc.edu.vn';
UPDATE public.profiles SET student_code = '21520005', phone = '0900000005' WHERE email = 'student5@dnc.edu.vn';
UPDATE public.profiles SET student_code = '21520006', phone = '0900000006' WHERE email = 'student6@dnc.edu.vn';
UPDATE public.profiles SET student_code = '21520007', phone = '0900000007' WHERE email = 'student7@dnc.edu.vn';
UPDATE public.profiles SET student_code = '21520008', phone = '0900000008' WHERE email = 'student8@dnc.edu.vn';
UPDATE public.profiles SET student_code = '21520009', phone = '0900000009' WHERE email = 'student9@dnc.edu.vn';
UPDATE public.profiles SET student_code = '21520010', phone = '0900000010' WHERE email = 'student10@dnc.edu.vn';

-- =====================================================
-- STEP 3: TẠO SESSIONS (ĐỢT ĐỒ ÁN)
-- =====================================================

-- Xóa data cũ nếu có
DELETE FROM public.sessions WHERE id IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
);

-- Đợt đồ án tốt nghiệp - Đang mở
INSERT INTO public.sessions (
    id, name, academic_year, semester, session_type, status,
    registration_start, registration_end,
    report1_deadline, report2_deadline, final_deadline,
    defense_start, defense_end,
    created_by
) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'Đồ án tốt nghiệp K11 - HK1',
    '2025-2026',
    1,
    'do_an_tot_nghiep',
    'open',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '20 days',
    NOW() + INTERVAL '45 days',
    NOW() + INTERVAL '75 days',
    NOW() + INTERVAL '100 days',
    NOW() + INTERVAL '110 days',
    NOW() + INTERVAL '115 days',
    (SELECT id FROM public.profiles WHERE email = 'admin@dnc.edu.vn' LIMIT 1)
);

-- Đợt đồ án cơ sở - Đang mở
INSERT INTO public.sessions (
    id, name, academic_year, semester, session_type, status,
    registration_start, registration_end,
    report1_deadline, report2_deadline, final_deadline,
    defense_start, defense_end,
    created_by
) VALUES (
    'a2222222-2222-2222-2222-222222222222',
    'Đồ án cơ sở K12 - HK1',
    '2025-2026',
    1,
    'do_an_co_so',
    'open',
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '25 days',
    NOW() + INTERVAL '50 days',
    NOW() + INTERVAL '80 days',
    NOW() + INTERVAL '105 days',
    NOW() + INTERVAL '115 days',
    NOW() + INTERVAL '120 days',
    (SELECT id FROM public.profiles WHERE email = 'admin@dnc.edu.vn' LIMIT 1)
);

-- Đợt đồ án cũ - Đã đóng
INSERT INTO public.sessions (
    id, name, academic_year, semester, session_type, status,
    registration_start, registration_end,
    report1_deadline, report2_deadline, final_deadline,
    defense_start, defense_end,
    created_by
) VALUES (
    'a3333333-3333-3333-3333-333333333333',
    'Đồ án tốt nghiệp K10 - HK2',
    '2024-2025',
    2,
    'do_an_tot_nghiep',
    'closed',
    NOW() - INTERVAL '180 days',
    NOW() - INTERVAL '150 days',
    NOW() - INTERVAL '120 days',
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '40 days',
    (SELECT id FROM public.profiles WHERE email = 'admin@dnc.edu.vn' LIMIT 1)
);

-- =====================================================
-- STEP 4: TẠO LỚP HỌC PHẦN
-- =====================================================

-- Xóa data cũ
DELETE FROM public.classes WHERE session_id IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
);

-- Lớp cho đợt ĐATN K11
INSERT INTO public.classes (id, session_id, code, name, max_students) VALUES
    ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'DATN_K11_01', 'Đồ án TN K11 - Nhóm 1', 25),
    ('b1111111-1111-1111-1111-111111111112', 'a1111111-1111-1111-1111-111111111111', 'DATN_K11_02', 'Đồ án TN K11 - Nhóm 2', 25),
    ('b1111111-1111-1111-1111-111111111113', 'a1111111-1111-1111-1111-111111111111', 'DATN_K11_03', 'Đồ án TN K11 - Nhóm 3', 25);

-- Lớp cho đợt ĐACS K12
INSERT INTO public.classes (id, session_id, code, name, max_students) VALUES
    ('b2222222-2222-2222-2222-222222222221', 'a2222222-2222-2222-2222-222222222222', 'DACS_K12_01', 'Đồ án CS K12 - Nhóm 1', 30),
    ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'DACS_K12_02', 'Đồ án CS K12 - Nhóm 2', 30);

-- =====================================================
-- STEP 5: PHÂN CÔNG GIẢNG VIÊN (TEACHER_PAIRS)
-- =====================================================

-- Xóa data cũ
DELETE FROM public.teacher_pairs WHERE class_id IN (
    'b1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111112',
    'b2222222-2222-2222-2222-222222222221'
);

-- Phân công cho DATN K11 - Nhóm 1: GV1 HD, GV2 PB
INSERT INTO public.teacher_pairs (class_id, advisor_id, reviewer_id)
SELECT 
    'b1111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn')
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn')
  AND EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn');

-- Phân công cho DATN K11 - Nhóm 2: GV2 HD, GV1 PB
INSERT INTO public.teacher_pairs (class_id, advisor_id, reviewer_id)
SELECT 
    'b1111111-1111-1111-1111-111111111112',
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn'),
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn')
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn')
  AND EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn');

-- Phân công cho DACS K12 - Nhóm 1
INSERT INTO public.teacher_pairs (class_id, advisor_id, reviewer_id)
SELECT 
    'b2222222-2222-2222-2222-222222222221',
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    (SELECT id FROM public.profiles WHERE email = 'teacher3@dnc.edu.vn')
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn')
  AND EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher3@dnc.edu.vn');

-- =====================================================
-- STEP 6: GÁN SINH VIÊN VÀO LỚP
-- =====================================================

-- Xóa data cũ
DELETE FROM public.class_students WHERE class_id IN (
    'b1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111112',
    'b2222222-2222-2222-2222-222222222221'
);

-- Gán sinh viên 1-5 vào DATN K11 - Nhóm 1
INSERT INTO public.class_students (class_id, student_id)
SELECT 'b1111111-1111-1111-1111-111111111111', id 
FROM public.profiles 
WHERE email IN ('student1@dnc.edu.vn', 'student2@dnc.edu.vn', 'student3@dnc.edu.vn', 'student4@dnc.edu.vn', 'student5@dnc.edu.vn');

-- Gán sinh viên 6-8 vào DATN K11 - Nhóm 2
INSERT INTO public.class_students (class_id, student_id)
SELECT 'b1111111-1111-1111-1111-111111111112', id 
FROM public.profiles 
WHERE email IN ('student6@dnc.edu.vn', 'student7@dnc.edu.vn', 'student8@dnc.edu.vn');

-- Gán sinh viên 9-10 vào DACS K12 - Nhóm 1
INSERT INTO public.class_students (class_id, student_id)
SELECT 'b2222222-2222-2222-2222-222222222221', id 
FROM public.profiles 
WHERE email IN ('student9@dnc.edu.vn', 'student10@dnc.edu.vn');

-- =====================================================
-- STEP 7: TẠO ĐỀ TÀI MẪU CỦA GIẢNG VIÊN
-- =====================================================

-- Xóa data cũ
DELETE FROM public.sample_topics WHERE session_id IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222'
);

-- Đề tài mẫu của GV1
INSERT INTO public.sample_topics (teacher_id, session_id, title, description, technologies, max_students, current_students, is_active)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    'a1111111-1111-1111-1111-111111111111',
    'Xây dựng hệ thống quản lý bán hàng trực tuyến',
    'Phát triển website thương mại điện tử với các chức năng: quản lý sản phẩm, giỏ hàng, thanh toán online, quản lý đơn hàng.',
    ARRAY['React', 'Node.js', 'PostgreSQL', 'Stripe'],
    2,
    1,
    true
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn');

INSERT INTO public.sample_topics (teacher_id, session_id, title, description, technologies, max_students, current_students, is_active)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    'a1111111-1111-1111-1111-111111111111',
    'Ứng dụng mobile quản lý công việc cá nhân',
    'Xây dựng ứng dụng di động đa nền tảng hỗ trợ quản lý công việc, nhắc nhở, và theo dõi thói quen.',
    ARRAY['React Native', 'Firebase', 'Redux'],
    2,
    0,
    true
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn');

-- Đề tài mẫu của GV2
INSERT INTO public.sample_topics (teacher_id, session_id, title, description, technologies, max_students, current_students, is_active)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn'),
    'a1111111-1111-1111-1111-111111111111',
    'Hệ thống nhận diện khuôn mặt điểm danh',
    'Ứng dụng AI nhận diện khuôn mặt để điểm danh tự động trong lớp học.',
    ARRAY['Python', 'OpenCV', 'TensorFlow', 'Flask'],
    1,
    1,
    true
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn');

INSERT INTO public.sample_topics (teacher_id, session_id, title, description, technologies, max_students, current_students, is_active)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn'),
    'a1111111-1111-1111-1111-111111111111',
    'Chatbot hỗ trợ tư vấn tuyển sinh',
    'Xây dựng chatbot AI tự động trả lời các câu hỏi về tuyển sinh đại học.',
    ARRAY['Python', 'NLP', 'Rasa', 'Docker'],
    2,
    0,
    true
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn');

-- =====================================================
-- STEP 8: TẠO ĐỀ TÀI SINH VIÊN ĐÃ ĐĂNG KÝ
-- =====================================================

-- Xóa data cũ
DELETE FROM public.topics WHERE class_id IN (
    'b1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111112'
);

-- Đề tài đã được duyệt (student1)
INSERT INTO public.topics (student_id, class_id, title, description, technologies, advisor_id, reviewer_id, status, approved_at)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'student1@dnc.edu.vn'),
    'b1111111-1111-1111-1111-111111111111',
    'Website đặt lịch khám bệnh trực tuyến',
    'Xây dựng hệ thống đặt lịch khám bệnh online cho phòng khám đa khoa, tích hợp thanh toán và nhắc lịch.',
    ARRAY['React', 'Supabase', 'Tailwind CSS'],
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn'),
    'in_progress',
    NOW() - INTERVAL '5 days'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'student1@dnc.edu.vn');

-- Đề tài đang chờ duyệt (student2)
INSERT INTO public.topics (student_id, class_id, title, description, technologies, advisor_id, reviewer_id, status)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'student2@dnc.edu.vn'),
    'b1111111-1111-1111-1111-111111111111',
    'Ứng dụng quản lý thư viện số',
    'Phát triển hệ thống quản lý thư viện với chức năng mượn trả sách, quản lý độc giả, thống kê báo cáo.',
    ARRAY['Vue.js', 'Laravel', 'MySQL'],
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn'),
    'pending'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'student2@dnc.edu.vn');

-- Đề tài yêu cầu sửa (student3)
INSERT INTO public.topics (student_id, class_id, title, description, technologies, advisor_id, reviewer_id, status, revision_note)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'student3@dnc.edu.vn'),
    'b1111111-1111-1111-1111-111111111111',
    'Game giáo dục cho trẻ em',
    'Xây dựng game học tiếng Anh cho trẻ em từ 5-10 tuổi.',
    ARRAY['Unity', 'C#'],
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn'),
    'revision',
    'Cần bổ sung thêm mô tả chi tiết về gameplay và phương pháp giáo dục. Liên hệ GV để được hướng dẫn thêm.'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'student3@dnc.edu.vn');

-- Đề tài đã duyệt (student4)
INSERT INTO public.topics (student_id, class_id, title, description, technologies, advisor_id, reviewer_id, status, approved_at)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'student4@dnc.edu.vn'),
    'b1111111-1111-1111-1111-111111111111',
    'Hệ thống quản lý nhà trọ',
    'Ứng dụng web quản lý phòng trọ, hợp đồng thuê, thu tiền và báo cáo doanh thu.',
    ARRAY['Next.js', 'Prisma', 'PostgreSQL'],
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn'),
    'approved',
    NOW() - INTERVAL '2 days'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'student4@dnc.edu.vn');

-- Đề tài bị từ chối (student6 - lớp 2)
INSERT INTO public.topics (student_id, class_id, title, description, technologies, advisor_id, reviewer_id, status, rejection_reason)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'student6@dnc.edu.vn'),
    'b1111111-1111-1111-1111-111111111112',
    'Website bán hàng online',
    'Làm web bán hàng.',
    ARRAY['PHP'],
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn'),
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    'rejected',
    'Đề tài quá đơn giản, không đáp ứng yêu cầu đồ án tốt nghiệp. Vui lòng đề xuất đề tài khác với phạm vi và độ phức tạp phù hợp hơn.'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'student6@dnc.edu.vn');

-- Đề tài đang chờ (student7 - lớp 2)
INSERT INTO public.topics (student_id, class_id, title, description, technologies, advisor_id, reviewer_id, status)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'student7@dnc.edu.vn'),
    'b1111111-1111-1111-1111-111111111112',
    'Ứng dụng đặt xe công nghệ',
    'Xây dựng ứng dụng đặt xe tương tự Grab với các chức năng đặt xe, theo dõi lộ trình, thanh toán.',
    ARRAY['Flutter', 'Firebase', 'Google Maps API'],
    (SELECT id FROM public.profiles WHERE email = 'teacher2@dnc.edu.vn'),
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    'pending'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'student7@dnc.edu.vn');

-- =====================================================
-- STEP 9: TẠO TIÊU CHÍ CHẤM ĐIỂM
-- =====================================================

-- Xóa data cũ
DELETE FROM public.grading_criteria WHERE session_id = 'a1111111-1111-1111-1111-111111111111';

-- Tiêu chí cho GVHD
INSERT INTO public.grading_criteria (session_id, grader_role, criteria) VALUES
('a1111111-1111-1111-1111-111111111111', 'advisor', '[
    {"name": "Điểm danh, thái độ làm việc", "weight": 0.10, "max_score": 10, "description": "Tham gia đầy đủ các buổi hướng dẫn, thái độ tích cực"},
    {"name": "Tiến độ thực hiện", "weight": 0.15, "max_score": 10, "description": "Hoàn thành đúng tiến độ đề ra"},
    {"name": "Chất lượng báo cáo", "weight": 0.25, "max_score": 10, "description": "Nội dung báo cáo đầy đủ, rõ ràng"},
    {"name": "Demo sản phẩm", "weight": 0.35, "max_score": 10, "description": "Sản phẩm hoạt động đúng yêu cầu"},
    {"name": "Khả năng tự nghiên cứu", "weight": 0.15, "max_score": 10, "description": "Chủ động tìm hiểu, giải quyết vấn đề"}
]'::jsonb);

-- Tiêu chí cho GVPB
INSERT INTO public.grading_criteria (session_id, grader_role, criteria) VALUES
('a1111111-1111-1111-1111-111111111111', 'reviewer', '[
    {"name": "Nội dung đề tài", "weight": 0.35, "max_score": 10, "description": "Đề tài có tính thực tiễn, giải quyết vấn đề cụ thể"},
    {"name": "Phương pháp thực hiện", "weight": 0.25, "max_score": 10, "description": "Phương pháp phù hợp, khoa học"},
    {"name": "Kết quả đạt được", "weight": 0.25, "max_score": 10, "description": "Kết quả đáp ứng mục tiêu đề ra"},
    {"name": "Hình thức báo cáo", "weight": 0.15, "max_score": 10, "description": "Trình bày rõ ràng, đúng quy cách"}
]'::jsonb);

-- Tiêu chí cho Hội đồng
INSERT INTO public.grading_criteria (session_id, grader_role, criteria) VALUES
('a1111111-1111-1111-1111-111111111111', 'council', '[
    {"name": "Trình bày", "weight": 0.20, "max_score": 10, "description": "Trình bày rõ ràng, logic, đúng thời gian"},
    {"name": "Trả lời câu hỏi", "weight": 0.30, "max_score": 10, "description": "Trả lời đúng, đầy đủ các câu hỏi"},
    {"name": "Hiểu biết chuyên môn", "weight": 0.30, "max_score": 10, "description": "Nắm vững kiến thức liên quan"},
    {"name": "Tổng thể đồ án", "weight": 0.20, "max_score": 10, "description": "Đánh giá tổng thể chất lượng đồ án"}
]'::jsonb);

-- =====================================================
-- STEP 10: TẠO THÔNG BÁO MẪU
-- =====================================================

-- Thông báo cho sinh viên có đề tài được duyệt
INSERT INTO public.notifications (user_id, type, title, message, link, is_read, created_at)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'student1@dnc.edu.vn'),
    'topic_approved',
    'Đề tài đã được duyệt',
    'Đề tài "Website đặt lịch khám bệnh trực tuyến" đã được giảng viên phê duyệt. Bạn có thể bắt đầu thực hiện.',
    '/student/topic',
    false,
    NOW() - INTERVAL '5 days'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'student1@dnc.edu.vn');

-- Thông báo cho GV có đề tài mới cần duyệt
INSERT INTO public.notifications (user_id, type, title, message, link, is_read, created_at)
SELECT 
    (SELECT id FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn'),
    'new_topic_registration',
    'Sinh viên đăng ký đề tài mới',
    'Sinh viên Nguyễn Văn B đã đăng ký đề tài "Ứng dụng quản lý thư viện số"',
    '/teacher/reviews',
    false,
    NOW() - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'teacher1@dnc.edu.vn');

-- Thông báo deadline sắp tới
INSERT INTO public.notifications (user_id, type, title, message, link, is_read, created_at)
SELECT 
    id,
    'deadline_reminder',
    'Nhắc nhở: Hạn đăng ký đề tài',
    'Còn 20 ngày để đăng ký đề tài cho đợt ĐATN K11 - HK1. Hãy hoàn thành đăng ký sớm!',
    '/student/register',
    false,
    NOW()
FROM public.profiles 
WHERE role = 'student' AND email LIKE 'student%@dnc.edu.vn';

-- =====================================================
-- DONE! Kiểm tra dữ liệu
-- =====================================================

-- Kiểm tra sessions
SELECT 'Sessions:' as info, count(*) as count FROM public.sessions;

-- Kiểm tra classes
SELECT 'Classes:' as info, count(*) as count FROM public.classes;

-- Kiểm tra profiles by role
SELECT role, count(*) as count FROM public.profiles GROUP BY role;

-- Kiểm tra topics by status
SELECT status, count(*) as count FROM public.topics GROUP BY status;
