import { supabase } from '../lib/supabase';

/**
 * Reports Service - Submission Vault
 * Handles file uploads, versioning, and listing for student reports
 */

// Report phases theo migration
export const REPORT_PHASES = ['report1', 'report2', 'final', 'slide', 'source_code'];

// Allowed file types
const ALLOWED_TYPES = {
    report1: ['.pdf', '.doc', '.docx'],
    report2: ['.pdf', '.doc', '.docx'],
    final: ['.pdf', '.doc', '.docx'],
    slide: ['.pdf', '.ppt', '.pptx'],
    source_code: ['.zip', '.rar', '.7z'],
};

// Max file sizes (in bytes)
const MAX_FILE_SIZES = {
    report1: 50 * 1024 * 1024,    // 50MB
    report2: 50 * 1024 * 1024,    // 50MB
    final: 100 * 1024 * 1024,     // 100MB
    slide: 30 * 1024 * 1024,      // 30MB
    source_code: 100 * 1024 * 1024, // 100MB
};

export const reportsService = {
    /**
     * Get reports by topic ID
     */
    getByTopic: async (topicId) => {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('topic_id', topicId)
            .order('phase')
            .order('version', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get latest version of each phase for a topic
     */
    getLatestByTopic: async (topicId) => {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('topic_id', topicId)
            .order('version', { ascending: false });

        if (error) throw error;

        // Group by phase and get latest version
        const grouped = {};
        (data || []).forEach(report => {
            if (!grouped[report.phase]) {
                grouped[report.phase] = report;
            }
        });

        return REPORT_PHASES.map(phase => grouped[phase] || null);
    },

    /**
     * Get submission status for topic (for deadline checking)
     */
    getSubmissionStatus: async (topicId, sessionDeadlines) => {
        const reports = await reportsService.getByTopic(topicId);
        const now = new Date();

        return REPORT_PHASES.map(phase => {
            const phaseReports = reports.filter(r => r.phase === phase);
            const latestReport = phaseReports[0]; // Already sorted desc
            
            // Get deadline from session
            let deadline = null;
            if (phase === 'report1' && sessionDeadlines?.report1_deadline) {
                deadline = new Date(sessionDeadlines.report1_deadline);
            } else if (phase === 'report2' && sessionDeadlines?.report2_deadline) {
                deadline = new Date(sessionDeadlines.report2_deadline);
            } else if (phase === 'final' && sessionDeadlines?.final_deadline) {
                deadline = new Date(sessionDeadlines.final_deadline);
            }

            const isOverdue = deadline && now > deadline && !latestReport;

            return {
                phase,
                submitted: !!latestReport,
                latestVersion: latestReport?.version || 0,
                latestSubmittedAt: latestReport?.submitted_at,
                deadline,
                isOverdue,
                report: latestReport,
            };
        });
    },

    /**
     * Validate file before upload
     */
    validateFile: (file, phase) => {
        const allowedExts = ALLOWED_TYPES[phase];
        const maxSize = MAX_FILE_SIZES[phase];

        if (!allowedExts) {
            throw new Error(`Phase "${phase}" không hợp lệ`);
        }

        // Check file extension
        const fileName = file.name.toLowerCase();
        const hasValidExt = allowedExts.some(ext => fileName.endsWith(ext));
        if (!hasValidExt) {
            throw new Error(`File phải có định dạng: ${allowedExts.join(', ')}`);
        }

        // Check file size
        if (file.size > maxSize) {
            const maxMB = Math.round(maxSize / (1024 * 1024));
            throw new Error(`File không được vượt quá ${maxMB}MB`);
        }

        return true;
    },

    /**
     * Upload a report file
     * @param {Object} params - { topicId, phase, file, note }
     * @returns {Promise<Object>} - The created report record
     */
    upload: async ({ topicId, phase, file, note }) => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Chưa đăng nhập');

        // Validate file
        reportsService.validateFile(file, phase);

        // Get topic to verify ownership and get class info
        const { data: topic, error: topicError } = await supabase
            .from('topics')
            .select(`
                id, student_id, 
                class:class_id(
                    id, 
                    session:session_id(registration_end, report1_deadline, report2_deadline, final_deadline)
                )
            `)
            .eq('id', topicId)
            .single();

        if (topicError) throw topicError;
        if (topic.student_id !== user.id) {
            throw new Error('Bạn không có quyền nộp báo cáo cho đề tài này');
        }

        const session = topic.class?.session || null;
        if (session) {
            let openAt = null;
            switch (phase) {
                case 'report1':
                    openAt = session.registration_end;
                    break;
                case 'report2':
                    openAt = session.report1_deadline;
                    break;
                case 'final':
                case 'slide':
                case 'source_code':
                    openAt = session.report2_deadline;
                    break;
                default:
                    openAt = null;
            }

            if (openAt && new Date() < new Date(openAt)) {
                throw new Error('Chưa đến thời gian nộp báo cáo này');
            }
        }

        // Get next version number
        const { data: existingReports } = await supabase
            .from('reports')
            .select('version')
            .eq('topic_id', topicId)
            .eq('phase', phase)
            .order('version', { ascending: false })
            .limit(1);

        const nextVersion = existingReports?.length > 0 
            ? existingReports[0].version + 1 
            : 1;

        // Generate file path - topic_id MUST be first folder for RLS policy
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const safeName = `${phase}_v${nextVersion}_${timestamp}.${fileExt}`;
        
        // Path: {topic_id}/{phase}/v{version}/{filename}
        // RLS policy expects topic_id as first folder segment
        const filePath = `${topicId}/${phase}/v${nextVersion}/${safeName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from('submissions')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Không thể upload file. Vui lòng thử lại.');
        }

        // Create report record
        const { data: report, error: insertError } = await supabase
            .from('reports')
            .insert({
                topic_id: topicId,
                student_id: user.id,
                phase,
                file_path: filePath,
                file_name: file.name,
                file_size: file.size,
                version: nextVersion,
                note: note || null,
            })
            .select()
            .single();

        if (insertError) {
            // Try to delete uploaded file if insert fails
            await supabase.storage.from('submissions').remove([filePath]);
            throw insertError;
        }

        return report;
    },

    /**
     * Get download URL for a report
     */
    getDownloadUrl: async (filePath) => {
        const { data, error } = await supabase.storage
            .from('submissions')
            .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) throw error;
        return data.signedUrl;
    },

    /**
     * Download a report file
     */
    download: async (report) => {
        const url = await reportsService.getDownloadUrl(report.file_path);
        
        // Trigger browser download
        const link = document.createElement('a');
        link.href = url;
        link.download = report.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * Get all reports for teacher's mentees
     */
    getReportsForTeacher: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Chưa đăng nhập');

        // Get all topics where user is advisor
        const { data: topics, error: topicsError } = await supabase
            .from('topics')
            .select(`
                id, title, student_id,
                student:student_id(full_name, student_code),
                class:class_id(name)
            `)
            .eq('advisor_id', user.id)
            .in('status', ['approved', 'in_progress', 'submitted', 'defended']);

        if (topicsError) throw topicsError;
        if (!topics?.length) return [];

        // Get reports for all topics
        const topicIds = topics.map(t => t.id);
        const { data: reports, error: reportsError } = await supabase
            .from('reports')
            .select('*')
            .in('topic_id', topicIds)
            .order('submitted_at', { ascending: false });

        if (reportsError) throw reportsError;

        // Map reports to topics
        return topics.map(topic => ({
            ...topic,
            reports: (reports || []).filter(r => r.topic_id === topic.id),
        }));
    },

    /**
     * Constants
     */
    PHASES: REPORT_PHASES,
    ALLOWED_TYPES,
    MAX_FILE_SIZES,

    /**
     * Get phase label in Vietnamese
     */
    getPhaseLabel: (phase) => {
        const labels = {
            report1: 'Báo cáo đợt 1',
            report2: 'Báo cáo đợt 2',
            final: 'Báo cáo cuối kỳ',
            slide: 'Slide thuyết trình',
            source_code: 'Mã nguồn',
        };
        return labels[phase] || phase;
    },

    /**
     * Get phase icon
     */
    getPhaseIcon: (phase) => {
        const icons = {
            report1: 'FileText',
            report2: 'FileText',
            final: 'FileCheck',
            slide: 'Presentation',
            source_code: 'Code',
        };
        return icons[phase] || 'File';
    },
};

export default reportsService;
