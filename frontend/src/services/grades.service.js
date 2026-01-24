import { supabase } from '../lib/supabase';

/**
 * Grades Service - Quản lý điểm số cho Student
 */
export const gradesService = {
    /**
     * Lấy điểm của sinh viên theo topic
     * RLS: students can only see final grades (is_final = true)
     */
    getMyGrades: async (topicId) => {
        if (!topicId) return null;

        const { data, error } = await supabase
            .from('grades')
            .select(`
                id,
                score,
                comments,
                graded_at,
                is_final,
                grade_type,
                grader:grader_id(id, full_name, teacher_code),
                criteria:criteria_id(id, name, max_score, description)
            `)
            .eq('topic_id', topicId)
            .eq('is_final', true)
            .order('graded_at', { ascending: false });

        if (error && error.code !== 'PGRST116') throw error;
        return data || [];
    },

    /**
     * Lấy điểm tổng hợp của sinh viên
     * Tính điểm trung bình từ các criteria
     */
    getGradeSummary: async (topicId) => {
        if (!topicId) return null;

        const grades = await gradesService.getMyGrades(topicId);
        
        if (!grades || grades.length === 0) {
            return {
                hasGrades: false,
                totalScore: null,
                averageScore: null,
                grades: [],
                gradedAt: null,
            };
        }

        // Calculate average score
        const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
        const maxPossible = grades.reduce((sum, g) => sum + (g.criteria?.max_score || 10), 0);
        const averageScore = grades.length > 0 ? totalScore / grades.length : 0;

        // Get latest graded_at
        const latestGrade = grades.reduce((latest, g) => 
            !latest || new Date(g.graded_at) > new Date(latest.graded_at) ? g : latest
        , null);

        return {
            hasGrades: true,
            totalScore,
            maxPossible,
            averageScore: Math.round(averageScore * 100) / 100,
            grades,
            gradedAt: latestGrade?.graded_at || null,
        };
    },

    /**
     * Lấy thông tin lịch bảo vệ của sinh viên
     */
    getDefenseSchedule: async (topicId) => {
        if (!topicId) return null;

        const { data, error } = await supabase
            .from('defense_schedules')
            .select(`
                id,
                defense_date,
                start_time,
                end_time,
                room,
                notes,
                council:council_id(
                    id,
                    name,
                    members:council_members(
                        id,
                        role,
                        teacher:teacher_id(id, full_name, teacher_code)
                    )
                )
            `)
            .eq('topic_id', topicId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    /**
     * Lấy grading criteria để hiển thị rubric
     */
    getGradingCriteria: async (sessionId) => {
        if (!sessionId) return [];

        const { data, error } = await supabase
            .from('grading_criteria')
            .select('*')
            .eq('session_id', sessionId)
            .order('order', { ascending: true });

        if (error) throw error;
        return data || [];
    },
};

export default gradesService;
