import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesService } from '../services/classes.service';
import { toast } from 'sonner';

/**
 * Hook để lấy danh sách classes
 */
export function useClasses(filters = {}) {
    return useQuery({
        queryKey: ['classes', filters],
        queryFn: () => classesService.getAll(filters),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để lấy chi tiết class
 */
export function useClass(id) {
    return useQuery({
        queryKey: ['class', id],
        queryFn: () => classesService.getById(id),
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để tạo class mới
 */
export function useCreateClass() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: classesService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Tạo lớp học thành công');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể tạo lớp học');
        },
    });
}

/**
 * Hook để cập nhật class
 */
export function useUpdateClass() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => classesService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['class', data.id] });
            toast.success('Cập nhật lớp học thành công');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể cập nhật lớp học');
        },
    });
}

/**
 * Hook để xóa class
 */
export function useDeleteClass() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: classesService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Xóa lớp học thành công');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể xóa lớp học');
        },
    });
}

/**
 * Hook để phân công cặp giảng viên
 */
export function useAssignTeacherPair() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ classId, advisorId }) =>
            classesService.assignTeacherPair(classId, advisorId),
        onSuccess: (_, { classId }) => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['class', classId] });
            toast.success('Phân công giảng viên thành công');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể phân công giảng viên');
        },
    });
}

/**
 * Hook để thêm sinh viên vào class
 */
export function useAddStudentToClass() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ classId, studentId }) =>
            classesService.addStudent(classId, studentId),
        onSuccess: (_, { classId }) => {
            queryClient.invalidateQueries({ queryKey: ['class', classId] });
            queryClient.invalidateQueries({ queryKey: ['available-students'] });
            toast.success('Thêm sinh viên thành công');
        },
        onError: (error) => {
            if (error.code === '23505') {
                toast.error('Sinh viên đã có trong lớp này');
            } else {
                toast.error(error.message || 'Không thể thêm sinh viên');
            }
        },
    });
}

/**
 * Hook để xóa sinh viên khỏi class
 */
export function useRemoveStudentFromClass() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ classId, studentId }) =>
            classesService.removeStudent(classId, studentId),
        onSuccess: (_, { classId }) => {
            queryClient.invalidateQueries({ queryKey: ['class', classId] });
            queryClient.invalidateQueries({ queryKey: ['available-students'] });
            toast.success('Xóa sinh viên thành công');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể xóa sinh viên');
        },
    });
}

/**
 * Hook để import nhiều sinh viên từ Excel
 */
export function useImportStudents() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ classId, students }) =>
            classesService.bulkImportStudents(classId, students),
        onSuccess: (data, { classId }) => {
            queryClient.invalidateQueries({ queryKey: ['class', classId] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['available-students'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });

            // Build success message based on results
            const parts = [];
            if (data.created > 0) parts.push(`${data.created} tài khoản mới`);
            if (data.skipped > 0) parts.push(`${data.skipped} đã có sẵn`);
            if (data.added_to_class > 0) parts.push(`${data.added_to_class} thêm vào lớp`);

            const message = parts.length > 0
                ? `Import thành công: ${parts.join(', ')}`
                : 'Import hoàn tất';

            if (data.errors?.length > 0) {
                toast.warning(`${message}. ${data.errors.length} lỗi`);
            } else {
                toast.success(message);
            }
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể import sinh viên');
        },
    });
}

/**
 * Hook để thêm nhiều sinh viên đã có tài khoản vào lớp
 */
export function useImportStudentIds() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ classId, studentIds }) =>
            classesService.importStudents(classId, studentIds),
        onSuccess: (_, { classId }) => {
            queryClient.invalidateQueries({ queryKey: ['class', classId] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['available-students'] });
            toast.success('Đã thêm sinh viên vào lớp');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể thêm sinh viên');
        },
    });
}

/**
 * Hook để lấy danh sách sinh viên chưa được gán vào class nào
 */
export function useAvailableStudents(sessionId) {
    return useQuery({
        queryKey: ['available-students', sessionId],
        queryFn: () => classesService.getAvailableStudents(sessionId),
        enabled: !!sessionId,
        staleTime: 1 * 60 * 1000,
    });
}
