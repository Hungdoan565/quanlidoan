import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { 
    Dropdown, 
    DropdownTrigger, 
    DropdownContent,
    Badge 
} from '../ui';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import './NotificationDropdown.css';

/**
 * Notification Dropdown Component
 */
export function NotificationDropdown() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { profile } = useAuthStore();

    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', profile?.id],
        queryFn: async () => {
            if (!profile?.id) return [];
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.id,
        staleTime: 1 * 60 * 1000,
        refetchInterval: 2 * 60 * 1000,
    });

    // Realtime updates
    useEffect(() => {
        if (!profile?.id) return undefined;

        const channel = supabase
            .channel(`notifications-${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, queryClient]);

    // Mark as read mutation
    const markAsRead = useMutation({
        mutationFn: async (notificationId) => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        },
    });

    // Mark all as read
    const markAllAsRead = useMutation({
        mutationFn: async () => {
            if (!profile?.id) return;
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', profile.id)
                .eq('is_read', false);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        },
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead.mutate(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <Dropdown align="end">
            <DropdownTrigger>
                <div className="notification-trigger">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                </div>
            </DropdownTrigger>
            <DropdownContent minWidth={360} className="notification-dropdown">
                <div className="notification-header">
                    <h4>Thông báo</h4>
                    {unreadCount > 0 && (
                        <button 
                            className="mark-all-read-btn"
                            onClick={() => markAllAsRead.mutate()}
                            disabled={markAllAsRead.isPending}
                        >
                            <Check size={14} />
                            Đánh dấu đã đọc
                        </button>
                    )}
                </div>

                <div className="notification-list">
                    {isLoading ? (
                        <div className="notification-loading">Đang tải...</div>
                    ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <div 
                                key={notification.id}
                                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="notification-dot" />
                                <div className="notification-body">
                                    <p className="notification-title">{notification.title}</p>
                                    {notification.message && (
                                        <p className="notification-message">{notification.message}</p>
                                    )}
                                    <span className="notification-time">
                                        {formatDistanceToNow(new Date(notification.created_at), { 
                                            addSuffix: true, 
                                            locale: vi 
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="notification-empty">
                            <Bell size={32} className="empty-icon" />
                            <p>Không có thông báo</p>
                        </div>
                    )}
                </div>

                {notifications.length > 0 && (
                    <div className="notification-footer">
                        <button 
                            className="view-all-notifications"
                            onClick={() => navigate('/notifications')}
                        >
                            Xem tất cả thông báo
                        </button>
                    </div>
                )}
            </DropdownContent>
        </Dropdown>
    );
}
