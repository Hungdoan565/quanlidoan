import { supabase } from '../lib/supabase';

/**
 * Logbook Service - Nhật ký Đồ án (Enhanced with structured schema)
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

        // First get the topic (Unified Lecturer - no reviewer)
        const { data: topic, error } = await supabase
            .from('topics')
            .select(`
                *,
                class:class_id(name, session:session_id(name)),
                advisor:advisor_id(full_name, teacher_code, email, avatar_url)
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
                .select('id, week_number, status, created_at, submitted_at, teacher_confirmed')
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
     * Create new logbook entry (structured)
     * RLS requires student_id = auth.uid() for INSERT
     */
    createEntry: async (topicId, data) => {
        const {
            weekNumber,
            startDate,
            endDate,
            meetingDate,
            meetingType = 'offline',
            completedTasks = [],
            inProgressTasks = [],
            plannedTasks = [],
            issues = '',
            attachments = [],
            status = 'draft',
        } = data;

        // Get current user for RLS compliance
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

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

        // Build legacy content for backward compatibility
        const legacyContent = logbookService.buildLegacyContent({
            completedTasks,
            inProgressTasks,
            plannedTasks,
            issues,
        });

        const insertData = {
            topic_id: topicId,
            // student_id is derived from topic, not needed in insert
            week_number: weekNumber,
            start_date: startDate || null,
            end_date: endDate || null,
            meeting_date: meetingDate || null,
            meeting_type: meetingType,
            completed_tasks: completedTasks,
            in_progress_tasks: inProgressTasks,
            planned_tasks: plannedTasks,
            issues: issues || null,
            attachments: attachments,
            status: status,
            content: legacyContent, // Keep for backward compatibility
            submitted_at: status === 'pending' ? new Date().toISOString() : null,
        };

        const { data: entry, error } = await supabase
            .from('logbook_entries')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        return entry;
    },

    /**
     * Update logbook entry (only if draft or needs_revision)
     */
    updateEntry: async (entryId, updates) => {
        // First check if entry can be edited
        const { data: existing } = await supabase
            .from('logbook_entries')
            .select('status, teacher_confirmed')
            .eq('id', entryId)
            .single();

        if (!existing) {
            throw new Error('Không tìm thấy nhật ký.');
        }

        // Check if editable based on new status workflow
        if (existing.status === 'approved' || existing.teacher_confirmed) {
            throw new Error('Không thể chỉnh sửa nhật ký đã được duyệt.');
        }

        if (existing.status === 'pending') {
            throw new Error('Không thể chỉnh sửa nhật ký đang chờ duyệt. Hãy liên hệ GV để yêu cầu sửa.');
        }

        // Build update object
        const updateData = {
            updated_at: new Date().toISOString(),
        };

        // Map allowed fields
        if (updates.meetingDate !== undefined) updateData.meeting_date = updates.meetingDate;
        if (updates.meetingType !== undefined) updateData.meeting_type = updates.meetingType;
        if (updates.completedTasks !== undefined) updateData.completed_tasks = updates.completedTasks;
        if (updates.inProgressTasks !== undefined) updateData.in_progress_tasks = updates.inProgressTasks;
        if (updates.plannedTasks !== undefined) updateData.planned_tasks = updates.plannedTasks;
        if (updates.issues !== undefined) updateData.issues = updates.issues;
        if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
        if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
        if (updates.endDate !== undefined) updateData.end_date = updates.endDate;

        // Handle status change
        if (updates.status !== undefined) {
            updateData.status = updates.status;
            if (updates.status === 'pending') {
                updateData.submitted_at = new Date().toISOString();
            }
        }

        // Build legacy content for backward compatibility
        if (updates.completedTasks || updates.inProgressTasks || updates.plannedTasks || updates.issues) {
            updateData.content = logbookService.buildLegacyContent({
                completedTasks: updates.completedTasks || existing.completed_tasks || [],
                inProgressTasks: updates.inProgressTasks || existing.in_progress_tasks || [],
                plannedTasks: updates.plannedTasks || existing.planned_tasks || [],
                issues: updates.issues || existing.issues || '',
            });
        }

        const { data, error } = await supabase
            .from('logbook_entries')
            .update(updateData)
            .eq('id', entryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Submit entry for review (change status to pending)
     */
    submitEntry: async (entryId) => {
        const { data, error } = await supabase
            .from('logbook_entries')
            .update({
                status: 'pending',
                submitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', entryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Save as draft (does not submit for review)
     */
    saveDraft: async (entryId, updates) => {
        return logbookService.updateEntry(entryId, { ...updates, status: 'draft' });
    },

    /**
     * Build legacy content string from structured data
     */
    buildLegacyContent: ({ completedTasks, inProgressTasks, plannedTasks, issues }) => {
        let content = '';

        if (completedTasks?.length > 0) {
            content += '• Đã hoàn thành:\n';
            completedTasks.forEach(task => {
                content += `  - ${task}\n`;
            });
        }

        if (inProgressTasks?.length > 0) {
            content += '\n• Đang thực hiện:\n';
            inProgressTasks.forEach(item => {
                const task = typeof item === 'string' ? item : item.task;
                const progress = typeof item === 'object' ? item.progress : 0;
                content += `  - ${task} (${progress}%)\n`;
            });
        }

        if (plannedTasks?.length > 0) {
            content += '\n• Kế hoạch tuần sau:\n';
            plannedTasks.forEach(task => {
                content += `  - ${task}\n`;
            });
        }

        if (issues) {
            content += `\n• Khó khăn gặp phải:\n${issues}`;
        }

        return content.trim();
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

    /**
     * Calculate week date range
     */
    getWeekDateRange: (approvedAt, weekNumber) => {
        if (!approvedAt) return { startDate: null, endDate: null };
        
        const start = new Date(approvedAt);
        start.setDate(start.getDate() + (weekNumber - 1) * 7);
        
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
        };
    },

    // =====================================================
    // FILE UPLOAD METHODS
    // =====================================================

    /**
     * Upload attachment file
     */
    uploadAttachment: async (topicId, file) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Generate unique file path
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${topicId}/${timestamp}_${safeName}`;

        const { error } = await supabase.storage
            .from('logbook-attachments')
            .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('logbook-attachments')
            .getPublicUrl(filePath);

        return {
            name: file.name,
            url: urlData.publicUrl,
            path: filePath,
            size: file.size,
            type: file.type,
        };
    },

    /**
     * Delete attachment file
     */
    deleteAttachment: async (filePath) => {
        const { error } = await supabase.storage
            .from('logbook-attachments')
            .remove([filePath]);

        if (error) throw error;
        return true;
    },

    /**
     * Download attachment file (using signed URL for private bucket)
     */
    downloadAttachment: async (attachment) => {
        const { path, name } = attachment;
        
        if (!path) {
            // If no path, try using the URL directly (legacy support)
            if (attachment.url) {
                const link = document.createElement('a');
                link.href = attachment.url;
                link.download = name || 'attachment';
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return true;
            }
            throw new Error('Không tìm thấy đường dẫn tệp');
        }

        // Generate signed URL (1 hour expiry)
        const { data, error } = await supabase.storage
            .from('logbook-attachments')
            .createSignedUrl(path, 3600);

        if (error) throw error;

        // Trigger browser download
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = name || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
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
                student:student_id(id, full_name, student_code, email, avatar_url),
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
                .select('id, topic_id, week_number, status, teacher_confirmed, created_at, submitted_at')
                .in('topic_id', topicIds);
            allEntries = data || [];
        } catch (e) {
            console.warn('logbook_entries table may not exist:', e.message);
        }

        // Calculate logbook stats for each topic
        return topics.map(topic => {
            const entries = allEntries.filter(e => e.topic_id === topic.id);
            const approvedCount = entries.filter(e => e.status === 'approved' || e.teacher_confirmed).length;
            const pendingCount = entries.filter(e => e.status === 'pending').length;
            const totalWeeks = logbookService.calculateWeekNumber(topic.approved_at);
            const lastEntry = entries.length > 0
                ? entries.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b)
                : null;

            return {
                ...topic,
                logbook_entries: entries,
                logbook_stats: {
                    total_entries: entries.length,
                    approved_entries: approvedCount,
                    pending_entries: pendingCount,
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
        // Get topic first (including repo_url for teacher view)
        const { data: topic, error } = await supabase
            .from('topics')
            .select(`
                id,
                title,
                status,
                approved_at,
                repo_url,
                student:student_id(id, full_name, student_code, email, avatar_url),
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
     * Add teacher feedback to logbook entry
     */
    addFeedback: async (entryId, feedback, newStatus = null) => {
        const updateData = {
            feedback_comment: feedback,
            feedback_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // Also update status if provided
        if (newStatus) {
            updateData.status = newStatus;
            if (newStatus === 'approved') {
                updateData.teacher_confirmed = true;
            }
        }

        const { data, error } = await supabase
            .from('logbook_entries')
            .update(updateData)
            .eq('id', entryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Approve logbook entry
     */
    approveEntry: async (entryId, feedback = null) => {
        return logbookService.addFeedback(entryId, feedback, 'approved');
    },

    /**
     * Request revision for logbook entry
     */
    requestRevision: async (entryId, feedback) => {
        if (!feedback?.trim()) {
            throw new Error('Vui lòng nhập lý do yêu cầu sửa.');
        }
        return logbookService.addFeedback(entryId, feedback, 'needs_revision');
    },

    /**
     * Add teacher note to logbook entry (legacy support)
     */
    addTeacherNote: async (entryId, note) => {
        const { data, error } = await supabase
            .from('logbook_entries')
            .update({
                teacher_note: note,
                feedback_comment: note, // Also update new field
                feedback_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', entryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Confirm meeting for logbook entry (legacy support)
     */
    confirmMeeting: async (entryId, meetingDate) => {
        const { data, error } = await supabase
            .from('logbook_entries')
            .update({
                teacher_confirmed: true,
                status: 'approved',
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
                status: 'pending',
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
