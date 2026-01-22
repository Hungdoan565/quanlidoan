import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sampleTopicsService } from '../services/sampleTopics.service';
import { toast } from 'sonner';

/**
 * Hook để lấy danh sách đề tài mẫu của teacher hiện tại
 */
export function useMySampleTopics() {
    return useQuery({
        queryKey: ['my-sample-topics'],
        queryFn: () => sampleTopicsService.getMyTopics(),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để lấy đề tài mẫu theo session (cho sinh viên)
 */
export function useSampleTopicsBySession(sessionId) {
    return useQuery({
        queryKey: ['sample-topics', sessionId],
        queryFn: () => sampleTopicsService.getBySession(sessionId),
        enabled: !!sessionId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để tạo đề tài mẫu mới
 */
export function useCreateSampleTopic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sampleTopicsService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-sample-topics'] });
            queryClient.invalidateQueries({ queryKey: ['sample-topics'] });
            toast.success('Tạo đề tài mẫu thành công');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể tạo đề tài mẫu');
        },
    });
}

/**
 * Hook để cập nhật đề tài mẫu
 */
export function useUpdateSampleTopic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => sampleTopicsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-sample-topics'] });
            queryClient.invalidateQueries({ queryKey: ['sample-topics'] });
            toast.success('Cập nhật đề tài thành công');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể cập nhật đề tài');
        },
    });
}

/**
 * Hook để xóa đề tài mẫu
 */
export function useDeleteSampleTopic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sampleTopicsService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-sample-topics'] });
            queryClient.invalidateQueries({ queryKey: ['sample-topics'] });
            toast.success('Xóa đề tài thành công');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể xóa đề tài');
        },
    });
}

/**
 * Hook để toggle trạng thái active
 */
export function useToggleSampleTopicActive() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, isActive }) => sampleTopicsService.toggleActive(id, isActive),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['my-sample-topics'] });
            toast.success(data.is_active ? 'Đã mở đề tài' : 'Đã đóng đề tài');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể thay đổi trạng thái');
        },
    });
}
