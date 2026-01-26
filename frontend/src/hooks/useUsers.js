import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services/users.service';
import { toast } from 'sonner';

/**
 * Hook để lấy danh sách users với server-side pagination
 * @param {Object} filters - Filter options
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 */
export function useUsers(filters = {}, page = 1, limit = 15) {
    return useQuery({
        queryKey: ['users', filters, page, limit],
        queryFn: () => usersService.getAll(filters, page, limit),
        staleTime: 2 * 60 * 1000,
        keepPreviousData: true, // Keep old data while fetching new page
    });
}

/**
 * Hook để lấy chi tiết user
 */
export function useUser(id) {
    return useQuery({
        queryKey: ['user', id],
        queryFn: () => usersService.getById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy danh sách giảng viên
 */
export function useTeachers() {
    return useQuery({
        queryKey: ['teachers'],
        queryFn: () => usersService.getTeachers(),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy danh sách sinh viên  
 */
export function useStudents(options = {}) {
    return useQuery({
        queryKey: ['students', options],
        queryFn: () => usersService.getStudents(options),
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Hook để cập nhật user
 */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => usersService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user', data.id] });
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            toast.success('Cập nhật người dùng thành công');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể cập nhật người dùng');
        },
    });
}

/**
 * Hook để toggle active status
 */
export function useToggleUserActive() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, isActive }) => usersService.toggleActive(id, isActive),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user', data.id] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            toast.success(data.is_active ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể thay đổi trạng thái');
        },
    });
}

/**
 * Hook để lấy thống kê users
 */
export function useUserStats() {
    return useQuery({
        queryKey: ['user-stats'],
        queryFn: () => usersService.getStats(),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để đổi role user
 */
export function useChangeUserRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, role }) => usersService.changeRole(id, role),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user', data.id] });
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            toast.success('Đã thay đổi vai trò người dùng');
        },
        onError: (error) => {
            toast.error(error.message || 'Không thể thay đổi vai trò');
        },
    });
}

/**
 * Hook để lấy danh sách departments
 */
export function useDepartments() {
    return useQuery({
        queryKey: ['departments'],
        queryFn: () => usersService.getDepartments(),
        staleTime: 30 * 60 * 1000, // 30 minutes
    });
}
