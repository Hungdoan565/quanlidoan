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
     * Lấy cảnh báo cho Admin Dashboard
     */
    getAdminAlerts: async (sessionId = null) => {
        try {
            const classQuery = supabase
                .from('classes')
                .select('id, name, code, session:session_id(id, report1_deadline, report2_deadline, final_deadline)');

            if (sessionId) {
                classQuery.eq('session_id', sessionId);
            }

            const { data: classes, error: classError } = await classQuery;
            if (classError) throw classError;

            const classIds = classes?.map(c => c.id) || [];
            if (classIds.length === 0) {
                return {
                    missingLogbook: { count: 0, items: [] },
                    overdueReports: { count: 0, items: [] },
                };
            }

            const topicStatuses = ['approved', 'in_progress', 'submitted', 'defended', 'completed'];
            const { data: topics, error: topicsError } = await supabase
                .from('topics')
                .select(`
                    id,
                    title,
                    status,
                    approved_at,
                    created_at,
                    class_id,
                    student:student_id(id, full_name, student_code),
                    class:class_id(
                        id,
                        name,
                        code,
                        session:session_id(id, report1_deadline, report2_deadline, final_deadline)
                    )
                `)
                .in('class_id', classIds)
                .in('status', topicStatuses);

            if (topicsError) throw topicsError;

            const topicList = topics || [];
            if (topicList.length === 0) {
                return {
                    missingLogbook: { count: 0, items: [] },
                    overdueReports: { count: 0, items: [] },
                };
            }

            const topicIds = topicList.map(t => t.id);
            const [logbookResult, reportResult] = await Promise.all([
                supabase
                    .from('logbook_entries')
                    .select('topic_id, week_number, status, submitted_at, created_at')
                    .in('topic_id', topicIds),
                supabase
                    .from('reports')
                    .select('topic_id, phase, submitted_at')
                    .in('topic_id', topicIds)
                    .in('phase', ['report1', 'report2', 'final']),
            ]);

            if (logbookResult.error) throw logbookResult.error;
            if (reportResult.error) throw reportResult.error;

            const logbookEntries = logbookResult.data || [];
            const reports = reportResult.data || [];

            const entriesByTopic = new Map();
            logbookEntries.forEach(entry => {
                if (!entriesByTopic.has(entry.topic_id)) {
                    entriesByTopic.set(entry.topic_id, []);
                }
                entriesByTopic.get(entry.topic_id).push(entry);
            });

            const reportsByTopic = new Map();
            reports.forEach(report => {
                if (!reportsByTopic.has(report.topic_id)) {
                    reportsByTopic.set(report.topic_id, new Set());
                }
                reportsByTopic.get(report.topic_id).add(report.phase);
            });

            const now = new Date();
            const missingLogbookItems = [];
            const overdueReportItems = [];

            topicList.forEach(topic => {
                if (!topic.approved_at) return;

                const currentWeek = calculateWeekNumber(topic.approved_at);
                const entries = entriesByTopic.get(topic.id) || [];
                const hasSubmitted = entries.some(entry => entry.week_number === currentWeek && entry.status !== 'draft');
                if (!hasSubmitted) {
                    const latestEntry = entries.reduce((latest, entry) => {
                        if (!latest) return entry;
                        return new Date(entry.created_at) > new Date(latest.created_at) ? entry : latest;
                    }, null);

                    missingLogbookItems.push({
                        topicId: topic.id,
                        topicTitle: topic.title,
                        studentName: topic.student?.full_name || 'Chưa có tên',
                        studentCode: topic.student?.student_code || '',
                        classId: topic.class?.id || topic.class_id || null,
                        className: topic.class?.name || '',
                        classCode: topic.class?.code || '',
                        weekNumber: currentWeek,
                        lastEntryAt: latestEntry?.created_at || null,
                    });
                }

                const session = topic.class?.session;
                const phaseDeadlines = [
                    { key: 'report1', label: 'Báo cáo tiến độ 1', deadline: session?.report1_deadline },
                    { key: 'report2', label: 'Báo cáo tiến độ 2', deadline: session?.report2_deadline },
                    { key: 'final', label: 'Báo cáo cuối', deadline: session?.final_deadline },
                ];

                const submittedPhases = reportsByTopic.get(topic.id) || new Set();
                phaseDeadlines.forEach(phase => {
                    if (!phase.deadline) return;
                    const deadlineDate = new Date(phase.deadline);
                    if (now > deadlineDate && !submittedPhases.has(phase.key)) {
                        const daysLate = Math.ceil((now - deadlineDate) / (1000 * 60 * 60 * 24));
                        overdueReportItems.push({
                            topicId: topic.id,
                            topicTitle: topic.title,
                            studentName: topic.student?.full_name || 'Chưa có tên',
                            studentCode: topic.student?.student_code || '',
                            classId: topic.class?.id || topic.class_id || null,
                            className: topic.class?.name || '',
                            classCode: topic.class?.code || '',
                            phase: phase.key,
                            phaseLabel: phase.label,
                            deadline: phase.deadline,
                            daysLate,
                        });
                    }
                });
            });

            const sortedMissingLogbook = missingLogbookItems.sort((a, b) => {
                const classCompare = `${a.classCode}${a.className}`.localeCompare(`${b.classCode}${b.className}`, 'vi', {
                    numeric: true,
                    sensitivity: 'base',
                });
                if (classCompare !== 0) return classCompare;
                return a.studentCode.localeCompare(b.studentCode, 'vi', { numeric: true, sensitivity: 'base' });
            });

            const sortedOverdueReports = overdueReportItems.sort((a, b) => b.daysLate - a.daysLate);

            return {
                missingLogbook: {
                    count: missingLogbookItems.length,
                    items: sortedMissingLogbook,
                },
                overdueReports: {
                    count: overdueReportItems.length,
                    items: sortedOverdueReports,
                },
            };
        } catch (error) {
            console.error('[Stats] Error fetching admin alerts:', error);
            return {
                missingLogbook: { count: 0, items: [] },
                overdueReports: { count: 0, items: [] },
            };
        }
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

function calculateWeekNumber(approvedAt) {
    if (!approvedAt) return 1;
    const approved = new Date(approvedAt);
    const now = new Date();
    const diffMs = now - approved;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, diffWeeks + 1);
}

export default statsService;
