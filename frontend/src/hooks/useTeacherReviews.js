/**
 * useTeacherReviews Hook
 * React Query hooks for teacher topic review operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherService } from '../services/teacher.service';
import { toast } from 'sonner';

// Query Keys
export const teacherReviewKeys = {
    all: ['teacher-reviews'],
    pending: () => [...teacherReviewKeys.all, 'pending'],
    allTopics: (status) => [...teacherReviewKeys.all, 'all', status],
    topic: (id) => [...teacherReviewKeys.all, 'topic', id],
    stats: () => [...teacherReviewKeys.all, 'stats'],
};

/**
 * Hook to fetch pending topics for review
 */
export function usePendingTopics() {
    return useQuery({
        queryKey: teacherReviewKeys.pending(),
        queryFn: () => teacherService.getMyPendingTopics(),
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Hook to fetch all topics (with optional status filter)
 */
export function useMyAllTopics(status = null) {
    return useQuery({
        queryKey: teacherReviewKeys.allTopics(status),
        queryFn: () => teacherService.getMyAllTopics(status),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook to fetch single topic for review
 */
export function useTopicForReview(topicId) {
    return useQuery({
        queryKey: teacherReviewKeys.topic(topicId),
        queryFn: () => teacherService.getTopicForReview(topicId),
        enabled: !!topicId,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
}

/**
 * Hook to fetch topic statistics
 */
export function useMyTopicStats() {
    return useQuery({
        queryKey: teacherReviewKeys.stats(),
        queryFn: () => teacherService.getMyTopicStats(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Mutation hook to approve a topic
 */
export function useApproveTopic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (topicId) => teacherService.approveTopic(topicId),
        onSuccess: (data) => {
            toast.success('Đã phê duyệt đề tài!');
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: teacherReviewKeys.all });
        },
        onError: (error) => {
            toast.error(error.message || 'Có lỗi xảy ra khi phê duyệt');
        },
    });
}

/**
 * Mutation hook to bulk approve multiple topics
 */
export function useBulkApproveTopics() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (topicIds) => teacherService.bulkApproveTopics(topicIds),
        onSuccess: (data) => {
            toast.success(`Đã phê duyệt ${data.length} đề tài!`);
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: teacherReviewKeys.all });
        },
        onError: (error) => {
            toast.error(error.message || 'Có lỗi xảy ra khi phê duyệt');
        },
    });
}

/**
 * Mutation hook to request revision
 */
export function useRequestRevision() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ topicId, note }) => teacherService.requestRevision(topicId, note),
        onSuccess: (data) => {
            toast.success('Đã gửi yêu cầu chỉnh sửa!');
            queryClient.invalidateQueries({ queryKey: teacherReviewKeys.all });
        },
        onError: (error) => {
            toast.error(error.message || 'Có lỗi xảy ra');
        },
    });
}

/**
 * Mutation hook to reject a topic
 */
export function useRejectTopic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ topicId, reason }) => teacherService.rejectTopic(topicId, reason),
        onSuccess: (data) => {
            toast.warning('Đã từ chối đề tài');
            queryClient.invalidateQueries({ queryKey: teacherReviewKeys.all });
        },
        onError: (error) => {
            toast.error(error.message || 'Có lỗi xảy ra');
        },
    });
}
