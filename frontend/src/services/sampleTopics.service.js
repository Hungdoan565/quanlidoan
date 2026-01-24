import { supabase } from '../lib/supabase';

/**
 * Sample Topics Service - Quản lý đề tài mẫu của giảng viên
 */
export const sampleTopicsService = {
    /**
     * Lấy danh sách đề tài mẫu của giảng viên hiện tại
     */
    getMyTopics: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('sample_topics')
            .select(`
                *,
                session:sessions(id, name, academic_year, semester, status)
            `)
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Lấy danh sách đề tài mẫu theo session (cho sinh viên xem)
     */
    getBySession: async (sessionId) => {
        const { data, error } = await supabase
            .from('sample_topics')
            .select(`
                *,
                teacher:profiles!sample_topics_teacher_id_fkey(id, full_name, teacher_code, academic_rank)
            `)
            .eq('session_id', sessionId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Tạo đề tài mẫu mới
     */
    create: async (data) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: topic, error } = await supabase
            .from('sample_topics')
            .insert({
                teacher_id: user.id,
                session_id: data.session_id,
                title: data.title,
                description: data.description,
                requirements: data.requirements || [],
                technologies: data.technologies || [],
                difficulty: data.difficulty || null,
                max_students: data.max_students || 1,
                notes: data.notes || null,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;
        return topic;
    },

    /**
     * Cập nhật đề tài mẫu
     */
    update: async (id, data) => {
        const { data: topic, error } = await supabase
            .from('sample_topics')
            .update({
                title: data.title,
                description: data.description,
                requirements: data.requirements,
                technologies: data.technologies,
                difficulty: data.difficulty,
                max_students: data.max_students,
                notes: data.notes,
                is_active: data.is_active,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return topic;
    },

    /**
     * Xóa đề tài mẫu
     */
    delete: async (id) => {
        const { error } = await supabase
            .from('sample_topics')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Toggle trạng thái active
     */
    toggleActive: async (id, isActive) => {
        const { data, error } = await supabase
            .from('sample_topics')
            .update({ is_active: isActive })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

export default sampleTopicsService;
