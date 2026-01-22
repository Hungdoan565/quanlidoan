import { supabase } from '../lib/supabase';

/**
 * Student Service - Student-specific operations
 */
export const studentService = {
    /**
     * Lấy thông tin đề tài của sinh viên
     * Advisor/Reviewer được lấy từ class teacher_pairs (separate query)
     */
    getMyTopic: async (studentId) => {
        try {
            // 1. Get topic with class info
            const { data, error } = await supabase
                .from('topics')
                .select(`
                    *,
                    class:classes(
                        id, name, code,
                        session:sessions(*)
                    ),
                    sample_topic:sample_topics(id, title)
                `)
                .eq('student_id', studentId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (!data) return null;

            // 2. Fetch teacher_pairs separately (to avoid FK naming issues)  
            let advisor = null;
            let reviewer = null;

            if (data.class_id) {
                const { data: teacherPair } = await supabase
                    .from('teacher_pairs')
                    .select('id, advisor_id, reviewer_id')
                    .eq('class_id', data.class_id)
                    .maybeSingle();

                if (teacherPair) {
                    // Fetch advisor profile
                    if (teacherPair.advisor_id) {
                        const { data: advisorData } = await supabase
                            .from('profiles')
                            .select('id, full_name, teacher_code, email, phone')
                            .eq('id', teacherPair.advisor_id)
                            .single();
                        advisor = advisorData;
                    }
                    // Fetch reviewer profile
                    if (teacherPair.reviewer_id) {
                        const { data: reviewerData } = await supabase
                            .from('profiles')
                            .select('id, full_name, teacher_code, email, phone')
                            .eq('id', teacherPair.reviewer_id)
                            .single();
                        reviewer = reviewerData;
                    }
                }
            }

            return {
                ...data,
                advisor,
                reviewer,
            };
        } catch (error) {
            console.error('Error fetching student topic:', error);
            return null;
        }
    },

    /**
     * Lấy thống kê cho Student Dashboard
     */
    getStudentDashboardStats: async (studentId) => {
        try {
            // Lấy topic của sinh viên
            const topic = await studentService.getMyTopic(studentId);

            if (!topic) {
                return {
                    hasTopic: false,
                    topic: null,
                    progress: [],
                    nextDeadline: null,
                };
            }

            // Lấy session để tính deadline
            const session = topic.class?.session;

            // Tính progress timeline
            const progress = calculateProgress(topic, session);

            // Tìm deadline tiếp theo
            const nextDeadline = findNextDeadline(session);

            // Đếm số báo cáo đã nộp (giả lập - cần table reports)
            const reportsSubmitted = topic.status === 'submitted' || topic.status === 'defended' || topic.status === 'completed' ? 2 :
                topic.status === 'in_progress' ? 1 : 0;

            return {
                hasTopic: true,
                topic,
                progress,
                nextDeadline,
                reportsSubmitted,
                totalReports: 4, // Thường có 4 báo cáo
            };
        } catch (error) {
            console.error('Error fetching student stats:', error);
            throw error;
        }
    },

    /**
     * Lấy thông báo của sinh viên
     */
    getNotifications: async (studentId, limit = 5) => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    },
};

// Helper: Calculate progress steps
function calculateProgress(topic, session) {
    const steps = [
        { key: 'register', label: 'Đăng ký', status: 'completed' },
        { key: 'bc1', label: 'BC1', status: 'pending' },
        { key: 'bc2', label: 'BC2', status: 'pending' },
        { key: 'final', label: 'BC cuối', status: 'pending' },
        { key: 'defense', label: 'Bảo vệ', status: 'pending' },
    ];

    // Determine current step based on topic status
    const statusOrder = ['pending', 'revision', 'approved', 'in_progress', 'submitted', 'defended', 'completed'];
    const currentIndex = statusOrder.indexOf(topic.status);

    if (currentIndex >= 2) steps[1].status = 'completed'; // BC1
    if (currentIndex >= 3) steps[2].status = 'completed'; // BC2
    if (currentIndex >= 4) steps[3].status = 'completed'; // Final
    if (currentIndex >= 5) steps[4].status = 'completed'; // Defense

    // Mark current step
    if (currentIndex === 0 || currentIndex === 1) steps[0].status = 'current';
    else if (currentIndex === 2) steps[1].status = 'current';
    else if (currentIndex === 3) steps[2].status = 'current';
    else if (currentIndex === 4) steps[3].status = 'current';
    else if (currentIndex === 5) steps[4].status = 'current';

    // Add dates if session exists
    if (session) {
        if (session.registration_end) steps[0].date = formatDate(session.registration_end);
        if (session.report1_deadline) steps[1].date = formatDate(session.report1_deadline);
        if (session.report2_deadline) steps[2].date = formatDate(session.report2_deadline);
        if (session.final_deadline) steps[3].date = formatDate(session.final_deadline);
        if (session.defense_start) steps[4].date = formatDate(session.defense_start);
    }

    return steps;
}

// Helper: Find next deadline
function findNextDeadline(session) {
    if (!session) return null;

    const now = new Date();
    const deadlines = [
        { key: 'report1', label: 'Nộp báo cáo tiến độ 1', date: session.report1_deadline },
        { key: 'report2', label: 'Nộp báo cáo tiến độ 2', date: session.report2_deadline },
        { key: 'final', label: 'Nộp báo cáo cuối', date: session.final_deadline },
        { key: 'defense', label: 'Bảo vệ đồ án', date: session.defense_start },
    ].filter(d => d.date && new Date(d.date) > now);

    deadlines.sort((a, b) => new Date(a.date) - new Date(b.date));

    return deadlines[0] || null;
}

// Helper: Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default studentService;
