import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Bell, 
    Check, 
    CheckCheck, 
    Trash2, 
    Filter,
    Inbox,
    ChevronDown,
    RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Card, CardBody, Button, SkeletonCard } from '../../components/ui';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import './NotificationsPage.css';

/**
 * Full Notifications Page
 * Features: Filter tabs, date grouping, mark as read, delete
 */
export function NotificationsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { profile } = useAuthStore();
    const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
    const [selectedIds, setSelectedIds] = useState([]);

    // Fetch all notifications (no limit)
    const { data: notifications = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['notifications-all', profile?.id],
        queryFn: async () => {
            if (!profile?.id) return [];
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.id,
        staleTime: 1 * 60 * 1000,
    });

    // Realtime updates
    useEffect(() => {
        if (!profile?.id) return undefined;

        const channel = supabase
            .channel(`notifications-page-${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['notifications-all', profile.id] });
                    queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, queryClient]);

    // Mark single as read
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
            queryClient.invalidateQueries(['notifications-all']);
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
            queryClient.invalidateQueries(['notifications-all']);
        },
    });

    // Delete notification
    const deleteNotification = useMutation({
        mutationFn: async (notificationId) => {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['notifications-all']);
        },
    });

    // Delete selected
    const deleteSelected = useMutation({
        mutationFn: async (ids) => {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            setSelectedIds([]);
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['notifications-all']);
        },
    });

    // Filter notifications
    const filteredNotifications = useMemo(() => {
        switch (filter) {
            case 'unread':
                return notifications.filter(n => !n.is_read);
            case 'read':
                return notifications.filter(n => n.is_read);
            default:
                return notifications;
        }
    }, [notifications, filter]);

    // Group by date
    const groupedNotifications = useMemo(() => {
        const groups = {
            today: [],
            yesterday: [],
            earlier: []
        };

        filteredNotifications.forEach(n => {
            const date = new Date(n.created_at);
            if (isToday(date)) {
                groups.today.push(n);
            } else if (isYesterday(date)) {
                groups.yesterday.push(n);
            } else {
                groups.earlier.push(n);
            }
        });

        return groups;
    }, [filteredNotifications]);

    // Stats
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const totalCount = notifications.length;

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead.mutate(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) 
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedIds.length === filteredNotifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredNotifications.map(n => n.id));
        }
    };

    const renderNotificationItem = (notification) => (
        <div 
            key={notification.id}
            className={`notification-card ${!notification.is_read ? 'unread' : ''} ${selectedIds.includes(notification.id) ? 'selected' : ''}`}
        >
            <div className="notification-checkbox">
                <input 
                    type="checkbox"
                    checked={selectedIds.includes(notification.id)}
                    onChange={() => toggleSelect(notification.id)}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            <div 
                className="notification-content"
                onClick={() => handleNotificationClick(notification)}
            >
                <div className="notification-indicator">
                    {!notification.is_read && <span className="unread-dot" />}
                </div>
                
                <div className="notification-body">
                    <h4 className="notification-title">{notification.title}</h4>
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

            <div className="notification-actions">
                {!notification.is_read && (
                    <button
                        className="action-btn mark-read"
                        onClick={(e) => {
                            e.stopPropagation();
                            markAsRead.mutate(notification.id);
                        }}
                        title="Đánh dấu đã đọc"
                        disabled={markAsRead.isPending}
                    >
                        <Check size={16} />
                    </button>
                )}
                <button
                    className="action-btn delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification.mutate(notification.id);
                    }}
                    title="Xóa"
                    disabled={deleteNotification.isPending}
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );

    const renderDateGroup = (title, items) => {
        if (items.length === 0) return null;
        
        return (
            <div className="notification-group">
                <h3 className="group-title">{title}</h3>
                <div className="group-items">
                    {items.map(renderNotificationItem)}
                </div>
            </div>
        );
    };

    return (
        <div className="notifications-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>
                        <Bell size={28} />
                        Thông báo
                    </h1>
                    <p>
                        {unreadCount > 0 
                            ? `Bạn có ${unreadCount} thông báo chưa đọc`
                            : 'Tất cả thông báo đã được đọc'
                        }
                    </p>
                </div>

                <div className="page-header-actions">
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<RefreshCw size={16} className={isRefetching ? 'spinning' : ''} />}
                        onClick={() => refetch()}
                        disabled={isRefetching}
                    >
                        Làm mới
                    </Button>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<CheckCheck size={16} />}
                            onClick={() => markAllAsRead.mutate()}
                            disabled={markAllAsRead.isPending}
                        >
                            Đánh dấu tất cả đã đọc
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="notifications-toolbar">
                <div className="filter-tabs">
                    <button 
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Tất cả
                        <span className="tab-count">{totalCount}</span>
                    </button>
                    <button 
                        className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        Chưa đọc
                        {unreadCount > 0 && <span className="tab-count unread">{unreadCount}</span>}
                    </button>
                    <button 
                        className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
                        onClick={() => setFilter('read')}
                    >
                        Đã đọc
                    </button>
                </div>

                {selectedIds.length > 0 && (
                    <div className="bulk-actions">
                        <span className="selected-count">
                            Đã chọn {selectedIds.length}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 size={14} />}
                            onClick={() => deleteSelected.mutate(selectedIds)}
                            disabled={deleteSelected.isPending}
                            className="delete-btn"
                        >
                            Xóa
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="notifications-content">
                {isLoading ? (
                    <div className="notifications-loading">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                ) : filteredNotifications.length > 0 ? (
                    <div className="notifications-list">
                        {/* Select All Checkbox */}
                        <div className="select-all-row">
                            <label className="select-all-label">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0}
                                    onChange={selectAll}
                                />
                                <span>Chọn tất cả</span>
                            </label>
                        </div>

                        {renderDateGroup('Hôm nay', groupedNotifications.today)}
                        {renderDateGroup('Hôm qua', groupedNotifications.yesterday)}
                        {renderDateGroup('Trước đó', groupedNotifications.earlier)}
                    </div>
                ) : (
                    <div className="notifications-empty">
                        <div className="empty-illustration">
                            <Inbox size={64} strokeWidth={1} />
                        </div>
                        <h3>Không có thông báo</h3>
                        <p>
                            {filter === 'unread' 
                                ? 'Bạn đã đọc hết tất cả thông báo!'
                                : filter === 'read'
                                    ? 'Chưa có thông báo nào đã đọc'
                                    : 'Thông báo mới sẽ xuất hiện ở đây'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
