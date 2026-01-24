import { useQuery } from '@tanstack/react-query';
import { teacherService } from '../services/teacher.service';
import { useAuthStore } from '../store/authStore';

/**
 * Hook để lấy thống kê Teacher Dashboard
 */
export function useTeacherDashboardStats() {
    const { profile } = useAuthStore();
    const teacherId = profile?.id;

    return useQuery({
        queryKey: ['teacher-stats', teacherId],
        queryFn: () => teacherService.getTeacherDashboardStats(teacherId),
        enabled: !!teacherId,
        staleTime: 2 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy danh sách việc cần làm
 */
export function useTeacherTodoList() {
    const { profile } = useAuthStore();
    const teacherId = profile?.id;

    return useQuery({
        queryKey: ['teacher-todos', teacherId],
        queryFn: () => teacherService.getTodoList(teacherId),
        enabled: !!teacherId,
        staleTime: 1 * 60 * 1000,
        refetchInterval: 3 * 60 * 1000,
    });
}

/**
 * Hook để lấy danh sách sinh viên đang hướng dẫn
 */
export function useGuidingStudents() {
    const { profile } = useAuthStore();
    const teacherId = profile?.id;

    return useQuery({
        queryKey: ['guiding-students', teacherId],
        queryFn: () => teacherService.getGuidingStudents(teacherId),
        enabled: !!teacherId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy đề tài mẫu
 */
export function useTemplateTopics() {
    const { profile } = useAuthStore();
    const teacherId = profile?.id;

    return useQuery({
        queryKey: ['template-topics', teacherId],
        queryFn: () => teacherService.getTemplateTopics(teacherId),
        enabled: !!teacherId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy danh sách lớp của teacher (là advisor)
 */
export function useMyClasses() {
    const { profile } = useAuthStore();
    const teacherId = profile?.id;

    return useQuery({
        queryKey: ['my-classes', teacherId],
        queryFn: () => teacherService.getMyClasses(teacherId),
        enabled: !!teacherId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy chi tiết sinh viên trong lớp
 */
export function useMyClassStudents(classId) {
    const { profile } = useAuthStore();
    const teacherId = profile?.id;

    return useQuery({
        queryKey: ['my-class-students', classId, teacherId],
        queryFn: () => teacherService.getClassStudents(classId, teacherId),
        enabled: !!classId && !!teacherId,
        staleTime: 2 * 60 * 1000,
    });
}
