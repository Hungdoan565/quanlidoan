import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topicsService } from '../services/topics.service';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

/**
 * Hook để lấy lớp học của sinh viên
 */
export function useStudentClass() {
    const { profile } = useAuthStore();
    const studentId = profile?.id;

    return useQuery({
        queryKey: ['student-class', studentId],
        queryFn: () => topicsService.getStudentClass(studentId),
        enabled: !!studentId,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

/**
 * Hook để lấy danh sách đề tài mẫu (còn slot)
 */
export function useSampleTopics(sessionId) {
    return useQuery({
        queryKey: ['sample-topics', sessionId],
        queryFn: () => topicsService.getSampleTopics(sessionId),
        enabled: !!sessionId,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để lấy tất cả đề tài mẫu (kể cả hết slot)
 */
export function useAllSampleTopics(sessionId) {
    return useQuery({
        queryKey: ['all-sample-topics', sessionId],
        queryFn: () => topicsService.getAllSampleTopics(sessionId),
        enabled: !!sessionId,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để đăng ký đề tài từ mẫu
 */
export function useRegisterFromSample() {
    const queryClient = useQueryClient();
    const { profile } = useAuthStore();

    return useMutation({
        mutationFn: ({ classId, sampleTopicId }) =>
            topicsService.registerFromSample({
                studentId: profile?.id,
                classId,
                sampleTopicId,
            }),
        onSuccess: () => {
            toast.success('Đăng ký đề tài thành công!');
            queryClient.invalidateQueries({ queryKey: ['my-topic'] });
            queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['sample-topics'] });
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể đăng ký đề tài');
        },
    });
}

/**
 * Hook để đề xuất đề tài mới
 */
export function useProposeTopic() {
    const queryClient = useQueryClient();
    const { profile } = useAuthStore();

    return useMutation({
        mutationFn: ({ classId, title, description, technologies }) =>
            topicsService.proposeTopic({
                studentId: profile?.id,
                classId,
                title,
                description,
                technologies,
            }),
        onSuccess: () => {
            toast.success('Đề xuất đề tài thành công! Vui lòng chờ giảng viên phê duyệt.');
            queryClient.invalidateQueries({ queryKey: ['my-topic'] });
            queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể đề xuất đề tài');
        },
    });
}

/**
 * Hook để cập nhật đề tài (khi yêu cầu revision)
 */
export function useUpdateTopic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ topicId, title, description, technologies }) =>
            topicsService.updateTopic(topicId, { title, description, technologies }),
        onSuccess: () => {
            toast.success('Cập nhật đề tài thành công! Vui lòng chờ giảng viên phê duyệt lại.');
            queryClient.invalidateQueries({ queryKey: ['my-topic'] });
            queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể cập nhật đề tài');
        },
    });
}

/**
 * Hook để lấy đề tài của sinh viên  
 */
export function useMyTopic() {
    const { profile } = useAuthStore();
    const studentId = profile?.id;

    return useQuery({
        queryKey: ['my-topic', studentId],
        queryFn: () => topicsService.getMyTopic(studentId),
        enabled: !!studentId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook kiểm tra đã đăng ký đề tài chưa
 */
export function useHasRegisteredTopic() {
    const { profile } = useAuthStore();
    const studentId = profile?.id;

    return useQuery({
        queryKey: ['has-registered-topic', studentId],
        queryFn: () => topicsService.hasRegisteredTopic(studentId),
        enabled: !!studentId,
        staleTime: 5 * 60 * 1000,
    });
}
