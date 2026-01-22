import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logbookService } from '../services/logbook.service';
import { toast } from 'sonner';

// =====================================================
// STUDENT HOOKS
// =====================================================

/**
 * Hook để lấy topic của student với logbook summary
 */
export function useMyTopicWithLogbook() {
    return useQuery({
        queryKey: ['my-topic-logbook'],
        queryFn: () => logbookService.getMyTopicWithLogbook(),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để lấy danh sách logbook entries
 */
export function useLogbookEntries(topicId) {
    return useQuery({
        queryKey: ['logbook-entries', topicId],
        queryFn: () => logbookService.getEntriesByTopic(topicId),
        enabled: !!topicId,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để tạo logbook entry mới
 */
export function useCreateLogbookEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ topicId, data }) => logbookService.createEntry(topicId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['logbook-entries', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['my-topic-logbook'] });
            toast.success('Đã thêm nhật ký tuần ' + data.week_number);
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể tạo nhật ký');
        },
    });
}

/**
 * Hook để cập nhật logbook entry
 */
export function useUpdateLogbookEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, updates, topicId }) => logbookService.updateEntry(entryId, updates),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['logbook-entries', variables.topicId] });
            toast.success('Đã cập nhật nhật ký');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể cập nhật nhật ký');
        },
    });
}

// =====================================================
// TEACHER HOOKS
// =====================================================

/**
 * Hook để lấy danh sách SV với logbook summary (for teacher)
 */
export function useMyStudentsLogbook() {
    return useQuery({
        queryKey: ['students-logbook'],
        queryFn: () => logbookService.getMyStudentsWithLogbook(),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để lấy chi tiết logbook của 1 topic (for teacher)
 */
export function useTopicLogbookDetail(topicId) {
    return useQuery({
        queryKey: ['topic-logbook-detail', topicId],
        queryFn: () => logbookService.getTopicLogbookDetail(topicId),
        enabled: !!topicId,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để thêm teacher note
 */
export function useAddTeacherNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, note, topicId }) => logbookService.addTeacherNote(entryId, note),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['topic-logbook-detail', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['students-logbook'] });
            toast.success('Đã thêm ghi chú');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể thêm ghi chú');
        },
    });
}

/**
 * Hook để xác nhận buổi gặp
 */
export function useConfirmMeeting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, meetingDate, topicId }) =>
            logbookService.confirmMeeting(entryId, meetingDate),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['topic-logbook-detail', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['students-logbook'] });
            queryClient.invalidateQueries({ queryKey: ['logbook-entries', variables.topicId] });
            toast.success('Đã xác nhận buổi gặp');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể xác nhận');
        },
    });
}

/**
 * Hook để hủy xác nhận buổi gặp
 */
export function useUnconfirmMeeting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, topicId }) => logbookService.unconfirmMeeting(entryId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['topic-logbook-detail', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['students-logbook'] });
            toast.success('Đã hủy xác nhận');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể hủy xác nhận');
        },
    });
}
