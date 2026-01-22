/**
 * Grading Hooks
 * React Query hooks for grading functionality
 * 
 * Uses JSONB criteria storage pattern
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradingService } from '../services/grading.service';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

// =============================================================================
// Query Keys
// =============================================================================

export const GRADING_KEYS = {
    all: ['grading'],
    criteria: (sessionId) => ['grading', 'criteria', sessionId],
    allCriteria: (filters) => ['grading', 'allCriteria', filters],
    gradableTopics: (teacherId, role) => ['grading', 'gradableTopics', teacherId, role],
    topicGrades: (topicId, graderId) => ['grading', 'topicGrades', topicId, graderId],
    gradeSummary: (topicId) => ['grading', 'summary', topicId],
};

// =============================================================================
// Criteria Hooks
// =============================================================================

/**
 * Get grading criteria for a specific session (grouped by role)
 */
export function useGradingCriteria(sessionId) {
    return useQuery({
        queryKey: GRADING_KEYS.criteria(sessionId),
        queryFn: () => gradingService.getCriteriaBySession(sessionId),
        enabled: !!sessionId,
        staleTime: 10 * 60 * 1000,
    });
}

/**
 * Get all criteria with pagination (for admin - expanded view)
 */
export function useAllGradingCriteria(filters = {}) {
    return useQuery({
        queryKey: GRADING_KEYS.allCriteria(filters),
        queryFn: () => gradingService.getAllCriteria(filters),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Add a new criterion
 */
export function useCreateCriteria() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, graderType, ...criterion }) => 
            gradingService.addCriterion(sessionId, graderType, criterion),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: GRADING_KEYS.all });
            toast.success('Thêm tiêu chí thành công!');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể thêm tiêu chí');
        },
    });
}

/**
 * Update a criterion
 */
export function useUpdateCriteria() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, graderType, index, data }) => 
            gradingService.updateCriterion(sessionId, graderType, index, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: GRADING_KEYS.all });
            toast.success('Cập nhật tiêu chí thành công!');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể cập nhật tiêu chí');
        },
    });
}

/**
 * Delete a criterion
 */
export function useDeleteCriteria() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, graderType, index }) => 
            gradingService.deleteCriterion(sessionId, graderType, index),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: GRADING_KEYS.all });
            toast.success('Xóa tiêu chí thành công!');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể xóa tiêu chí');
        },
    });
}

/**
 * Copy criteria from one session to another
 */
export function useCopyCriteria() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ fromSessionId, toSessionId }) => 
            gradingService.copyCriteriaFromSession(fromSessionId, toSessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: GRADING_KEYS.all });
            toast.success('Copy tiêu chí thành công!');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể copy tiêu chí');
        },
    });
}

// =============================================================================
// Gradable Topics Hooks
// =============================================================================

/**
 * Get topics that current teacher can grade
 */
export function useGradableTopics(role = 'advisor', filters = {}) {
    const { profile } = useAuthStore();
    const teacherId = profile?.id;

    return useQuery({
        queryKey: GRADING_KEYS.gradableTopics(teacherId, role),
        queryFn: () => gradingService.getGradableTopics(teacherId, role, filters),
        enabled: !!teacherId,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Get topics for both advisor and reviewer roles
 */
export function useAllGradableTopics(filters = {}) {
    const { profile } = useAuthStore();
    const teacherId = profile?.id;

    const advisorQuery = useQuery({
        queryKey: GRADING_KEYS.gradableTopics(teacherId, 'advisor'),
        queryFn: () => gradingService.getGradableTopics(teacherId, 'advisor', filters),
        enabled: !!teacherId,
        staleTime: 2 * 60 * 1000,
    });

    const reviewerQuery = useQuery({
        queryKey: GRADING_KEYS.gradableTopics(teacherId, 'reviewer'),
        queryFn: () => gradingService.getGradableTopics(teacherId, 'reviewer', filters),
        enabled: !!teacherId,
        staleTime: 2 * 60 * 1000,
    });

    return {
        advisorTopics: advisorQuery.data || [],
        reviewerTopics: reviewerQuery.data || [],
        isLoading: advisorQuery.isLoading || reviewerQuery.isLoading,
        error: advisorQuery.error || reviewerQuery.error,
        refetch: () => {
            advisorQuery.refetch();
            reviewerQuery.refetch();
        }
    };
}

// =============================================================================
// Topic Grades Hooks
// =============================================================================

/**
 * Get grades for a specific topic
 */
export function useTopicGrades(topicId, graderId = null) {
    return useQuery({
        queryKey: GRADING_KEYS.topicGrades(topicId, graderId),
        queryFn: () => gradingService.getTopicGrades(topicId, graderId),
        enabled: !!topicId,
        staleTime: 1 * 60 * 1000,
    });
}

/**
 * Get grade summary for a topic
 */
export function useGradeSummary(topicId) {
    return useQuery({
        queryKey: GRADING_KEYS.gradeSummary(topicId),
        queryFn: () => gradingService.getGradeSummary(topicId),
        enabled: !!topicId,
        staleTime: 1 * 60 * 1000,
    });
}

// =============================================================================
// Save Grade Hooks
// =============================================================================

/**
 * Save a single grade
 */
export function useSaveGrade() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: gradingService.saveGrade,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ 
                queryKey: GRADING_KEYS.topicGrades(variables.topicId, variables.gradedBy) 
            });
            queryClient.invalidateQueries({ 
                queryKey: GRADING_KEYS.gradeSummary(variables.topicId) 
            });
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể lưu điểm');
        },
    });
}

/**
 * Save multiple grades at once
 */
export function useSaveGrades() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: gradingService.saveGrades,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: GRADING_KEYS.all });
            toast.success('Lưu điểm thành công!');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể lưu điểm');
        },
    });
}

/**
 * Submit/finalize grades
 */
export function useSubmitGrades() {
    const queryClient = useQueryClient();
    const { profile } = useAuthStore();

    return useMutation({
        mutationFn: ({ topicId, graderType }) => 
            gradingService.submitGrades(topicId, profile?.id, graderType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: GRADING_KEYS.all });
            toast.success('Hoàn thành chấm điểm!');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể hoàn thành chấm điểm');
        },
    });
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to get grading context for a topic
 */
export function useGradingContext(topicId, sessionId, graderRole) {
    const { profile } = useAuthStore();
    
    const criteriaQuery = useGradingCriteria(sessionId);
    const gradesQuery = useTopicGrades(topicId, profile?.id);

    // Get criteria for this role from grouped object
    const allCriteria = criteriaQuery.data || { advisor: [], reviewer: [], council: [] };
    const criteria = allCriteria[graderRole] || [];
    const grades = gradesQuery.data || [];

    // Map criteria with existing grades
    const gradingItems = criteria.map((criterion, index) => {
        const existingGrade = grades.find(g => g.criterion_name === criterion.name);
        return {
            criterion: {
                ...criterion,
                id: `${graderRole}_${index}`,
                index,
            },
            grade: existingGrade || null,
            score: existingGrade?.score ?? '',
            notes: existingGrade?.notes ?? '',
            isSaved: !!existingGrade,
        };
    });

    // Calculate progress
    const totalCriteria = criteria.length;
    const gradedCriteria = grades.filter(g => g.grader_role === graderRole).length;

    return {
        criteria,
        grades,
        gradingItems,
        progress: {
            total: totalCriteria,
            completed: gradedCriteria,
            percentage: totalCriteria > 0 ? Math.round((gradedCriteria / totalCriteria) * 100) : 0,
        },
        isLoading: criteriaQuery.isLoading || gradesQuery.isLoading,
        error: criteriaQuery.error || gradesQuery.error,
    };
}
