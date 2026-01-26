import { supabase } from '../lib/supabase';

/**
 * Stats Service - Dashboard statistics
 */
export const statsService = {
    /**
     * Lấy thống kê tổng quan cho Admin Dashboard
     */
    getAdminDashboardStats: async (sessionId = null) => {
        try {
            console.log('[Stats] Fetching stats for sessionId:', sessionId);
            
            // Get classes and classIds based on session filter
            let classIds = [];
            let totalClasses = 0;
            
            if (sessionId) {
                // Filter by session
                const { data: sessionClasses, count } = await supabase
                    .from('classes')
                    .select('id', { count: 'exact' })
                    .eq('session_id', sessionId);
                
                classIds = sessionClasses?.map(c => c.id) || [];
                totalClasses = count || 0;
                console.log('[Stats] Session classes:', classIds.length);
                
                if (classIds.length === 0) {
                    // No classes in this session
                    return {
                        totalStudents: 0,
                        totalTeachers: 0,
                        totalClasses: 0,
                        topicStats: { total: 0, pending: 0, revision: 0, approved: 0, in_progress: 0, submitted: 0, defended: 0, completed: 0, rejected: 0 },
                        registrationRate: 0,
                    };
                }
            } else {
                // No session filter - get all classes
                const { count } = await supabase
                    .from('classes')
                    .select('id', { count: 'exact', head: true });
                totalClasses = count || 0;
            }

            // Build queries based on whether we have a session filter
            let topicsQuery = supabase.from('topics').select('status, class_id');
            let studentsQuery = supabase.from('class_students').select('student_id', { count: 'exact' });
            
            if (sessionId && classIds.length > 0) {
                topicsQuery = topicsQuery.in('class_id', classIds);
                studentsQuery = studentsQuery.in('class_id', classIds);
            }

            // Execute queries in parallel
            const [
                { data: topics },
                { count: totalStudents },
                { count: totalTeachers },
            ] = await Promise.all([
                topicsQuery,
                studentsQuery,
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
            ]);

            console.log('[Stats] Results - Classes:', totalClasses, 'Topics:', topics?.length, 'Teachers:', totalTeachers, 'Students:', totalStudents);

            // Calculate topic stats
            const topicStats = {
                total: topics?.length || 0,
                pending: 0,
                revision: 0,
                approved: 0,
                in_progress: 0,
                submitted: 0,
                defended: 0,
                completed: 0,
                rejected: 0,
            };

            topics?.forEach(t => {
                if (topicStats[t.status] !== undefined) {
                    topicStats[t.status]++;
                }
            });

            console.log('[Stats] Topic stats:', topicStats);

            const studentCount = totalStudents || 0;
            return {
                totalStudents: studentCount,
                totalTeachers: totalTeachers || 0,
                totalClasses: totalClasses,
                topicStats,
                registrationRate: studentCount > 0 
                    ? Math.round((topicStats.total / studentCount) * 100) 
                    : 0,
            };
        } catch (error) {
            console.error('[Stats] Error fetching admin stats:', error);
            throw error;
        }
    },

    /**
     * Lấy hoạt động gần đây
     */
    getRecentActivities: async (limit = 10) => {
        try {
            // Lấy topics mới đăng ký/cập nhật gần đây
            const { data: recentTopics } = await supabase
                .from('topics')
                .select(`
                    id,
                    title,
                    status,
                    created_at,
                    updated_at,
                    student:profiles!topics_student_id_fkey(full_name, email)
                `)
                .order('updated_at', { ascending: false })
                .limit(limit);

            // Lấy notifications gần đây
            const { data: recentNotifications } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            // Merge và sort
            const activities = [
                ...(recentTopics?.map(t => ({
                    id: t.id,
                    type: 'topic',
                    action: getTopicAction(t.status),
                    title: t.title,
                    actor: t.student?.full_name || 'Unknown',
                    timestamp: t.updated_at,
                    status: t.status,
                })) || []),
            ];

            // Sort by timestamp
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return activities.slice(0, limit);
        } catch (error) {
            console.error('Error fetching recent activities:', error);
            return [];
        }
    },

    /**
     * Lấy danh sách sessions đang mở để chọn
     */
    getActiveSessions: async () => {
        const { data, error } = await supabase
            .from('sessions')
            .select('id, name, academic_year, semester, status')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Lấy deadlines sắp tới
     */
    getUpcomingDeadlines: async (sessionId) => {
        if (!sessionId) return [];

        const { data: session } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (!session) return [];

        const now = new Date();
        const deadlines = [];

        const deadlineFields = [
            { key: 'registration_end', label: 'Hạn đăng ký đề tài' },
            { key: 'report1_deadline', label: 'Nộp báo cáo tiến độ 1' },
            { key: 'report2_deadline', label: 'Nộp báo cáo tiến độ 2' },
            { key: 'final_deadline', label: 'Nộp báo cáo cuối' },
            { key: 'defense_start', label: 'Bắt đầu bảo vệ' },
        ];

        deadlineFields.forEach(({ key, label }) => {
            if (session[key]) {
                const date = new Date(session[key]);
                const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
                
                deadlines.push({
                    key,
                    label,
                    date: session[key],
                    daysLeft,
                    isPast: daysLeft < 0,
                    isUrgent: daysLeft >= 0 && daysLeft <= 7,
                });
            }
        });

        // Sort by date
        deadlines.sort((a, b) => new Date(a.date) - new Date(b.date));

        return deadlines;
    },
};

// Helper function
function getTopicAction(status) {
    const actions = {
        pending: 'đăng ký đề tài',
        revision: 'cần chỉnh sửa đề tài',
        approved: 'được duyệt đề tài',
        in_progress: 'bắt đầu thực hiện',
        submitted: 'nộp báo cáo',
        defended: 'đã bảo vệ',
        completed: 'hoàn thành đồ án',
        rejected: 'bị từ chối đề tài',
    };
    return actions[status] || 'cập nhật đề tài';
}

export default statsService;
