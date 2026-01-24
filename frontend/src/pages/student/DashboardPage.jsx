import { useNavigate, Link } from 'react-router-dom';
import {
    BookOpen,
    FileText,
    Clock,
    CheckCircle,
    ChevronRight,
    Bell,
    User,
    Upload,
    AlertCircle,
    Award,
    Calendar,
    Lock
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useStudentDashboard, useStudentNotifications } from '../../hooks/useStudent';
import { useStudentClass } from '../../hooks/useTopics';
import { topicsService } from '../../services/topics.service';
import {
    Card,
    CardHeader,
    CardBody,
    StatusBadge,
    ProgressTimeline,
    CountdownCard,
    SkeletonCard,
    Badge
} from '../../components/ui';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import './DashboardPage.css';

export function StudentDashboard() {
    const navigate = useNavigate();
    const { profile } = useAuthStore();

    const { data: dashboard, isLoading } = useStudentDashboard();
    const { data: notifications = [] } = useStudentNotifications(5);
    const { data: studentClass } = useStudentClass();

    // Check registration status
    const isRegistrationOpen = studentClass?.session
        ? topicsService.isRegistrationOpen(studentClass.session)
        : false;
    
    const registrationEnd = studentClass?.session?.registration_end
        ? new Date(studentClass.session.registration_end)
        : null;
    
    const daysUntilRegistrationEnd = registrationEnd
        ? differenceInDays(registrationEnd, new Date())
        : null;

    // Generate reminders based on status
    const getReminders = () => {
        const reminders = [];
        
        if (dashboard?.hasTopic) {
            const topic = dashboard.topic;
            
            // Reminder: Revision needed
            if (topic.status === 'revision') {
                reminders.push({
                    type: 'warning',
                    icon: AlertCircle,
                    message: 'Đề tài cần chỉnh sửa theo yêu cầu của GV',
                    action: () => navigate('/student/topic'),
                    actionLabel: 'Xem chi tiết'
                });
            }
            
            // Reminder: Check logbook weekly
            if (['approved', 'in_progress'].includes(topic.status)) {
                reminders.push({
                    type: 'info',
                    icon: BookOpen,
                    message: 'Nhớ cập nhật nhật ký đồ án hàng tuần',
                    action: () => navigate('/student/logbook'),
                    actionLabel: 'Ghi nhật ký'
                });
            }
            
            // Reminder: Upcoming deadline (within 7 days)
            if (dashboard.nextDeadline) {
                const daysLeft = differenceInDays(new Date(dashboard.nextDeadline.date), new Date());
                if (daysLeft <= 7 && daysLeft >= 0) {
                    reminders.push({
                        type: daysLeft <= 3 ? 'danger' : 'warning',
                        icon: Clock,
                        message: `${dashboard.nextDeadline.label} còn ${daysLeft} ngày`,
                        action: () => navigate('/student/reports'),
                        actionLabel: 'Nộp báo cáo'
                    });
                }
            }
            
            // Reminder: View grades if completed
            if (['defended', 'completed'].includes(topic.status)) {
                reminders.push({
                    type: 'success',
                    icon: Award,
                    message: 'Đồ án đã hoàn thành - Xem kết quả điểm',
                    action: () => navigate('/student/grades'),
                    actionLabel: 'Xem điểm'
                });
            }
        } else {
            // No topic yet - registration reminder
            if (isRegistrationOpen) {
                if (daysUntilRegistrationEnd !== null && daysUntilRegistrationEnd <= 7) {
                    reminders.push({
                        type: 'warning',
                        icon: Clock,
                        message: `Hạn đăng ký còn ${daysUntilRegistrationEnd} ngày!`,
                        action: () => navigate('/student/register'),
                        actionLabel: 'Đăng ký ngay'
                    });
                }
            }
        }
        
        return reminders;
    };

    const reminders = getReminders();

    return (
        <div className="dashboard-page student-dashboard">
            {/* Welcome Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Xin chào, {profile?.full_name || 'Sinh viên'}</h1>
                    <p>
                        {profile?.student_code && <span className="student-code">MSSV: {profile.student_code} • </span>}
                        Theo dõi tiến độ đồ án của bạn
                    </p>
                </div>
            </div>

            {/* Reminders Section */}
            {reminders.length > 0 && (
                <div className="reminders-section">
                    {reminders.map((reminder, index) => {
                        const ReminderIcon = reminder.icon;
                        return (
                            <div key={index} className={`reminder-card reminder-${reminder.type}`}>
                                <div className="reminder-icon">
                                    <ReminderIcon size={18}  aria-hidden="true" />
                                </div>
                                <span className="reminder-message">{reminder.message}</span>
                                {reminder.action && (
                                    <button 
                                        className="reminder-action"
                                        onClick={reminder.action}
                                    >
                                        {reminder.actionLabel}
                                        <ChevronRight size={14}  aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {isLoading ? (
                <div className="dashboard-loading">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : dashboard?.hasTopic ? (
                <>
                    {/* Progress Timeline */}
                    <Card className="timeline-card">
                        <CardHeader>
                            <h3>Timeline Đồ án</h3>
                        </CardHeader>
                        <CardBody>
                            <ProgressTimeline steps={dashboard.progress} />
                        </CardBody>
                    </Card>

                    {/* Main Content Grid */}
                    <div className="student-dashboard-grid">
                        {/* Deadline Card */}
                        {dashboard.nextDeadline && (
                            <CountdownCard
                                targetDate={dashboard.nextDeadline.date}
                                title={dashboard.nextDeadline.label}
                                subtitle={`Hạn: ${format(new Date(dashboard.nextDeadline.date), 'dd/MM/yyyy', { locale: vi })}`}
                                onAction={() => navigate('/student/reports')}
                                actionLabel="Nộp báo cáo"
                                className="deadline-countdown"
                            />
                        )}

                        {/* Topic Info Card */}
                        <Card className="topic-card" hover>
                            <Link to="/student/topic" className="topic-card-link">
                                <CardBody>
                                    <div className="topic-header">
                                        <BookOpen size={24} className="topic-icon"  aria-hidden="true" />
                                        <StatusBadge status={dashboard.topic.status} />
                                    </div>
                                    <h3 className="topic-title">{dashboard.topic.title}</h3>
                                    <div className="topic-info">
                                        <div className="topic-info-item">
                                            <User size={14}  aria-hidden="true" />
                                            <span>GV: {dashboard.topic.advisor?.full_name || dashboard.topic.teacher?.full_name || 'Chưa phân công'}</span>
                                        </div>
                                    </div>
                                    <div className="topic-action">
                                        <span>Xem chi tiết</span>
                                        <ChevronRight size={16}  aria-hidden="true" />
                                    </div>
                                </CardBody>
                            </Link>
                        </Card>

                        {/* Progress Stats */}
                        <Card className="progress-card">
                            <CardBody>
                                <h4 className="progress-card-title">Tiến độ nộp báo cáo</h4>
                                <div className="progress-stats">
                                    <div className="progress-stat">
                                        <span className="progress-stat-value">
                                            {dashboard.reportsSubmitted}/{dashboard.totalReports}
                                        </span>
                                        <span className="progress-stat-label">Báo cáo đã nộp</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${(dashboard.reportsSubmitted / dashboard.totalReports) * 100}%`
                                            }}
                                        />
                                    </div>
                                </div>
                                <button
                                    className="upload-btn"
                                    onClick={() => navigate('/student/reports')}
                                >
                                    <Upload size={16}  aria-hidden="true" />
                                    Nộp báo cáo
                                </button>
                            </CardBody>
                        </Card>

                        {/* Quick Actions */}
                        <Card className="quick-actions-card">
                            <CardBody>
                                <h4 className="quick-actions-title">Truy cập nhanh</h4>
                                <div className="quick-actions-grid">
                                    <button 
                                        className="quick-action-btn"
                                        onClick={() => navigate('/student/logbook')}
                                    >
                                        <BookOpen size={20}  aria-hidden="true" />
                                        <span>Nhật ký</span>
                                    </button>
                                    <button 
                                        className="quick-action-btn"
                                        onClick={() => navigate('/student/reports')}
                                    >
                                        <FileText size={20}  aria-hidden="true" />
                                        <span>Báo cáo</span>
                                    </button>
                                    <button 
                                        className="quick-action-btn"
                                        onClick={() => navigate('/student/grades')}
                                    >
                                        <Award size={20}  aria-hidden="true" />
                                        <span>Điểm</span>
                                    </button>
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    {/* Notifications */}
                    <Card className="notifications-card">
                        <CardHeader>
                            <div className="card-header-with-action">
                                <h3>Thông báo mới</h3>
                                <button
                                    className="view-all-btn"
                                    onClick={() => navigate('/notifications')}
                                >
                                    Xem tất cả
                                </button>
                            </div>
                        </CardHeader>
                        <CardBody className="notifications-body">
                            {notifications.length > 0 ? (
                                <ul className="notifications-list">
                                    {notifications.map((notif) => (
                                        <li key={notif.id} className="notification-item">
                                            <div className="notification-icon">
                                                <Bell size={14}  aria-hidden="true" />
                                            </div>
                                            <div className="notification-content">
                                                <span className="notification-message">{notif.message}</span>
                                                <span className="notification-time">
                                                    {formatDistanceToNow(new Date(notif.created_at), {
                                                        addSuffix: true,
                                                        locale: vi
                                                    })}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-notifications">
                                    <Bell size={32} className="empty-icon"  aria-hidden="true" />
                                    <p>Không có thông báo mới</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </>
            ) : (
                /* No Topic - Registration CTA with status */
                <Card className="no-topic-card">
                    <CardBody>
                        <div className="no-topic-content">
                            <div className="no-topic-icon">
                                <BookOpen size={48}  aria-hidden="true" />
                            </div>
                            <h2>Bạn chưa đăng ký đề tài</h2>
                            
                            {/* Registration Status */}
                            {studentClass?.session ? (
                                <div className="registration-status">
                                    {isRegistrationOpen ? (
                                        <>
                                            <Badge variant="success" className="status-badge">
                                                <CheckCircle size={12}  aria-hidden="true" />
                                                Đang mở đăng ký
                                            </Badge>
                                            {registrationEnd && (
                                                <p className="registration-deadline">
                                                    <Calendar size={14}  aria-hidden="true" />
                                                    Hạn đăng ký: {format(registrationEnd, 'dd/MM/yyyy HH:mm', { locale: vi })}
                                                    {daysUntilRegistrationEnd !== null && daysUntilRegistrationEnd <= 7 && (
                                                        <span className="deadline-warning"> (còn {daysUntilRegistrationEnd} ngày)</span>
                                                    )}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Badge variant="danger" className="status-badge">
                                                <Lock size={12}  aria-hidden="true" />
                                                Chưa mở / Đã hết hạn đăng ký
                                            </Badge>
                                            <p className="registration-closed-info">
                                                {studentClass.session.registration_start && new Date() < new Date(studentClass.session.registration_start)
                                                    ? `Thời gian đăng ký bắt đầu từ ${format(new Date(studentClass.session.registration_start), 'dd/MM/yyyy', { locale: vi })}`
                                                    : 'Thời gian đăng ký đã kết thúc. Vui lòng liên hệ Admin.'
                                                }
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <p className="no-class-warning">
                                    <AlertCircle size={16}  aria-hidden="true" />
                                    Bạn chưa được phân vào lớp đồ án. Vui lòng liên hệ Admin.
                                </p>
                            )}
                            
                            <button
                                className="register-topic-btn"
                                onClick={() => navigate('/student/register')}
                                disabled={!isRegistrationOpen}
                            >
                                <BookOpen size={20}  aria-hidden="true" />
                                {isRegistrationOpen ? 'Đăng ký đề tài ngay' : 'Không thể đăng ký'}
                            </button>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
