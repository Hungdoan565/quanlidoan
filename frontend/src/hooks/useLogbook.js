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
 * Hook để tạo logbook entry mới (structured)
 */
export function useCreateLogbookEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ topicId, data }) => logbookService.createEntry(topicId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['logbook-entries', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['my-topic-logbook'] });
            const message = data.status === 'pending' 
                ? 'Đã gửi nhật ký tuần ' + data.week_number 
                : 'Đã lưu nháp nhật ký tuần ' + data.week_number;
            toast.success(message);
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
        mutationFn: ({ entryId, updates }) => logbookService.updateEntry(entryId, updates),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['logbook-entries', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['my-topic-logbook'] });
            const message = data.status === 'pending' 
                ? 'Đã gửi nhật ký' 
                : 'Đã cập nhật nhật ký';
            toast.success(message);
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể cập nhật nhật ký');
        },
    });
}

/**
 * Hook để submit entry cho review
 */
export function useSubmitLogbookEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId }) => logbookService.submitEntry(entryId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['logbook-entries', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['my-topic-logbook'] });
            toast.success('Đã gửi báo cáo cho giảng viên');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể gửi báo cáo');
        },
    });
}

/**
 * Hook để lưu nháp
 */
export function useSaveDraft() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, updates }) => logbookService.saveDraft(entryId, updates),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['logbook-entries', variables.topicId] });
            toast.success('Đã lưu nháp');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể lưu nháp');
        },
    });
}

/**
 * Hook để upload file đính kèm
 */
export function useUploadAttachment() {
    return useMutation({
        mutationFn: ({ topicId, file }) => logbookService.uploadAttachment(topicId, file),
        onError: (error) => {
            toast.error(error.message || 'Không thể tải tệp lên');
        },
    });
}

/**
 * Hook để xóa file đính kèm
 */
export function useDeleteAttachment() {
    return useMutation({
        mutationFn: ({ filePath }) => logbookService.deleteAttachment(filePath),
        onError: (error) => {
            toast.error(error.message || 'Không thể xóa tệp');
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
 * Hook để duyệt nhật ký
 */
export function useApproveEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, feedback }) => logbookService.approveEntry(entryId, feedback),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['topic-logbook-detail', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['students-logbook'] });
            queryClient.invalidateQueries({ queryKey: ['logbook-entries', variables.topicId] });
            toast.success('Đã duyệt nhật ký');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể duyệt nhật ký');
        },
    });
}

/**
 * Hook để yêu cầu sửa nhật ký
 */
export function useRequestRevision() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, feedback }) => logbookService.requestRevision(entryId, feedback),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['topic-logbook-detail', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['students-logbook'] });
            queryClient.invalidateQueries({ queryKey: ['logbook-entries', variables.topicId] });
            toast.success('Đã yêu cầu sinh viên sửa nhật ký');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể yêu cầu sửa');
        },
    });
}

/**
 * Hook để thêm feedback (general)
 */
export function useAddFeedback() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, feedback, status }) => 
            logbookService.addFeedback(entryId, feedback, status),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['topic-logbook-detail', variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ['students-logbook'] });
            toast.success('Đã thêm phản hồi');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể thêm phản hồi');
        },
    });
}

/**
 * Hook để thêm teacher note (legacy support)
 */
export function useAddTeacherNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ entryId, note }) => logbookService.addTeacherNote(entryId, note),
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
        mutationFn: ({ entryId, meetingDate }) =>
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
        mutationFn: ({ entryId }) => logbookService.unconfirmMeeting(entryId),
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
