-- =====================================================
-- Migration 008: Add profile fields + Fix triggers
-- =====================================================

-- Step 1: Add new columns to profiles if not exist
DO $$
BEGIN
    -- Add gender column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE public.profiles ADD COLUMN gender VARCHAR(10);
    END IF;
    
    -- Add birth_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'birth_date') THEN
        ALTER TABLE public.profiles ADD COLUMN birth_date DATE;
    END IF;
    
    -- Add class_name column (lớp chính quy như DH22TIN06)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'class_name') THEN
        ALTER TABLE public.profiles ADD COLUMN class_name VARCHAR(20);
    END IF;
END $$;

-- Step 2: Verify trigger assign_teachers_to_topic exists
-- Re-create if needed
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

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS assign_teachers_on_topic_insert ON public.topics;
CREATE TRIGGER assign_teachers_on_topic_insert
  BEFORE INSERT ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.assign_teachers_to_topic();

-- =====================================================
-- Verification queries (run after migration)
-- =====================================================
-- Check new columns exist:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name IN ('gender', 'birth_date', 'class_name');

-- Check trigger exists:
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE event_object_table = 'topics';
