import { supabase } from '../lib/supabase';

/**
 * Logbook Service - Nhật ký Đồ án
 */
export const logbookService = {
    // =====================================================
    // STUDENT METHODS
    // =====================================================

    /**
     * Get all logbook entries for a topic
     */
    getEntriesByTopic: async (topicId) => {
        const { data, error } = await supabase
            .from('logbook_entries')
            .select('*')
            .eq('topic_id', topicId)
            .order('week_number', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get my topic with logbook summary (for student)
     */
    getMyTopicWithLogbook: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // First get the topic
        const { data: topic, error } = await supabase
            .from('topics')
            .select(`
                *,
                class:class_id(name, session:session_id(name)),
                advisor:advisor_id(full_name),
                reviewer:reviewer_id(full_name)
            `)
            .eq('student_id', user.id)
            .in('status', ['approved', 'in_progress', 'submitted'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!topic) return null;

        // Then get logbook entries separately (gracefully handle if table doesn't exist)
        let entries = [];
        try {
            const { data } = await supabase
                .from('logbook_entries')
                .select('id, week_number, created_at, teacher_confirmed')
                .eq('topic_id', topic.id)
                .order('week_number', { ascending: false });
            entries = data || [];
        } catch (e) {
            console.warn('logbook_entries table may not exist:', e.message);
        }

        return {
            ...topic,
            logbook_entries: entries
        };
    },

    /**
     * Create new logbook entry
     */
    createEntry: async (topicId, data) => {
        const { weekNumber, content, meetingDate } = data;

        // Check if entry for this week already exists
        const { data: existing } = await supabase
            .from('logbook_entries')
            .select('id')
            .eq('topic_id', topicId)
            .eq('week_number', weekNumber)
            .maybeSingle();

        if (existing) {
            throw new Error('Đã có nhật ký cho tuần này. Vui lòng chỉnh sửa thay vì tạo mới.');
        }

        const { data: entry, error } = await supabase
            .from('logbook_entries')
            .insert({
                topic_id: topicId,
                week_number: weekNumber,
                content: content,
                meeting_date: meetingDate || null,
            })
            .select()
            .single();

        if (error) throw error;
        return entry;
    },

    /**
     * Update logbook entry (only if not confirmed by teacher)
     */
    updateEntry: async (entryId, updates) => {
        // First check if entry is confirmed
        const { data: existing } = await supabase
            .from('logbook_entries')
            .select('teacher_confirmed')
            .eq('id', entryId)
            .single();

        if (existing?.teacher_confirmed) {
            throw new Error('Không thể chỉnh sửa nhật ký đã được GV xác nhận.');
        }

        const { data, error } = await supabase
            .from('logbook_entries')
            .update({
                content: updates.content,
                meeting_date: updates.meetingDate,
                updated_at: new Date().toISOString(),
            })
            .eq('id', entryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Calculate current week number from topic approval date
     */
    calculateWeekNumber: (approvedAt) => {
        if (!approvedAt) return 1;
        const approved = new Date(approvedAt);
        const now = new Date();
        const diffMs = now - approved;
        const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
        return Math.max(1, diffWeeks + 1); // Week 1 starts from approval
    },

    // =====================================================
    // TEACHER METHODS
    // =====================================================

    /**
     * Get all students I advise with their logbook summary
     */
    getMyStudentsWithLogbook: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get topics first
        const { data: topics, error } = await supabase
            .from('topics')
            .select(`
                id,
                title,
                status,
                approved_at,
                student:student_id(id, full_name, student_code, email),
                class:class_id(name, session:session_id(name))
            `)
            .eq('advisor_id', user.id)
            .in('status', ['approved', 'in_progress', 'submitted'])
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!topics || topics.length === 0) return [];

        // Get logbook entries for all topics (gracefully handle if table doesn't exist)
        let allEntries = [];
        try {
            const topicIds = topics.map(t => t.id);
            const { data } = await supabase
                .from('logbook_entries')
                .select('id, topic_id, week_number, teacher_confirmed, created_at')
                .in('topic_id', topicIds);
            allEntries = data || [];
        } catch (e) {
            console.warn('logbook_entries table may not exist:', e.message);
        }

        // Calculate logbook stats for each topic
        return topics.map(topic => {
            const entries = allEntries.filter(e => e.topic_id === topic.id);
            const confirmedCount = entries.filter(e => e.teacher_confirmed).length;
            const totalWeeks = logbookService.calculateWeekNumber(topic.approved_at);
            const lastEntry = entries.length > 0
                ? entries.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b)
                : null;

            return {
                ...topic,
                logbook_entries: entries,
                logbook_stats: {
                    total_entries: entries.length,
                    confirmed_entries: confirmedCount,
                    expected_weeks: totalWeeks,
                    last_entry_at: lastEntry?.created_at || null,
                    completion_rate: totalWeeks > 0 ? Math.round((entries.length / totalWeeks) * 100) : 0,
                }
            };
        });
    },

    /**
     * Get detailed logbook for a specific topic (teacher view)
     */
    getTopicLogbookDetail: async (topicId) => {
        // Get topic first
        const { data: topic, error } = await supabase
            .from('topics')
            .select(`
                id,
                title,
                status,
                approved_at,
                student:student_id(id, full_name, student_code, email),
                class:class_id(name)
            `)
            .eq('id', topicId)
            .single();

        if (error) throw error;
        if (!topic) return null;

        // Get logbook entries separately (gracefully handle if table doesn't exist)
        let entries = [];
        try {
            const { data } = await supabase
                .from('logbook_entries')
                .select('*')
                .eq('topic_id', topicId)
                .order('week_number', { ascending: false });
            entries = data || [];
        } catch (e) {
            console.warn('logbook_entries table may not exist:', e.message);
        }

        return {
            ...topic,
            logbook_entries: entries
        };
    },

    /**
     * Add teacher note to logbook entry
     */
    addTeacherNote: async (entryId, note) => {
        const { data, error } = await supabase
            .from('logbook_entries')
            .update({
                teacher_note: note,
                updated_at: new Date().toISOString(),
            })
            .eq('id', entryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Confirm meeting for logbook entry
     */
    confirmMeeting: async (entryId, meetingDate) => {
        const { data, error } = await supabase
            .from('logbook_entries')
            .update({
                teacher_confirmed: true,
                meeting_date: meetingDate || new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', entryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Unconfirm meeting (in case of mistake)
     */
    unconfirmMeeting: async (entryId) => {
        const { data, error } = await supabase
            .from('logbook_entries')
            .update({
                teacher_confirmed: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', entryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

export default logbookService;
