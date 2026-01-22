import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    FileText,
    Clock,
    CheckCircle,
    ChevronRight,
    Bell,
    User,
    Upload
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useStudentDashboard, useStudentNotifications } from '../../hooks/useStudent';
import {
    Card,
    CardHeader,
    CardBody,
    StatusBadge,
    ProgressTimeline,
    CountdownCard,
    SkeletonCard
} from '../../components/ui';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import './DashboardPage.css';

export function StudentDashboard() {
    const navigate = useNavigate();
    const { profile } = useAuthStore();

    const { data: dashboard, isLoading } = useStudentDashboard();
    const { data: notifications = [] } = useStudentNotifications(5);

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
                        <Card className="topic-card" hover onClick={() => navigate('/student/topic')}>
                            <CardBody>
                                <div className="topic-header">
                                    <BookOpen size={24} className="topic-icon" />
                                    <StatusBadge status={dashboard.topic.status} />
                                </div>
                                <h3 className="topic-title">{dashboard.topic.title}</h3>
                                <div className="topic-info">
                                    <div className="topic-info-item">
                                        <User size={14} />
                                        <span>GV: {dashboard.topic.advisor?.full_name || dashboard.topic.teacher?.full_name || 'Chưa phân công'}</span>
                                    </div>
                                </div>
                                <div className="topic-action">
                                    <span>Xem chi tiết</span>
                                    <ChevronRight size={16} />
                                </div>
                            </CardBody>
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
                                    <Upload size={16} />
                                    Nộp báo cáo
                                </button>
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
                                                <Bell size={14} />
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
                                    <Bell size={32} className="empty-icon" />
                                    <p>Không có thông báo mới</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </>
            ) : (
                /* No Topic - Registration CTA */
                <Card className="no-topic-card">
                    <CardBody>
                        <div className="no-topic-content">
                            <div className="no-topic-icon">
                                <BookOpen size={48} />
                            </div>
                            <h2>Bạn chưa đăng ký đề tài</h2>
                            <p>Đăng ký đề tài để bắt đầu thực hiện đồ án của bạn</p>
                            <button
                                className="register-topic-btn"
                                onClick={() => navigate('/student/register')}
                            >
                                <BookOpen size={20} />
                                Đăng ký đề tài ngay
                            </button>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
