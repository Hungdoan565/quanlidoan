import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ChevronDown, ChevronUp, FileText, BookOpen, CheckCircle, AlertTriangle, Users } from 'lucide-react';
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
 * Group notifications by type within a time window (24 hours)
 */
function groupNotifications(notifications) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const groups = {};
    const ungrouped = [];
    
    notifications.forEach(notification => {
        const config = NOTIFICATION_TYPE_CONFIG[notification.type];
        const notificationDate = new Date(notification.created_at);
        
        // Only group if: config says groupable AND within 24 hours
        if (config?.groupable && notificationDate > oneDayAgo) {
            const groupKey = notification.type;
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    type: notification.type,
                    items: [],
                    latestTime: notification.created_at,
                    hasUnread: false,
                };
            }
            groups[groupKey].items.push(notification);
            if (!notification.is_read) {
                groups[groupKey].hasUnread = true;
            }
            // Track latest time
            if (new Date(notification.created_at) > new Date(groups[groupKey].latestTime)) {
                groups[groupKey].latestTime = notification.created_at;
            }
        } else {
            ungrouped.push(notification);
        }
    });
    
    // Convert groups to array and sort by latest time
    const groupedArray = Object.values(groups)
        .filter(g => g.items.length > 0)
        .map(g => ({
            ...g,
            isGroup: true,
            id: `group-${g.type}`,
        }));
    
    // Combine and sort all by time
    const combined = [
        ...groupedArray.map(g => ({ ...g, sortTime: g.latestTime })),
        ...ungrouped.map(n => ({ ...n, isGroup: false, sortTime: n.created_at })),
    ];
    
    combined.sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime));
    
    return combined;
}

/**
 * Notification Dropdown Component with Grouping
 */
export function NotificationDropdown() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { profile } = useAuthStore();
    const [expandedGroups, setExpandedGroups] = useState(new Set());

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
                .limit(50); // Fetch more for grouping
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.id,
        staleTime: 1 * 60 * 1000,
        refetchInterval: 2 * 60 * 1000,
    });

    // Group notifications
    const groupedNotifications = useMemo(() => {
        return groupNotifications(notifications);
    }, [notifications]);

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

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead.mutate(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const handleGroupClick = (group) => {
        // Mark all in group as read
        const unreadIds = group.items.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length > 0) {
            markAsRead.mutate(unreadIds);
        }
        // Toggle expansion
        toggleGroup(group.id);
    };

    const renderGroupedNotification = (group) => {
        const config = NOTIFICATION_TYPE_CONFIG[group.type] || {};
        const Icon = config.icon || Bell;
        const isExpanded = expandedGroups.has(group.id);
        const title = config.groupTitle ? config.groupTitle(group.items.length) : `${group.items.length} thông báo`;

        return (
            <div key={group.id} className="notification-group">
                <div 
                    className={`notification-item notification-group-header ${group.hasUnread ? 'unread' : ''}`}
                    onClick={() => handleGroupClick(group)}
                >
                    <div className={`notification-icon notification-icon-${config.color || 'primary'}`}>
                        <Icon size={16} />
                    </div>
                    <div className="notification-body">
                        <p className="notification-title">{title}</p>
                        <span className="notification-time">
                            {formatDistanceToNow(new Date(group.latestTime), { 
                                addSuffix: true, 
                                locale: vi 
                            })}
                        </span>
                    </div>
                    <button className="notification-expand-btn" aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
                
                {isExpanded && (
                    <div className="notification-group-items">
                        {group.items.slice(0, 5).map(notification => (
                            <div 
                                key={notification.id}
                                className={`notification-item notification-subitem ${!notification.is_read ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="notification-dot" />
                                <div className="notification-body">
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
                        ))}
                        {group.items.length > 5 && (
                            <div className="notification-more">
                                +{group.items.length - 5} thông báo khác
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderSingleNotification = (notification) => {
        const config = NOTIFICATION_TYPE_CONFIG[notification.type] || {};
        const Icon = config.icon || Bell;

        return (
            <div 
                key={notification.id}
                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
            >
                <div className={`notification-icon notification-icon-${config.color || 'default'}`}>
                    <Icon size={16} />
                </div>
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
        );
    };

    return (
        <Dropdown align="end">
            <DropdownTrigger>
                <div className="notification-trigger">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </div>
            </DropdownTrigger>
            <DropdownContent minWidth={380} className="notification-dropdown">
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
                    ) : groupedNotifications.length > 0 ? (
                        groupedNotifications.slice(0, 10).map((item) => 
                            item.isGroup 
                                ? renderGroupedNotification(item)
                                : renderSingleNotification(item)
                        )
                    ) : (
                        <div className="notification-empty">
                            <Bell size={32} className="empty-icon" />
                            <p>Không có thông báo</p>
                        </div>
                    )}
                </div>

                {groupedNotifications.length > 0 && (
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
