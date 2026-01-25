-- =====================================================
-- Migration 021: Allow Students to Update repo_url
-- =====================================================
-- Problem: RLS policy "topics_update" only allows students to update
-- topics with status IN ('pending', 'revision'). After approval,
-- students cannot update repo_url even though this is a legitimate action.
--
-- Solution: Create an RPC function with SECURITY DEFINER that allows
-- students to update ONLY the repo_url field for their own topics.
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.update_topic_repo_url(UUID, TEXT);

-- Create function to update repo_url
CREATE OR REPLACE FUNCTION public.update_topic_repo_url(
    p_topic_id UUID,
    p_repo_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
BEGIN
    -- Verify the topic belongs to the current user
    SELECT student_id INTO v_student_id
    FROM topics
    WHERE id = p_topic_id;
    
    -- Topic not found
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Topic not found';
    END IF;
    
    -- Verify ownership
    IF v_student_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only update your own topic';
    END IF;
    
    -- Update repo_url
    UPDATE topics
    SET 
        repo_url = p_repo_url,
        updated_at = NOW()
    WHERE id = p_topic_id
    AND student_id = auth.uid();
    
    RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_topic_repo_url(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.update_topic_repo_url IS 'Allows students to update repo_url for their topics regardless of status';
