import { supabase } from '../lib/supabase';

/**
 * Topics Service - Quản lý đề tài
 */
export const topicsService = {
    /**
     * Lấy lớp học của sinh viên (để biết session_id)
     */
    getStudentClass: async (studentId) => {
        const { data, error } = await supabase
            .from('class_students')
            .select(`
                id,
                class:classes(
                    id, 
                    name, 
                    code,
                    session_id,
                    advisor_id,
                    advisor:profiles!classes_advisor_id_fkey(id, full_name, teacher_code, email),
                    session:sessions(
                        id, 
                        name, 
                        academic_year, 
                        semester,
                        status,
                        registration_start,
                        registration_end
                    )
                )
            `)
            .eq('student_id', studentId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) return null;

        // Transform data - Unified Lecturer model (no reviewer)
        return {
            ...data.class,
            advisor: data.class?.advisor || null,
        };
    },

    /**
     * Lấy danh sách đề tài mẫu của session (còn slot trống)
     */
    getSampleTopics: async (sessionId) => {
        const { data, error } = await supabase
            .from('sample_topics')
            .select(`
                *,
                teacher:profiles!sample_topics_teacher_id_fkey(id, full_name, teacher_code)
            `)
            .eq('session_id', sessionId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter những đề tài còn slot
        return data?.filter(t => t.current_students < t.max_students) || [];
    },

    /**
     * Lấy tất cả đề tài mẫu (kể cả hết slot - cho hiển thị)
     */
    getAllSampleTopics: async (sessionId) => {
        const { data, error } = await supabase
            .from('sample_topics')
            .select(`
                *,
                teacher:profiles!sample_topics_teacher_id_fkey(id, full_name, teacher_code)
            `)
            .eq('session_id', sessionId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Đăng ký đề tài từ đề tài mẫu
     */
    registerFromSample: async ({ studentId, classId, sampleTopicId }) => {
        // Lấy thông tin đề tài mẫu
        const { data: sampleTopic, error: sampleError } = await supabase
            .from('sample_topics')
            .select('*')
            .eq('id', sampleTopicId)
            .single();

        if (sampleError) throw sampleError;

        // Check slot còn không
        if (sampleTopic.current_students >= sampleTopic.max_students) {
            throw new Error('Đề tài này đã hết slot đăng ký');
        }

        // Tạo topic mới (trigger sẽ tự động gán advisor từ class)
        const { data, error } = await supabase
            .from('topics')
            .insert({
                student_id: studentId,
                class_id: classId,
                sample_topic_id: sampleTopicId,
                title: sampleTopic.title,
                description: sampleTopic.description,
                technologies: sampleTopic.technologies,
                status: 'pending',
            })
            .select(`
                *,
                advisor:profiles!topics_advisor_id_fkey(id, full_name, email)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Đề xuất đề tài mới (tự đề xuất)
     */
    proposeTopic: async ({ studentId, classId, title, description, technologies }) => {
        const { data, error } = await supabase
            .from('topics')
            .insert({
                student_id: studentId,
                class_id: classId,
                sample_topic_id: null, // Không từ mẫu
                title,
                description,
                technologies: technologies || [],
                status: 'pending',
            })
            .select(`
                *,
                advisor:profiles!topics_advisor_id_fkey(id, full_name, email)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Cập nhật đề tài (khi yêu cầu revision)
     */
    updateTopic: async (topicId, { title, description, technologies, repoUrl }) => {
        const updateData = {
            title,
            description,
            technologies,
            status: 'pending', // Reset về pending sau khi sửa
            revision_note: null, // Clear revision note
        };
        
        // Chỉ update repo_url nếu được cung cấp
        if (repoUrl !== undefined) {
            updateData.repo_url = repoUrl;
        }

        const { data, error } = await supabase
            .from('topics')
            .update(updateData)
            .eq('id', topicId)
            .select(`
                *,
                advisor:profiles!topics_advisor_id_fkey(id, full_name, email)
            `)
            .single();

        if (error) throw error;
        return data;
    },

    /**
 * Lấy chi tiết đề tài của sinh viên
 * Advisor/Reviewer được lấy từ class teacher_pairs (separate query)
 */
    getMyTopic: async (studentId) => {
        // Get topic with class info and advisor (Unified Lecturer model)
        const { data, error } = await supabase
            .from('topics')
            .select(`
                *,
                class:classes(
                    id, name, code,
                    advisor_id,
                    session:sessions(*)
                ),
                advisor:profiles!topics_advisor_id_fkey(id, full_name, teacher_code, email, phone),
                sample_topic:sample_topics(id, title)
            `)
            .eq('student_id', studentId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;

        return data;
    },

    /**
     * Cập nhật repo URL của topic
     */
    updateRepoUrl: async (topicId, repoUrl) => {
        const { data, error } = await supabase
            .from('topics')
            .update({ repo_url: repoUrl })
            .eq('id', topicId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Kiểm tra sinh viên đã đăng ký đề tài chưa
     */
    hasRegisteredTopic: async (studentId) => {
        const { count, error } = await supabase
            .from('topics')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId);

        if (error) throw error;
        return count > 0;
    },

    /**
     * Kiểm tra thời hạn đăng ký
     */
    isRegistrationOpen: (session) => {
        if (!session) return false;
        const now = new Date();
        const start = session.registration_start ? new Date(session.registration_start) : null;
        const end = session.registration_end ? new Date(session.registration_end) : null;

        if (start && now < start) return false;
        if (end && now > end) return false;
        return session.status === 'open';
    },
};

export default topicsService;
