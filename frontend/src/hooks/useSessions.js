import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsService } from '../services/sessions.service';
import { toast } from 'sonner';

/**
 * Hook để lấy danh sách sessions
 */
export function useSessions(filters = {}) {
    return useQuery({
        queryKey: ['sessions', filters],
        queryFn: () => sessionsService.getAll(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook để lấy chi tiết một session
 */
export function useSession(id) {
    return useQuery({
        queryKey: ['sessions', id],
        queryFn: () => sessionsService.getById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy statistics của session
 */
export function useSessionStats(sessionId) {
    return useQuery({
        queryKey: ['sessions', sessionId, 'stats'],
        queryFn: () => sessionsService.getStats(sessionId),
        enabled: !!sessionId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Hook để tạo session mới
 */
export function useCreateSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sessionsService.create,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Tạo đợt đồ án thành công!');
            return data;
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể tạo đợt đồ án');
        },
    });
}

/**
 * Hook để cập nhật session
 */
export function useUpdateSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => sessionsService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['sessions', data.id] });
            toast.success('Cập nhật đợt đồ án thành công!');
            return data;
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể cập nhật đợt đồ án');
        },
    });
}

/**
 * Hook để xóa session
 */
export function useDeleteSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sessionsService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Xóa đợt đồ án thành công!');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể xóa đợt đồ án');
        },
    });
}

/**
 * Hook để duplicate session
 */
export function useDuplicateSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, newData }) => sessionsService.duplicate(id, newData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Sao chép đợt đồ án thành công!');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể sao chép đợt đồ án');
        },
    });
}

/**
 * Hook để toggle status của session (open <-> closed)
 */
export function useToggleSessionStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, currentStatus }) => {
            const newStatus = currentStatus === 'open' ? 'closed' : 'open';
            return sessionsService.update(id, { status: newStatus });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            const statusText = data.status === 'open' ? 'mở' : 'đóng';
            toast.success(`Đã ${statusText} đợt đồ án!`);
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể thay đổi trạng thái');
        },
    });
}

