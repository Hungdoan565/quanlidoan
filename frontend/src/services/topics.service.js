import { supabase } from '../lib/supabase';

/**
 * Topics Service - Quản lý đề tài
 */
export const topicsService = {
    /**
     * Lấy lớp học của sinh viên (để biết session_id)
     */
    getStudentClass: async (studentId) => {
        console.log('[StudentClass] Query for studentId:', studentId);
        
        const { data, error } = await supabase
            .from('class_students')
            .select(`
                id,
                student_id,
                class_id,
                class:classes(
                    id, 
                    name, 
                    code,
                    session_id,
                    advisor_id,
                    advisor:profiles!classes_advisor_id_fkey(id, full_name, teacher_code, email, avatar_url),
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

        console.log('[StudentClass] Result:', { data, error });

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            console.warn('[StudentClass] No record found for studentId:', studentId);
            return null;
        }

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
                    advisor:profiles!classes_advisor_id_fkey(id, full_name, teacher_code, email, phone, avatar_url),
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
     * Uses RPC function to bypass RLS (students can update repo_url regardless of topic status)
     */
    updateRepoUrl: async (topicId, repoUrl) => {
        const { data, error } = await supabase
            .rpc('update_topic_repo_url', {
                p_topic_id: topicId,
                p_repo_url: repoUrl || null,
            });

        if (error) throw error;
        return data;
    },

    /**
     * Kiểm tra sinh viên đã đăng ký đề tài chưa
     * Chỉ tính các topic có status không phải 'rejected'
     * Cho phép SV đăng ký lại sau khi bị reject
     */
    hasRegisteredTopic: async (studentId) => {
        const { count, error } = await supabase
            .from('topics')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .not('status', 'eq', 'rejected'); // Exclude rejected topics

        if (error) throw error;
        return count > 0;
    },

    /**
     * Lấy topic hiện tại (active) của sinh viên - không phải rejected
     */
    getActiveTopic: async (studentId) => {
        const { data, error } = await supabase
            .from('topics')
            .select(`
                *,
                class:classes(
                    id, name, code,
                    advisor_id,
                    advisor:profiles!classes_advisor_id_fkey(id, full_name, teacher_code, email, phone, avatar_url),
                    session:sessions(*)
                ),
                advisor:profiles!topics_advisor_id_fkey(id, full_name, teacher_code, email, phone, avatar_url),
                sample_topic:sample_topics(id, title)
            `)
            .eq('student_id', studentId)
            .not('status', 'eq', 'rejected')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    /**
     * Lấy chi tiết đề tài theo ID
     * Dùng cho trang chấm điểm chi tiết
     */
    getById: async (topicId) => {
        if (!topicId) return null;

        const { data, error } = await supabase
            .from('topics')
            .select(`
                *,
                student:student_id(id, full_name, email, student_code),
                advisor:advisor_id(id, full_name, teacher_code),
                reviewer:reviewer_id(id, full_name, teacher_code),
                class:class_id(
                    id, 
                    name,
                    session_id,
                    session:session_id(id, name, academic_year, semester)
                )
            `)
            .eq('id', topicId)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Kiểm tra thời hạn đăng ký
     */
    isRegistrationOpen: (session) => {
        console.log('[Registration] Checking session:', session);
        
        if (!session) {
            console.log('[Registration] No session provided');
            return false;
        }
        
        const now = new Date();
        const start = session.registration_start ? new Date(session.registration_start) : null;
        const end = session.registration_end ? new Date(session.registration_end) : null;

        console.log('[Registration] Now:', now);
        console.log('[Registration] Start:', start, '| Now >= Start:', start ? now >= start : 'no start');
        console.log('[Registration] End:', end, '| Now <= End:', end ? now <= end : 'no end');
        console.log('[Registration] Session status:', session.status);

        if (start && now < start) {
            console.log('[Registration] BLOCKED: Before start date');
            return false;
        }
        if (end && now > end) {
            console.log('[Registration] BLOCKED: After end date');
            return false;
        }
        if (session.status !== 'open') {
            console.log('[Registration] BLOCKED: Session status is not "open"');
            return false;
        }
        
        console.log('[Registration] ALLOWED');
        return true;
    },
};

export default topicsService;
