import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, FileText, BookOpen, CheckCircle, AlertTriangle, Users, X, RefreshCw, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import './NotificationDropdown.css';

// Notification type configuration for grouping
const NOTIFICATION_TYPE_CONFIG = {
    // Teacher notifications - these get grouped
    logbook_submitted: {
        icon: BookOpen,
        color: 'primary',
        groupTitle: (count) => `${count} nhật ký mới cần duyệt`,
        groupable: true,
    },
    report_submitted: {
        icon: FileText,
        color: 'primary',
        groupTitle: (count) => `${count} báo cáo mới`,
        groupable: true,
    },
    new_topic_registration: {
        icon: Users,
        color: 'warning',
        groupTitle: (count) => `${count} đề tài mới đăng ký`,
        groupable: true,
    },
    // Student notifications - don't group (personal)
    logbook_approved: {
        icon: CheckCircle,
        color: 'success',
        groupable: false,
    },
    logbook_revision: {
        icon: AlertTriangle,
        color: 'warning',
        groupable: false,
    },
    topic_approved: {
        icon: CheckCircle,
        color: 'success',
        groupable: false,
    },
    topic_revision: {
        icon: AlertTriangle,
        color: 'warning',
        groupable: false,
    },
    topic_rejected: {
        icon: AlertTriangle,
        color: 'danger',
        groupable: false,
    },
};

/**
 * Notification Dropdown Component with Grouping
 */
export function NotificationDropdown() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { profile } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [filter, setFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState([]);

    // Fetch notifications
    const { data: notifications = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['notifications', profile?.id],
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
        refetchInterval: 2 * 60 * 1000,
    });

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
        mutationFn: async (notificationIds) => {
            const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', ids);
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
    const totalCount = notifications.length;

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead.mutate(notification.id);
        }
        setIsOpen(false);
        setShowAll(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };
    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => {
        if (!filteredNotifications.length) return;
        if (selectedIds.length === filteredNotifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredNotifications.map(n => n.id));
        }
    };

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

    useEffect(() => {
        setSelectedIds([]);
    }, [filter]);

    const renderSingleNotification = (notification) => {
        const config = NOTIFICATION_TYPE_CONFIG[notification.type] || {};
        const Icon = config.icon || Bell;

        return (
            <div 
                key={notification.id}
                className={`notification-item ${!notification.is_read ? 'unread' : ''} ${selectedIds.includes(notification.id) ? 'selected' : ''}`}
            >
                <label className="notification-checkbox" onClick={(event) => event.stopPropagation()}>
                    <input 
                        type="checkbox"
                        checked={selectedIds.includes(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                    />
                </label>
                <div className={`notification-icon notification-icon-${config.color || 'default'}`}>
                    <Icon size={16} />
                </div>
                <div className="notification-body" onClick={() => handleNotificationClick(notification)}>
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
        );
    };

    useEffect(() => {
        const handleOpen = (event) => {
            setIsOpen(true);
            if (event?.detail?.showAll) {
                setShowAll(true);
            }
        };

        window.addEventListener('open-notification-sidebar', handleOpen);
        return () => window.removeEventListener('open-notification-sidebar', handleOpen);
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setShowAll(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const visibleNotifications = showAll
        ? filteredNotifications
        : filteredNotifications.slice(0, 10);

    return (
        <>
            <button
                type="button"
                className="notification-trigger"
                aria-label="Thông báo"
                onClick={() => {
                    setIsOpen(true);
                    setShowAll(false);
                }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            <div
                className={`notification-sidebar-overlay ${isOpen ? 'open' : ''}`}
                onClick={() => {
                    setIsOpen(false);
                    setShowAll(false);
                }}
                aria-hidden="true"
            />

            <aside
                className={`notification-sidebar ${isOpen ? 'open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label="Thông báo"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h4>Thông báo</h4>
                        <div className="notification-header-actions">
                            <button 
                                className="notification-refresh-btn"
                                onClick={() => refetch()}
                                disabled={isRefetching}
                            >
                                <RefreshCw size={14} />
                                {isRefetching ? 'Đang làm mới' : 'Làm mới'}
                            </button>
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
                            <button
                                type="button"
                                className="notification-close-btn"
                                aria-label="Đóng thông báo"
                                onClick={() => {
                                    setIsOpen(false);
                                    setShowAll(false);
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="notification-toolbar">
                        <div className="notification-filters">
                            <button
                                className={`notification-filter-btn ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                Tất cả
                                <span className="notification-filter-count">{totalCount}</span>
                            </button>
                            <button
                                className={`notification-filter-btn ${filter === 'unread' ? 'active' : ''}`}
                                onClick={() => setFilter('unread')}
                            >
                                Chưa đọc
                                <span className="notification-filter-count">{unreadCount}</span>
                            </button>
                            <button
                                className={`notification-filter-btn ${filter === 'read' ? 'active' : ''}`}
                                onClick={() => setFilter('read')}
                            >
                                Đã đọc
                                <span className="notification-filter-count">{Math.max(totalCount - unreadCount, 0)}</span>
                            </button>
                        </div>

                        <div className="notification-selection">
                            <label className="notification-select-all">
                                <input
                                    type="checkbox"
                                    checked={filteredNotifications.length > 0 && selectedIds.length === filteredNotifications.length}
                                    onChange={selectAll}
                                />
                                Chọn tất cả
                            </label>
                            {selectedIds.length > 0 && (
                                <button
                                    className="notification-delete-btn"
                                    onClick={() => deleteSelected.mutate(selectedIds)}
                                    disabled={deleteSelected.isPending}
                                >
                                    <Trash2 size={14} />
                                    Xóa
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="notification-list">
                        {isLoading ? (
                            <div className="notification-loading">Đang tải…</div>
                        ) : visibleNotifications.length > 0 ? (
                            visibleNotifications.map((item) => renderSingleNotification(item))
                        ) : (
                            <div className="notification-empty">
                                <Bell size={32} className="empty-icon" />
                                <p>Không có thông báo</p>
                            </div>
                        )}
                    </div>

                    {filteredNotifications.length > 0 && (
                        <div className="notification-footer">
                            <button 
                                className="view-all-notifications"
                                onClick={() => setShowAll(prev => !prev)}
                            >
                                {showAll ? 'Thu gọn' : 'Xem tất cả thông báo'}
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
