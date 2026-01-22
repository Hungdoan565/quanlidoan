-- =====================================================
-- PATCH: Update handle_new_user() Trigger
-- Thêm student_code và teacher_code khi đăng ký
-- =====================================================

-- Chạy script này trên Supabase SQL Editor để cập nhật trigger

-- 1. Drop và tạo lại function mới
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

-- 2. Kiểm tra trigger đã tồn tại
-- Nếu chưa có, chạy lệnh này:
-- CREATE OR REPLACE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- KIỂM TRA
-- =====================================================
-- Sau khi chạy script này, đăng ký user mới và kiểm tra:
-- SELECT id, email, full_name, role, student_code FROM profiles ORDER BY created_at DESC LIMIT 5;
