/**
 * Admin Export Service
 * Handles exporting various reports for admin dashboard
 */
import { supabase } from '../lib/supabase';
import { exportTopicsToExcel, exportTeacherWorkloadToExcel, exportGradeReportToExcel, exportMultipleSheets } from '../utils/excel';
import { generateStudentListPDF } from '../utils/pdf';

export const exportService = {
    /**
     * Export all topics for a session
     */
    exportTopics: async (sessionId, sessionName) => {
        let query = supabase
            .from('topics')
            .select(`
                *,
                student:student_id(id, full_name, student_code, email),
                class:class_id(
                    id, 
                    name, 
                    code,
                    advisor:advisor_id(id, full_name),
                    session:session_id(id, name, academic_year, semester)
                )
            `)
            .order('created_at', { ascending: false });

        if (sessionId) {
            // Filter by session via class
            const { data: classIds } = await supabase
                .from('classes')
                .select('id')
                .eq('session_id', sessionId);
            
            if (classIds && classIds.length > 0) {
                query = query.in('class_id', classIds.map(c => c.id));
            }
        }

        const { data: topics, error } = await query;

        if (error) throw error;

        exportTopicsToExcel(topics || [], sessionName);
        return topics?.length || 0;
    },

    /**
     * Export teacher workload report
     */
    exportTeacherWorkload: async (sessionId, sessionName) => {
        // Get all teachers
        const { data: teachers, error: teacherError } = await supabase
            .from('profiles')
            .select('id, full_name, email, teacher_code')
            .eq('role', 'teacher')
            .order('full_name');

        if (teacherError) throw teacherError;

        // Get topics grouped by advisor
        let topicsQuery = supabase
            .from('topics')
            .select(`
                id,
                status,
                class:class_id(advisor_id, session_id)
            `);

        const { data: topics, error: topicsError } = await topicsQuery;

        if (topicsError) throw topicsError;

        // Calculate workload for each teacher
        const workloadMap = {};
        (topics || []).forEach(topic => {
            if (sessionId && topic.class?.session_id !== sessionId) return;
            
            const advisorId = topic.class?.advisor_id;
            if (!advisorId) return;

            if (!workloadMap[advisorId]) {
                workloadMap[advisorId] = {
                    guiding_count: 0,
                    approved_count: 0,
                    in_progress_count: 0,
                    completed_count: 0,
                };
            }

            workloadMap[advisorId].guiding_count++;
            
            if (['approved', 'in_progress', 'submitted', 'defended', 'completed'].includes(topic.status)) {
                workloadMap[advisorId].approved_count++;
            }
            if (topic.status === 'in_progress') {
                workloadMap[advisorId].in_progress_count++;
            }
            if (topic.status === 'completed') {
                workloadMap[advisorId].completed_count++;
            }
        });

        // Merge teacher data with workload
        const teacherWorkload = (teachers || []).map(teacher => ({
            ...teacher,
            ...workloadMap[teacher.id] || {
                guiding_count: 0,
                approved_count: 0,
                in_progress_count: 0,
                completed_count: 0,
            },
        }));

        exportTeacherWorkloadToExcel(teacherWorkload, sessionName);
        return teacherWorkload.length;
    },

    /**
     * Export grades for a class
     */
    exportGrades: async (classId, className) => {
        const { data: topics, error } = await supabase
            .from('topics')
            .select(`
                id,
                title,
                student:student_id(id, full_name, student_code),
                grades(id, process_score, defense_score, final_score, letter_grade)
            `)
            .eq('class_id', classId);

        if (error) throw error;

        const gradeData = (topics || []).map(topic => ({
            student: topic.student,
            topic: { title: topic.title },
            ...(topic.grades?.[0] || {}),
        }));

        exportGradeReportToExcel(gradeData, className);
        return gradeData.length;
    },

    /**
     * Export full session report (multiple sheets)
     */
    exportFullSessionReport: async (sessionId, sessionName) => {
        // Get session info
        const { data: session } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        // Get classes in session
        const { data: classes } = await supabase
            .from('classes')
            .select(`
                id, 
                name, 
                code,
                advisor:advisor_id(full_name)
            `)
            .eq('session_id', sessionId);

        // Get all topics in session
        const { data: topics } = await supabase
            .from('topics')
            .select(`
                *,
                student:student_id(id, full_name, student_code, email),
                class:class_id(
                    id, 
                    name, 
                    code,
                    advisor:advisor_id(id, full_name)
                )
            `)
            .in('class_id', (classes || []).map(c => c.id))
            .order('class_id, created_at');

        // Prepare sheets
        const sheets = [];

        // Sheet 1: Summary
        const statusCounts = {
            pending: 0,
            approved: 0,
            in_progress: 0,
            submitted: 0,
            completed: 0,
            rejected: 0,
        };
        (topics || []).forEach(t => {
            if (statusCounts[t.status] !== undefined) {
                statusCounts[t.status]++;
            }
        });

        sheets.push({
            sheetName: 'Tổng quan',
            data: [
                { metric: 'Đợt đồ án', value: session?.name || '' },
                { metric: 'Năm học', value: session?.academic_year || '' },
                { metric: 'Học kỳ', value: session?.semester || '' },
                { metric: 'Tổng số lớp', value: classes?.length || 0 },
                { metric: 'Tổng đề tài', value: topics?.length || 0 },
                { metric: 'Chờ duyệt', value: statusCounts.pending },
                { metric: 'Đã duyệt', value: statusCounts.approved },
                { metric: 'Đang thực hiện', value: statusCounts.in_progress },
                { metric: 'Đã nộp', value: statusCounts.submitted },
                { metric: 'Hoàn thành', value: statusCounts.completed },
                { metric: 'Từ chối', value: statusCounts.rejected },
            ],
            columnHeaders: { metric: 'Chỉ số', value: 'Giá trị' },
            columnWidths: { A: 25, B: 20 },
        });

        // Sheet 2: Classes
        sheets.push({
            sheetName: 'Danh sách lớp',
            data: (classes || []).map((c, i) => ({
                stt: i + 1,
                maLop: c.code,
                tenLop: c.name,
                gvhd: c.advisor?.full_name || '',
                soDeTai: topics?.filter(t => t.class_id === c.id).length || 0,
            })),
            columnHeaders: {
                stt: 'STT',
                maLop: 'Mã lớp',
                tenLop: 'Tên lớp',
                gvhd: 'GVHD',
                soDeTai: 'Số đề tài',
            },
            columnWidths: { A: 5, B: 15, C: 30, D: 25, E: 12 },
        });

        // Sheet 3: All topics
        sheets.push({
            sheetName: 'Danh sách đề tài',
            data: (topics || []).map((topic, i) => ({
                stt: i + 1,
                mssv: topic.student?.student_code || '',
                sinhVien: topic.student?.full_name || '',
                email: topic.student?.email || '',
                tenDeTai: topic.title || '',
                lop: topic.class?.name || '',
                gvhd: topic.class?.advisor?.full_name || '',
                trangThai: getStatusLabel(topic.status),
            })),
            columnHeaders: {
                stt: 'STT',
                mssv: 'MSSV',
                sinhVien: 'Sinh viên',
                email: 'Email',
                tenDeTai: 'Tên đề tài',
                lop: 'Lớp',
                gvhd: 'GVHD',
                trangThai: 'Trạng thái',
            },
            columnWidths: { A: 5, B: 12, C: 25, D: 25, E: 40, F: 15, G: 20, H: 15 },
        });

        const filename = `BaoCaoTongHop_${sessionName || 'Session'}_${new Date().toISOString().slice(0,10)}`;
        exportMultipleSheets(sheets, filename);
        
        return {
            classCount: classes?.length || 0,
            topicCount: topics?.length || 0,
        };
    },

    /**
     * Export class to PDF
     */
    exportClassPDF: async (classId) => {
        const { data: classData, error } = await supabase
            .from('classes')
            .select(`
                *,
                session:session_id(name, academic_year, semester),
                advisor:advisor_id(full_name),
                students:profiles!classes_id(
                    id,
                    full_name,
                    student_code,
                    email,
                    topic:topics(id, title, status)
                )
            `)
            .eq('id', classId)
            .single();

        if (error) throw error;

        await generateStudentListPDF(classData);
        return classData.students?.length || 0;
    },
};

// Helper function
function getStatusLabel(status) {
    const labels = {
        pending: 'Chờ duyệt',
        approved: 'Đã duyệt',
        in_progress: 'Đang thực hiện',
        revision: 'Cần sửa',
        submitted: 'Đã nộp',
        completed: 'Hoàn thành',
        rejected: 'Từ chối',
    };
    return labels[status] || 'Chưa đăng ký';
}

export default exportService;
