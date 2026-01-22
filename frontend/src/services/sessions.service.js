import { supabase } from '../lib/supabase';

/**
 * Sessions Service - Quản lý đợt đồ án
 */
export const sessionsService = {
    /**
     * Lấy danh sách sessions với filters
     * Includes classes với student count
     */
    getAll: async (filters = {}) => {
        let query = supabase
            .from('sessions')
            .select(`
                *,
                classes(*)
            `);

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.academic_year) {
            query = query.eq('academic_year', filters.academic_year);
        }
        if (filters.session_type) {
            query = query.eq('session_type', filters.session_type);
        }
        if (filters.search) {
            query = query.ilike('name', `%${filters.search}%`);
        }

        // Ordering
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        // Fetch student counts for all classes
        const allClassIds = data?.flatMap(s => s.classes?.map(c => c.id) || []) || [];

        let studentCounts = {};
        if (allClassIds.length > 0) {
            const { data: counts } = await supabase
                .from('class_students')
                .select('class_id')
                .in('class_id', allClassIds);

            // Count students per class
            counts?.forEach(row => {
                studentCounts[row.class_id] = (studentCounts[row.class_id] || 0) + 1;
            });
        }

        // Transform data để có student_count cho mỗi class
        const transformed = data?.map(session => ({
            ...session,
            classes: session.classes?.map(cls => ({
                ...cls,
                student_count: studentCounts[cls.id] || 0
            }))
        }));

        return transformed;
    },

    /**
     * Lấy chi tiết session với related data
     */
    getById: async (id) => {
        const { data, error } = await supabase
            .from('sessions')
            .select(`
                *,
                classes (
                    id,
                    code,
                    name,
                    max_students,
                    created_at
                ),
                grading_criteria (
                    id,
                    grader_role,
                    criteria
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Tạo session mới
     */
    create: async (data) => {
        const { data: session, error } = await supabase
            .from('sessions')
            .insert({
                ...data,
                created_by: (await supabase.auth.getUser()).data.user?.id,
            })
            .select()
            .single();

        if (error) throw error;
        return session;
    },

    /**
     * Cập nhật session
     */
    update: async (id, data) => {
        const { data: session, error } = await supabase
            .from('sessions')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return session;
    },

    /**
     * Xóa session
     */
    delete: async (id) => {
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Lấy statistics cho một session
     */
    getStats: async (sessionId) => {
        // Lấy tổng số lớp
        const { count: classCount } = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId);

        // Lấy tổng số sinh viên trong session
        const { data: classes } = await supabase
            .from('classes')
            .select('id')
            .eq('session_id', sessionId);

        const classIds = classes?.map(c => c.id) || [];

        let studentCount = 0;
        let topicStats = { total: 0, pending: 0, approved: 0, in_progress: 0, rejected: 0 };

        if (classIds.length > 0) {
            // Đếm sinh viên
            const { count } = await supabase
                .from('class_students')
                .select('*', { count: 'exact', head: true })
                .in('class_id', classIds);
            studentCount = count || 0;

            // Đếm topics theo status
            const { data: topics } = await supabase
                .from('topics')
                .select('status')
                .in('class_id', classIds);

            if (topics) {
                topicStats.total = topics.length;
                topics.forEach(t => {
                    if (topicStats[t.status] !== undefined) {
                        topicStats[t.status]++;
                    }
                });
            }
        }

        return {
            classCount: classCount || 0,
            studentCount,
            topicStats,
        };
    },

    /**
     * Duplicate session (copy sang năm mới)
     */
    duplicate: async (id, newData) => {
        const original = await sessionsService.getById(id);
        if (!original) throw new Error('Session not found');

        const { id: _, created_at, updated_at, classes, grading_criteria, ...rest } = original;

        return sessionsService.create({
            ...rest,
            ...newData,
            status: 'draft',
        });
    },
};

export default sessionsService;
