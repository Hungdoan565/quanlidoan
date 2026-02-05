-- Migration 037: Sample Topics Counts RPC
-- =====================================================

DROP FUNCTION IF EXISTS public.get_sample_topics_with_counts(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_sample_topics_with_counts(
    p_session_id UUID,
    p_only_active BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    technologies TEXT[],
    max_students INTEGER,
    current_students INTEGER,
    teacher JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        st.id,
        st.title,
        st.description,
        st.technologies,
        st.max_students,
        COALESCE(COUNT(t.id) FILTER (WHERE t.status != 'rejected'), 0)::INTEGER AS current_students,
        jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'teacher_code', p.teacher_code,
            'avatar_url', p.avatar_url,
            'department', p.department,
            'academic_rank', p.academic_rank,
            'bio', p.bio,
            'interests', p.interests,
            'bio_public', p.bio_public
        ) AS teacher
    FROM sample_topics st
    JOIN profiles p ON p.id = st.teacher_id
    LEFT JOIN topics t ON t.sample_topic_id = st.id
    WHERE st.session_id = p_session_id
      AND (NOT p_only_active OR st.is_active = true)
    GROUP BY st.id, st.title, st.description, st.technologies, st.max_students, st.created_at,
             p.id, p.full_name, p.teacher_code, p.avatar_url, p.department, p.academic_rank, p.bio, p.interests, p.bio_public
    ORDER BY st.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_sample_topics_with_counts(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.get_sample_topics_with_counts IS 'Returns sample topics with computed current_students and teacher info for a session';
