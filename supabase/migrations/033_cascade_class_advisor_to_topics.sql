-- ============================================================================
-- Migration: 033_cascade_class_advisor_to_topics
-- Purpose: Fix bug where students register topics BEFORE class advisor is assigned
--          After admin assigns GVHD, student topic still shows "Chưa phân công"
-- ============================================================================

-- ============================================================================
-- PART 1: Create trigger function to cascade class advisor updates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cascade_class_advisor_to_topics()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act when advisor_id actually changes and is being SET (not cleared)
    IF NEW.advisor_id IS DISTINCT FROM OLD.advisor_id AND NEW.advisor_id IS NOT NULL THEN
        -- Update all topics in this class that have NULL advisor_id
        -- Do NOT overwrite topics that already have an advisor assigned
        UPDATE public.topics t
        SET advisor_id = NEW.advisor_id
        WHERE t.class_id = NEW.id
          AND t.advisor_id IS NULL;
          
        -- Log the cascade for audit purposes
        RAISE NOTICE 'Cascaded advisor_id % to topics in class %', NEW.advisor_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.cascade_class_advisor_to_topics() IS 
'Cascades class advisor_id to existing topics with NULL advisor when class advisor is assigned/changed. 
This fixes the bug where students register before advisor assignment.';

-- ============================================================================
-- PART 2: Create trigger on classes table
-- ============================================================================

-- Drop if exists to make migration idempotent
DROP TRIGGER IF EXISTS cascade_class_advisor_to_topics ON public.classes;

-- Create trigger that fires AFTER UPDATE of advisor_id column
CREATE TRIGGER cascade_class_advisor_to_topics
    AFTER UPDATE OF advisor_id ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION public.cascade_class_advisor_to_topics();

-- ============================================================================
-- PART 3: One-time backfill for existing orphaned topics
-- ============================================================================

-- Update all existing topics that have NULL advisor_id 
-- but their class has an advisor assigned
UPDATE public.topics t
SET advisor_id = c.advisor_id
FROM public.classes c
WHERE t.class_id = c.id
  AND t.advisor_id IS NULL
  AND c.advisor_id IS NOT NULL;

-- Log how many were updated (for manual verification)
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    -- Count remaining orphans (should be 0 or only where class also has no advisor)
    SELECT count(*) INTO orphan_count
    FROM public.topics t
    JOIN public.classes c ON c.id = t.class_id
    WHERE t.advisor_id IS NULL AND c.advisor_id IS NOT NULL;
    
    RAISE NOTICE 'Remaining orphaned topics after backfill: %', orphan_count;
END $$;
