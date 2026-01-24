import { supabase } from '../lib/supabase';

/**
 * Teacher Service - Teacher-specific operations
 */
export const teacherService = {
    /**
     * Lấy thống kê cho Teacher Dashboard
     */
    getTeacherDashboardStats: async (teacherId) => {
        try {
            // Lấy số sinh viên đang hướng dẫn (Unified Lecturer - chỉ có advisor)
            const { count: guidingCount } = await supabase
                .from('topics')
                .select('*', { count: 'exact', head: true })
                .eq('advisor_id', teacherId)
                .in('status', ['approved', 'in_progress', 'submitted']);

            // Lấy số đề tài chờ duyệt
            const { data: pendingTopics } = await supabase
                .from('topics')
                .select('id')
                .eq('advisor_id', teacherId)
                .eq('status', 'pending');

            // Lấy số báo cáo cần chấm (Unified - advisor chấm tất cả)
            const { count: pendingGrades } = await supabase
                .from('topics')
                .select('*', { count: 'exact', head: true })
                .eq('advisor_id', teacherId)
                .eq('status', 'submitted');

            // Lấy số đề tài hoàn thành
            const { count: completedCount } = await supabase
                .from('topics')
                .select('*', { count: 'exact', head: true })
                .eq('advisor_id', teacherId)
                .eq('status', 'completed');

            return {
                guidingStudents: guidingCount || 0,
                pendingApproval: pendingTopics?.length || 0,
                pendingGrades: pendingGrades || 0,
                completedTopics: completedCount || 0,
            };
        } catch (error) {
            console.error('Error fetching teacher stats:', error);
            throw error;
        }
    },

    /**
     * Lấy danh sách việc cần làm
     */
    getTodoList: async (teacherId) => {
        try {
            const todos = [];

            // Đề tài chờ duyệt
            const { data: pendingTopics } = await supabase
                .from('topics')
                .select(`
                    id, title, created_at,
                    student:profiles!topics_student_id_fkey(full_name)
                `)
                .eq('advisor_id', teacherId)
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(5);

            pendingTopics?.forEach(topic => {
                todos.push({
                    id: `pending-${topic.id}`,
                    type: 'pending_approval',
                    icon: 'AlertCircle',
                    title: 'Đề tài chờ duyệt',
                    description: `${topic.student?.full_name}: "${topic.title}"`,
                    link: `/teacher/reviews/${topic.id}`,
                    priority: 'high',
                    createdAt: topic.created_at,
                });
            });

            // Báo cáo cần chấm (Unified - chỉ advisor)
            const { data: submittedTopics } = await supabase
                .from('topics')
                .select(`
                    id, title,
                    student:profiles!topics_student_id_fkey(full_name)
                `)
                .eq('advisor_id', teacherId)
                .eq('status', 'submitted')
                .limit(5);

            submittedTopics?.forEach(topic => {
                todos.push({
                    id: `grading-${topic.id}`,
                    type: 'pending_grading',
                    icon: 'FileText',
                    title: 'Báo cáo cần chấm',
                    description: `${topic.student?.full_name}: "${topic.title}"`,
                    link: `/teacher/grading/${topic.id}`,
                    priority: 'medium',
                });
            });

            return todos;
        } catch (error) {
            console.error('Error fetching todo list:', error);
            return [];
        }
    },

    /**
     * Lấy danh sách sinh viên đang hướng dẫn
     */
    getGuidingStudents: async (teacherId) => {
        try {
            const { data, error } = await supabase
                .from('topics')
                .select(`
                    id, title, status, updated_at,
                    student:profiles!topics_student_id_fkey(id, full_name, email, student_id)
                `)
                .eq('advisor_id', teacherId)
                .in('status', ['approved', 'in_progress', 'submitted', 'defended'])
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching guiding students:', error);
            return [];
        }
    },

    /**
     * Lấy đề tài mẫu của giảng viên
     */
    getTemplateTopics: async (teacherId) => {
        try {
            const { data, error } = await supabase
                .from('template_topics')
                .select('*')
                .eq('teacher_id', teacherId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching template topics:', error);
            return [];
        }
    },

    // =========================================================
    // TOPIC REVIEW METHODS
    // =========================================================

    /**
     * Get topics pending review for current teacher
     * Returns topics where teacher is advisor OR reviewer
     */
    getMyPendingTopics: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('topics')
            .select(`
                *,
                student:student_id (
                    id,
                    full_name,
                    email,
                    student_code
                ),
                class:class_id (
                    id,
                    name,
                    code,
                    session:session_id (
                        id,
                        name,
                        academic_year,
                        semester
                    )
                ),
                sample_topic:sample_topic_id (
                    id,
                    title
                )
            `)
            .eq('advisor_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get all topics assigned to current teacher (any status)
     */
    getMyAllTopics: async (status = null) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        let query = supabase
            .from('topics')
            .select(`
                *,
                student:student_id (
                    id,
                    full_name,
                    email,
                    student_code
                ),
                class:class_id (
                    id,
                    name,
                    code
                )
            `)
            .eq('advisor_id', user.id)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    /**
     * Get single topic details for review
     */
    getTopicForReview: async (topicId) => {
        const { data, error } = await supabase
            .from('topics')
            .select(`
                *,
                student:student_id (
                    id,
                    full_name,
                    email,
                    student_code,
                    phone
                ),
                class:class_id (
                    id,
                    name,
                    code,
                    session:session_id (
                        id,
                        name,
                        academic_year,
                        semester,
                        registration_end
                    )
                ),
                advisor:advisor_id (
                    id,
                    full_name,
                    teacher_code
                ),
                sample_topic:sample_topic_id (
                    id,
                    title,
                    description
                )
            `)
            .eq('id', topicId)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Approve a topic
     */
    approveTopic: async (topicId) => {
        const { data, error } = await supabase
            .from('topics')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                revision_note: null,
                rejection_reason: null
            })
            .eq('id', topicId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Bulk approve multiple topics
     */
    bulkApproveTopics: async (topicIds) => {
        if (!topicIds || topicIds.length === 0) {
            throw new Error('Không có đề tài nào được chọn');
        }

        const { data, error } = await supabase
            .from('topics')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                revision_note: null,
                rejection_reason: null
            })
            .in('id', topicIds)
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Request revision for a topic
     */
    requestRevision: async (topicId, note) => {
        if (!note?.trim()) {
            throw new Error('Vui lòng nhập nội dung yêu cầu chỉnh sửa');
        }

        const { data, error } = await supabase
            .from('topics')
            .update({
                status: 'revision',
                revision_note: note.trim(),
                rejection_reason: null
            })
            .eq('id', topicId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Reject a topic
     */
    rejectTopic: async (topicId, reason) => {
        if (!reason?.trim()) {
            throw new Error('Vui lòng nhập lý do từ chối');
        }

        const { data, error } = await supabase
            .from('topics')
            .update({
                status: 'rejected',
                rejection_reason: reason.trim(),
                revision_note: null
            })
            .eq('id', topicId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // =========================================================
    // MY CLASSES - Teacher's assigned classes
    // =========================================================

    /**
     * Lấy danh sách lớp mà teacher được phân công làm advisor
     * Includes: student count, topic registration stats
     */
    getMyClasses: async (teacherId) => {
        try {
            // Get classes where teacher is advisor
            const { data: classes, error } = await supabase
                .from('classes')
                .select(`
                    id, code, name, max_students, created_at,
                    session:sessions(id, name, academic_year, semester, session_type, status),
                    class_students(count)
                `)
                .eq('advisor_id', teacherId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get topic counts per class
            const classIds = classes?.map(c => c.id) || [];
            let topicStats = {};

            if (classIds.length > 0) {
                const { data: topics } = await supabase
                    .from('topics')
                    .select('class_id, status')
                    .in('class_id', classIds);

                // Aggregate topic stats per class
                topics?.forEach(t => {
                    if (!topicStats[t.class_id]) {
                        topicStats[t.class_id] = { total: 0, approved: 0, pending: 0, in_progress: 0 };
                    }
                    topicStats[t.class_id].total++;
                    if (t.status === 'approved') topicStats[t.class_id].approved++;
                    if (t.status === 'pending') topicStats[t.class_id].pending++;
                    if (t.status === 'in_progress') topicStats[t.class_id].in_progress++;
                });
            }

            // Transform data
            return classes?.map(cls => ({
                ...cls,
                student_count: cls.class_students?.[0]?.count || 0,
                topics_registered: topicStats[cls.id]?.total || 0,
                topics_approved: topicStats[cls.id]?.approved || 0,
                topics_pending: topicStats[cls.id]?.pending || 0,
                topics_in_progress: topicStats[cls.id]?.in_progress || 0,
            })) || [];
        } catch (error) {
            console.error('Error fetching my classes:', error);
            return [];
        }
    },

    /**
     * Lấy chi tiết lớp với danh sách sinh viên (bao gồm cả SV chưa đăng ký đề tài)
     * Security: Chỉ trả về nếu teacher là advisor của lớp
     */
    getClassStudents: async (classId, teacherId) => {
        try {
            // Get class with security check
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .select(`
                    id, code, name, max_students,
                    session:sessions(id, name, academic_year, semester, session_type, status),
                    class_students(
                        id,
                        student:profiles(
                            id, full_name, student_code, email, phone, gender, class_name
                        ),
                        created_at
                    )
                `)
                .eq('id', classId)
                .eq('advisor_id', teacherId)
                .single();

            if (classError) {
                if (classError.code === 'PGRST116') {
                    throw new Error('Bạn không có quyền xem lớp này');
                }
                throw classError;
            }

            // Get topics for students in this class
            const studentIds = classData?.class_students?.map(cs => cs.student?.id).filter(Boolean) || [];
            let topicsMap = {};

            if (studentIds.length > 0) {
                const { data: topics } = await supabase
                    .from('topics')
                    .select('id, student_id, title, status, updated_at')
                    .eq('class_id', classId);

                topics?.forEach(t => {
                    topicsMap[t.student_id] = t;
                });
            }

            // Transform data - keep original import order (by joined_at)
            return {
                ...classData,
                students: classData?.class_students
                    ?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                    ?.map(cs => ({
                        ...cs.student,
                        joined_at: cs.created_at,
                        topic: topicsMap[cs.student?.id] || null,
                    })) || [],
            };
        } catch (error) {
            console.error('Error fetching class students:', error);
            throw error;
        }
    },

    /**
     * Get topic statistics for current teacher
     */
    getMyTopicStats: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('topics')
            .select('status')
            .eq('advisor_id', user.id);

        if (error) throw error;

        const stats = {
            total: data?.length || 0,
            pending: 0,
            revision: 0,
            approved: 0,
            in_progress: 0,
            submitted: 0,
            completed: 0,
            rejected: 0
        };

        data?.forEach(topic => {
            if (stats.hasOwnProperty(topic.status)) {
                stats[topic.status]++;
            }
        });

        return stats;
    },
};

export default teacherService;
