import { supabase } from '../lib/supabase';

/**
 * Auth Logs Service - Quản lý audit trail cho authentication
 */
export const authLogsService = {
    /**
     * Ghi log auth event
     * @param {Object} params - Log parameters
     * @param {string} params.userId - User ID (optional for failed login)
     * @param {string} params.email - User email
     * @param {string} params.eventType - Event type: login_success, login_failed, logout, password_changed, password_reset_requested
     * @param {string} params.status - 'success' or 'failed'
     * @param {string} params.errorMessage - Error message if failed
     * @param {Object} params.metadata - Extra info (role, etc)
     */
    log: async ({ userId, email, eventType, status = 'success', errorMessage = null, metadata = {} }) => {
        try {
            const { error } = await supabase
                .from('auth_logs')
                .insert({
                    user_id: userId || null,
                    email: email || null,
                    event_type: eventType,
                    status,
                    error_message: errorMessage,
                    metadata,
                });

            if (error) {
                console.warn('[AuthLogs] Failed to log event:', error.message);
            }
        } catch (err) {
            // Don't throw - logging should not break the main flow
            console.warn('[AuthLogs] Error logging event:', err.message);
        }
    },

    /**
     * Lấy danh sách logs với filters và pagination
     * @param {Object} filters - Filter options
     * @param {number} page - Current page (1-indexed)
     * @param {number} limit - Items per page
     */
    getAll: async (filters = {}, page = 1, limit = 20) => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const search = (filters.search || '').trim();

        // Preload user ids for role/name filters to avoid broken embedded joins
        let roleUserIds = null;
        let nameUserIds = null;

        if (filters.role && filters.role !== 'all') {
            const { data: roleProfiles, error: roleError } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', filters.role);

            if (roleError) throw roleError;
            roleUserIds = (roleProfiles || []).map(p => p.id);

            // No users for this role -> no logs
            if (roleUserIds.length === 0) {
                return { data: [], total: 0 };
            }
        }

        if (search) {
            let profilesQuery = supabase
                .from('profiles')
                .select('id')
                .ilike('full_name', `%${search}%`);

            if (filters.role && filters.role !== 'all') {
                profilesQuery = profilesQuery.eq('role', filters.role);
            }

            const { data: nameProfiles, error: nameError } = await profilesQuery;
            if (nameError) throw nameError;
            nameUserIds = (nameProfiles || []).map(p => p.id);
        }

        let query = supabase
            .from('auth_logs')
            .select('*', { count: 'exact' });

        // Apply filters
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }
        if (filters.eventType) {
            query = query.eq('event_type', filters.eventType);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (roleUserIds) {
            query = query.in('user_id', roleUserIds);
        }
        if (search) {
            if (nameUserIds && nameUserIds.length > 0) {
                query = query.or(`email.ilike.%${search}%,user_id.in.(${nameUserIds.join(',')})`);
            } else {
                query = query.ilike('email', `%${search}%`);
            }
        }
        if (filters.dateFrom) {
            query = query.gte('created_at', filters.dateFrom);
        }
        if (filters.dateTo) {
            query = query.lte('created_at', filters.dateTo);
        }

        // Order and paginate
        query = query
            .order('created_at', { ascending: false })
            .range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        // Attach profiles for display (name/role)
        const userIds = (data || []).map(item => item.user_id).filter(Boolean);
        let profilesMap = {};
        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, role, student_code, teacher_code')
                .in('id', userIds);
            if (profilesError) throw profilesError;
            profilesMap = (profiles || []).reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
            }, {});
        }

        const enriched = (data || []).map(log => ({
            ...log,
            profiles: log.user_id ? (profilesMap[log.user_id] || null) : null,
        }));

        return {
            data: enriched,
            total: count || 0
        };
    },

    /**
     * Lấy thống kê tổng quan
     * @param {string} period - 'today', '7days', '30days'
     */
    getStats: async (period = '7days') => {
        let startDate;
        const now = new Date();

        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                break;
            case '7days':
                startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
                break;
            case '30days':
            default:
                startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();
                break;
        }

        const { data, error } = await supabase
            .from('auth_logs')
            .select('event_type, status, user_id, created_at')
            .gte('created_at', startDate);

        if (error) throw error;

        const stats = {
            loginSuccess: 0,
            loginFailed: 0,
            logout: 0,
            passwordChanged: 0,
            uniqueUsers: new Set(),
            byDay: {},
        };

        data?.forEach(log => {
            // Count by event type
            switch (log.event_type) {
                case 'login_success':
                    stats.loginSuccess++;
                    break;
                case 'login_failed':
                    stats.loginFailed++;
                    break;
                case 'logout':
                    stats.logout++;
                    break;
                case 'password_changed':
                    stats.passwordChanged++;
                    break;
            }

            // Track unique users
            if (log.user_id) {
                stats.uniqueUsers.add(log.user_id);
            }

            // Group by day for chart
            const day = new Date(log.created_at).toISOString().split('T')[0];
            if (!stats.byDay[day]) {
                stats.byDay[day] = { success: 0, failed: 0 };
            }
            if (log.status === 'success') {
                stats.byDay[day].success++;
            } else {
                stats.byDay[day].failed++;
            }
        });

        return {
            loginSuccess: stats.loginSuccess,
            loginFailed: stats.loginFailed,
            logout: stats.logout,
            passwordChanged: stats.passwordChanged,
            uniqueUsers: stats.uniqueUsers.size,
            chartData: Object.entries(stats.byDay)
                .map(([date, counts]) => ({
                    date,
                    success: counts.success,
                    failed: counts.failed,
                }))
                .sort((a, b) => a.date.localeCompare(b.date)),
        };
    },

    /**
     * Lấy cảnh báo (login failed nhiều lần, tài khoản không hoạt động)
     */
    getAlerts: async () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Get failed logins in last 24h grouped by email
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: failedLogins, error: failedError } = await supabase
            .from('auth_logs')
            .select('email, created_at')
            .eq('event_type', 'login_failed')
            .gte('created_at', oneDayAgo.toISOString())
            .order('created_at', { ascending: false });

        if (failedError) throw failedError;

        // Count failed attempts per email
        const failedByEmail = {};
        failedLogins?.forEach(log => {
            if (log.email) {
                failedByEmail[log.email] = (failedByEmail[log.email] || 0) + 1;
            }
        });

        // Filter emails with 3+ failed attempts
        const suspiciousLogins = Object.entries(failedByEmail)
            .filter(([_, count]) => count >= 3)
            .map(([email, count]) => ({ email, failedAttempts: count }));

        return {
            suspiciousLogins,
            suspiciousCount: suspiciousLogins.length,
        };
    },

    /**
     * Xóa logs cũ (manual cleanup)
     */
    cleanupOldLogs: async () => {
        const { error } = await supabase.rpc('cleanup_old_auth_logs');
        if (error) throw error;
        return true;
    },

    /**
     * Export logs to array for Excel
     */
    exportLogs: async (filters = {}) => {
        let query = supabase
            .from('auth_logs')
            .select('*');

        // Apply filters
        if (filters.dateFrom) {
            query = query.gte('created_at', filters.dateFrom);
        }
        if (filters.dateTo) {
            query = query.lte('created_at', filters.dateTo);
        }
        if (filters.eventType) {
            query = query.eq('event_type', filters.eventType);
        }

        query = query.order('created_at', { ascending: false }).limit(1000);

        const { data, error } = await query;
        if (error) throw error;

        const userIds = (data || []).map(item => item.user_id).filter(Boolean);
        let profilesMap = {};
        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, role, student_code, teacher_code')
                .in('id', userIds);
            if (profilesError) throw profilesError;
            profilesMap = (profiles || []).reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
            }, {});
        }

        return (data || []).map(log => ({
            ...log,
            profiles: log.user_id ? (profilesMap[log.user_id] || null) : null,
        }));
    },
};

export default authLogsService;
