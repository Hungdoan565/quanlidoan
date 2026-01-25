/**
 * Grading Service
 * Handles all grading-related API calls to Supabase
 * 
 * Schema: grading_criteria uses JSONB array for criteria
 * Each (session_id, grader_role) has ONE row with array of criteria
 */

import { supabase } from '../lib/supabase';

/**
 * Default grading criteria templates
 * Used when a session has no criteria configured
 */
const DEFAULT_CRITERIA = {
    advisor: [
        { 
            name: "Báo cáo/Tài liệu", 
            weight: 0.25, 
            max_score: 10, 
            description: "Trình bày rõ ràng, phân tích bài toán đầy đủ, thiết kế hệ thống hợp lý, tài liệu hướng dẫn" 
        },
        { 
            name: "Sản phẩm/Code", 
            weight: 0.40, 
            max_score: 10, 
            description: "Chức năng hoạt động đúng, UI thân thiện, code sạch có cấu trúc, xử lý lỗi, bảo mật cơ bản" 
        },
        { 
            name: "Thuyết trình/Demo", 
            weight: 0.25, 
            max_score: 10, 
            description: "Trình bày tự tin rõ ràng, demo mượt mà, giải thích quy trình, trả lời câu hỏi tốt" 
        },
        { 
            name: "Tiến độ & Thái độ", 
            weight: 0.10, 
            max_score: 10, 
            description: "Hoàn thành đúng hạn, thái độ tích cực, chủ động trong công việc" 
        }
    ],
    reviewer: [],
    council: []
};

export const gradingService = {
    /**
     * Get grading criteria for a session
     * Returns object with criteria grouped by grader_role
     * Auto-creates default criteria if none exist for the session
     * @param {string} sessionId - Session UUID
     * @returns {Promise<Object>} { advisor: [...], reviewer: [...], council: [...] }
     */
    async getCriteriaBySession(sessionId) {
        if (!sessionId) {
            return { advisor: [], reviewer: [], council: [] };
        }

        const { data, error } = await supabase
            .from('grading_criteria')
            .select('*')
            .eq('session_id', sessionId);

        if (error) throw error;

        // Transform to grouped object
        const grouped = {
            advisor: [],
            reviewer: [],
            council: []
        };

        (data || []).forEach(row => {
            if (grouped[row.grader_role]) {
                // criteria is JSONB array
                grouped[row.grader_role] = row.criteria || [];
            }
        });

        // If no criteria exist, auto-create defaults
        const hasAnyCriteria = grouped.advisor.length > 0 || grouped.reviewer.length > 0 || grouped.council.length > 0;
        if (!hasAnyCriteria) {
            console.log(`No grading criteria for session ${sessionId}, creating defaults...`);
            try {
                await this.createDefaultCriteria(sessionId);
                // Return defaults immediately (don't wait for re-fetch)
                return {
                    advisor: DEFAULT_CRITERIA.advisor,
                    reviewer: DEFAULT_CRITERIA.reviewer,
                    council: DEFAULT_CRITERIA.council
                };
            } catch (createError) {
                console.warn('Could not auto-create criteria:', createError.message);
                // Return defaults even if insert failed (read-only fallback)
                return {
                    advisor: DEFAULT_CRITERIA.advisor,
                    reviewer: DEFAULT_CRITERIA.reviewer,
                    council: DEFAULT_CRITERIA.council
                };
            }
        }

        return grouped;
    },

    /**
     * Create default grading criteria for a session
     * @param {string} sessionId - Session UUID
     */
    async createDefaultCriteria(sessionId) {
        const inserts = [
            { session_id: sessionId, grader_role: 'advisor', criteria: DEFAULT_CRITERIA.advisor },
            { session_id: sessionId, grader_role: 'reviewer', criteria: DEFAULT_CRITERIA.reviewer },
            { session_id: sessionId, grader_role: 'council', criteria: DEFAULT_CRITERIA.council }
        ];

        const { error } = await supabase
            .from('grading_criteria')
            .insert(inserts);

        if (error) {
            // Ignore duplicate key errors (criteria already exist)
            if (!error.message?.includes('duplicate') && error.code !== '23505') {
                throw error;
            }
        }
    },

    /**
     * Get all criteria configs (for admin)
     * @param {string} sessionId - Optional session filter
     * @returns {Promise<Array>} List of criteria configs
     */
    async getAllCriteria({ sessionId, page = 1, limit = 50 } = {}) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('grading_criteria')
            .select('*, session:session_id(id, name, academic_year, semester)', { count: 'exact' });

        if (sessionId) {
            query = query.eq('session_id', sessionId);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Transform: expand criteria array to individual items for display
        const expanded = [];
        (data || []).forEach(row => {
            (row.criteria || []).forEach((criterion, index) => {
                expanded.push({
                    id: `${row.id}_${index}`, // Composite ID
                    rowId: row.id,
                    criterionIndex: index,
                    session_id: row.session_id,
                    session: row.session,
                    grader_type: row.grader_role,
                    name: criterion.name,
                    weight: criterion.weight,
                    max_score: criterion.max_score || 10,
                });
            });
        });

        return { data: expanded, count: expanded.length, page, limit };
    },

    /**
     * Get or create criteria config for a session + role
     */
    async getOrCreateConfig(sessionId, graderRole) {
        // Try to get existing
        const { data: existing } = await supabase
            .from('grading_criteria')
            .select('*')
            .eq('session_id', sessionId)
            .eq('grader_role', graderRole)
            .single();

        if (existing) return existing;

        // Create new
        const { data, error } = await supabase
            .from('grading_criteria')
            .insert({
                session_id: sessionId,
                grader_role: graderRole,
                criteria: []
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Add a criterion to a session + role
     */
    async addCriterion(sessionId, graderRole, criterion) {
        // Get current config
        const config = await this.getOrCreateConfig(sessionId, graderRole);
        
        // Add new criterion
        const newCriteria = [...(config.criteria || []), {
            name: criterion.name,
            weight: criterion.weight,
            max_score: criterion.max_score || 10
        }];

        // Update
        const { data, error } = await supabase
            .from('grading_criteria')
            .update({ criteria: newCriteria })
            .eq('id', config.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update a criterion
     * @param {string} sessionId
     * @param {string} graderRole
     * @param {number} index - Index in criteria array
     * @param {Object} updates - Updated criterion data
     */
    async updateCriterion(sessionId, graderRole, index, updates) {
        const config = await this.getOrCreateConfig(sessionId, graderRole);
        
        const newCriteria = [...(config.criteria || [])];
        if (index >= 0 && index < newCriteria.length) {
            newCriteria[index] = {
                ...newCriteria[index],
                ...updates
            };
        }

        const { data, error } = await supabase
            .from('grading_criteria')
            .update({ criteria: newCriteria })
            .eq('id', config.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a criterion
     */
    async deleteCriterion(sessionId, graderRole, index) {
        const config = await this.getOrCreateConfig(sessionId, graderRole);
        
        const newCriteria = [...(config.criteria || [])];
        newCriteria.splice(index, 1);

        const { data, error } = await supabase
            .from('grading_criteria')
            .update({ criteria: newCriteria })
            .eq('id', config.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Copy criteria from one session to another
     */
    async copyCriteriaFromSession(fromSessionId, toSessionId) {
        // Get source criteria
        const { data: sourceData, error: sourceError } = await supabase
            .from('grading_criteria')
            .select('*')
            .eq('session_id', fromSessionId);

        if (sourceError) throw sourceError;
        if (!sourceData || sourceData.length === 0) {
            throw new Error('Không có tiêu chí nào để copy');
        }

        // Delete existing target criteria
        await supabase
            .from('grading_criteria')
            .delete()
            .eq('session_id', toSessionId);

        // Insert copied criteria
        const newData = sourceData.map(row => ({
            session_id: toSessionId,
            grader_role: row.grader_role,
            criteria: row.criteria
        }));

        const { data, error } = await supabase
            .from('grading_criteria')
            .insert(newData)
            .select();

        if (error) throw error;
        return data;
    },

    // =========================================================================
    // GRADING (topic_grades)
    // =========================================================================

    /**
     * Get topics that a teacher can grade
     */
    async getGradableTopics(teacherId, role = 'advisor', filters = {}) {
        let query = supabase
            .from('topics')
            .select(`
                *,
                student:student_id(id, full_name, email, student_code),
                advisor:advisor_id(id, full_name),
                reviewer:reviewer_id(id, full_name),
                class:class_id(
                    id, 
                    name,
                    session:session_id(id, name, academic_year, semester)
                )
            `)
            .in('status', ['approved', 'in_progress', 'submitted', 'defended', 'completed']);

        if (role === 'advisor') {
            query = query.eq('advisor_id', teacherId);
        } else if (role === 'reviewer') {
            query = query.eq('reviewer_id', teacherId);
        }

        if (filters.classId) {
            query = query.eq('class_id', filters.classId);
        }

        const { data, error } = await query.order('updated_at', { ascending: false });

        if (error) throw error;

        // Get grading status for each topic
        const topicsWithStatus = await Promise.all(
            (data || []).map(async (topic) => {
                const sessionId = topic.class?.session?.id;
                if (!sessionId) {
                    return { ...topic, gradingStatus: { total: 0, graded: 0, isComplete: false, percentage: 0 } };
                }

                // Get criteria for this role
                const criteriaGroups = await this.getCriteriaBySession(sessionId);
                const criteria = criteriaGroups[role] || [];

                // Get grades
                const grades = await this.getTopicGrades(topic.id, teacherId);
                const gradedCount = grades.filter(g => g.grader_role === role).length;

                return {
                    ...topic,
                    gradingStatus: {
                        total: criteria.length,
                        graded: gradedCount,
                        isComplete: criteria.length > 0 && gradedCount >= criteria.length,
                        percentage: criteria.length > 0 ? Math.round((gradedCount / criteria.length) * 100) : 0
                    }
                };
            })
        );

        return topicsWithStatus;
    },

    /**
     * Get all grades for a topic
     */
    async getTopicGrades(topicId, graderId = null) {
        try {
            let query = supabase
                .from('topic_grades')
                .select('*')
                .eq('topic_id', topicId);

            if (graderId) {
                query = query.eq('graded_by', graderId);
            }

            const { data, error } = await query.order('created_at');

            if (error) {
                // If table doesn't exist, return empty array gracefully
                if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
                    console.warn('topic_grades table may not exist yet:', error.message);
                    return [];
                }
                throw error;
            }
            return data || [];
        } catch (e) {
            console.warn('Error fetching topic grades:', e.message);
            return [];
        }
    },

    /**
     * Save a grade
     */
    async saveGrade({ topicId, criterionName, score, notes, gradedBy, graderRole }) {
        // Use criterion_name as identifier (since we use JSONB)
        const { data, error } = await supabase
            .from('topic_grades')
            .upsert({
                topic_id: topicId,
                criterion_name: criterionName,
                score: score,
                notes: notes || null,
                graded_by: gradedBy,
                grader_role: graderRole,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'topic_id,criterion_name,graded_by'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Save multiple grades at once
     */
    async saveGrades(grades) {
        const { data, error } = await supabase
            .from('topic_grades')
            .upsert(
                grades.map(g => ({
                    topic_id: g.topicId,
                    criterion_name: g.criterionName,
                    score: g.score,
                    notes: g.notes || null,
                    graded_by: g.gradedBy,
                    grader_role: g.graderRole,
                    updated_at: new Date().toISOString()
                })),
                { onConflict: 'topic_id,criterion_name,graded_by' }
            )
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Get grade summary for a topic
     */
    async getGradeSummary(topicId) {
        const grades = await this.getTopicGrades(topicId);
        
        const byRole = {
            advisor: [],
            reviewer: [],
            council: []
        };

        grades.forEach(grade => {
            if (byRole[grade.grader_role]) {
                byRole[grade.grader_role].push(grade);
            }
        });

        return {
            grades,
            byRole,
            advisorGrades: byRole.advisor,
            reviewerGrades: byRole.reviewer,
            councilGrades: byRole.council
        };
    },

    /**
     * Submit/finalize grades
     */
    async submitGrades(topicId, graderId, graderRole) {
        const { error } = await supabase
            .from('topic_grades')
            .update({ 
                is_final: true,
                finalized_at: new Date().toISOString()
            })
            .eq('topic_id', topicId)
            .eq('graded_by', graderId)
            .eq('grader_role', graderRole);

        if (error) throw error;
        return true;
    },
};
