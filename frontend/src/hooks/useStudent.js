import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../services/student.service';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

/**
 * Hook để lấy thống kê Student Dashboard
 */
export function useStudentDashboard() {
    const { profile } = useAuthStore();
    const studentId = profile?.id;

    return useQuery({
        queryKey: ['student-dashboard', studentId],
        queryFn: () => studentService.getStudentDashboardStats(studentId),
        enabled: !!studentId,
        staleTime: 2 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
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
        queryFn: () => studentService.getMyTopic(studentId),
        enabled: !!studentId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy thông báo
 */
export function useStudentNotifications(limit = 5) {
    const { profile } = useAuthStore();
    const studentId = profile?.id;
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!studentId) return undefined;

        const channel = supabase
            .channel(`student-notifications-${studentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${studentId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['student-notifications', studentId, limit] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [studentId, limit, queryClient]);

    return useQuery({
        queryKey: ['student-notifications', studentId, limit],
        queryFn: () => studentService.getNotifications(studentId, limit),
        enabled: !!studentId,
        staleTime: 1 * 60 * 1000,
        refetchInterval: 2 * 60 * 1000,
    });
}
