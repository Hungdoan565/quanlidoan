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
            .from('topic_grades')
            .select(`
                id,
                score,
                notes,
                created_at,
                is_final,
                grader_role,
                criterion_name,
                graded_by:graded_by(id, full_name)
            `)
            .eq('topic_id', topicId)
            .eq('is_final', true)
            .order('created_at', { ascending: false });

        if (error && error.code !== 'PGRST116') throw error;
        return data || [];
    },

    /**
     * Lấy điểm tổng hợp của sinh viên
     * Tính điểm trung bình từ các criteria (all out of 10)
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

        // Calculate average score (all criteria are out of 10)
        const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
        const maxPossible = grades.length * 10; // Each criterion is out of 10
        const averageScore = grades.length > 0 ? totalScore / grades.length : 0;

        // Get latest created_at
        const latestGrade = grades.reduce((latest, g) => 
            !latest || new Date(g.created_at) > new Date(latest.created_at) ? g : latest
        , null);

        return {
            hasGrades: true,
            totalScore,
            maxPossible,
            averageScore: Math.round(averageScore * 100) / 100,
            grades,
            gradedAt: latestGrade?.created_at || null,
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
