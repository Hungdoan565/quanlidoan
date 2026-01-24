-- =====================================================
-- Migration 017: Sample Topics Enhancement
-- Thêm các trường mới cho đề tài mẫu
-- =====================================================

-- 1. Tạo ENUM cho độ khó
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
        CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
    END IF;
END $$;

-- 2. Thêm các columns mới vào sample_topics
ALTER TABLE public.sample_topics
    ADD COLUMN IF NOT EXISTS requirements TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS difficulty difficulty_level,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Index cho filtering theo difficulty
CREATE INDEX IF NOT EXISTS idx_sample_topics_difficulty 
    ON public.sample_topics(difficulty);

-- 4. Comments for documentation
COMMENT ON COLUMN public.sample_topics.requirements IS 
    'Mảng các yêu cầu chức năng của đề tài';
COMMENT ON COLUMN public.sample_topics.difficulty IS 
    'Độ khó: easy (Dễ), medium (Trung bình), hard (Khó)';
COMMENT ON COLUMN public.sample_topics.notes IS 
    'Ghi chú bổ sung, yêu cầu kiến thức nền...';

-- 5. Update RLS policies nếu cần (giữ nguyên logic hiện tại)
-- Các policies hiện tại đã đủ cho các columns mới vì chúng không thay đổi logic access
