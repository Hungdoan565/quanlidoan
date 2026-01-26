import { useQuery } from '@tanstack/react-query';
import { statsService } from '../services/stats.service';

/**
 * Hook để lấy thống kê Admin Dashboard
 */
export function useAdminDashboardStats(sessionId = null) {
    return useQuery({
        queryKey: ['admin-stats', sessionId],
        queryFn: () => statsService.getAdminDashboardStats(sessionId),
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchInterval: 5 * 60 * 1000, // Auto refresh every 5 minutes
    });
}

/**
 * Hook để lấy hoạt động gần đây
 */
export function useRecentActivities(limit = 10) {
    return useQuery({
        queryKey: ['recent-activities', limit],
        queryFn: () => statsService.getRecentActivities(limit),
        staleTime: 1 * 60 * 1000, // 1 minute
        refetchInterval: 2 * 60 * 1000, // Auto refresh every 2 minutes
    });
}

/**
 * Hook để lấy danh sách sessions đang active
 */
export function useActiveSessions() {
    return useQuery({
        queryKey: ['active-sessions'],
        queryFn: () => statsService.getActiveSessions(),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy deadlines sắp tới
 */
export function useUpcomingDeadlines(sessionId) {
    return useQuery({
        queryKey: ['upcoming-deadlines', sessionId],
        queryFn: () => statsService.getUpcomingDeadlines(sessionId),
        enabled: !!sessionId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook để lấy cảnh báo admin
 */
export function useAdminAlerts(sessionId = null) {
    return useQuery({
        queryKey: ['admin-alerts', sessionId],
        queryFn: () => statsService.getAdminAlerts(sessionId),
        staleTime: 2 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });
}
