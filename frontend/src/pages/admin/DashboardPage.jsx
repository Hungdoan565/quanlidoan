import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    CheckCircle,
    Clock,
    AlertTriangle,
    FileText,
    TrendingUp,
    Calendar,
    ChevronRight,
    BookOpen,
    Download,
    Loader2
} from 'lucide-react';
import { useAdminDashboardStats, useRecentActivities, useActiveSessions, useUpcomingDeadlines } from '../../hooks/useStats';
import { useUIStore } from '../../store/uiStore';
import { StatCard, SkeletonStatCard, Select, Card, CardHeader, CardBody, Badge, Button, Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '../../components/ui';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { exportService } from '../../services/export.service';
import { toast } from 'sonner';
import './DashboardPage.css';

// Status colors for charts
const STATUS_COLORS = {
    pending: '#f59e0b',
    approved: '#22c55e',
    in_progress: '#3b82f6',
    revision: '#f97316',
    submitted: '#8b5cf6',
    defended: '#06b6d4',
    completed: '#10b981',
    rejected: '#ef4444',
};

const STATUS_LABELS = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    in_progress: 'Đang làm',
    revision: 'Cần sửa',
    submitted: 'Đã nộp',
    defended: 'Đã bảo vệ',
    completed: 'Hoàn thành',
    rejected: 'Từ chối',
};

export function AdminDashboard() {
    const navigate = useNavigate();
    const { selectedSessionId, setSelectedSession } = useUIStore();
    const [exporting, setExporting] = useState(null);

    // Fetch data
    const { data: sessions = [], isLoading: sessionsLoading } = useActiveSessions();
    const { data: stats, isLoading: statsLoading, error: statsError } = useAdminDashboardStats(selectedSessionId);
    const { data: activities = [], isLoading: activitiesLoading } = useRecentActivities(8);
    const { data: deadlines = [] } = useUpcomingDeadlines(selectedSessionId);

    // Auto-select first session if none selected
    useEffect(() => {
        if (!selectedSessionId && sessions.length > 0) {
            setSelectedSession(sessions[0].id);
        }
    }, [sessions, selectedSessionId, setSelectedSession]);

    // Get current session name
    const currentSession = sessions.find(s => s.id === selectedSessionId);
    const sessionName = currentSession ? `${currentSession.name}_${currentSession.academic_year}` : 'TatCa';

    // Export handlers
    const handleExportTopics = async () => {
        setExporting('topics');
        try {
            const count = await exportService.exportTopics(selectedSessionId, sessionName);
            toast.success(`Đã xuất ${count} đề tài ra Excel`);
        } catch (error) {
            toast.error('Lỗi khi xuất dữ liệu: ' + error.message);
        } finally {
            setExporting(null);
        }
    };

    const handleExportTeacherWorkload = async () => {
        setExporting('teachers');
        try {
            const count = await exportService.exportTeacherWorkload(selectedSessionId, sessionName);
            toast.success(`Đã xuất tải lượng ${count} giảng viên`);
        } catch (error) {
            toast.error('Lỗi khi xuất dữ liệu: ' + error.message);
        } finally {
            setExporting(null);
        }
    };

    const handleExportFullReport = async () => {
        if (!selectedSessionId) {
            toast.error('Vui lòng chọn đợt đồ án để xuất báo cáo tổng hợp');
            return;
        }
        setExporting('full');
        try {
            const result = await exportService.exportFullSessionReport(selectedSessionId, sessionName);
            toast.success(`Đã xuất báo cáo: ${result.classCount} lớp, ${result.topicCount} đề tài`);
        } catch (error) {
            toast.error('Lỗi khi xuất dữ liệu: ' + error.message);
        } finally {
            setExporting(null);
        }
    };

    // Prepare chart data
    const pieChartData = stats ? Object.entries(stats.topicStats)
        .filter(([key, value]) => key !== 'total' && value > 0)
        .map(([key, value]) => ({
            name: STATUS_LABELS[key] || key,
            value,
            color: STATUS_COLORS[key] || '#94a3b8',
        })) : [];

    const barChartData = stats ? [
        { name: 'Chờ duyệt', value: stats.topicStats.pending, fill: STATUS_COLORS.pending },
        { name: 'Đang làm', value: stats.topicStats.in_progress, fill: STATUS_COLORS.in_progress },
        { name: 'Đã nộp', value: stats.topicStats.submitted, fill: STATUS_COLORS.submitted },
        { name: 'Hoàn thành', value: stats.topicStats.completed, fill: STATUS_COLORS.completed },
    ] : [];

    // Session options for dropdown
    const sessionOptions = sessions.map(s => ({
        value: s.id,
        label: `${s.name} (${s.academic_year} - HK${s.semester})`,
    }));

    const isLoading = statsLoading || sessionsLoading;

    return (
        <div className="dashboard-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Dashboard</h1>
                    <p>Tổng quan hệ thống quản lý đồ án</p>
                </div>
                <div className="page-header-actions">
                    <Dropdown>
                        <DropdownTrigger>
                            <Button 
                                variant="outline" 
                                disabled={exporting !== null}
                                leftIcon={exporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                            >
                                Xuất báo cáo
                            </Button>
                        </DropdownTrigger>
                        <DropdownContent align="end">
                            <DropdownItem onClick={handleExportTopics}>
                                <FileText size={16} />
                                Danh sách đề tài (Excel)
                            </DropdownItem>
                            <DropdownItem onClick={handleExportTeacherWorkload}>
                                <Users size={16} />
                                Tải lượng giảng viên (Excel)
                            </DropdownItem>
                            <DropdownItem onClick={handleExportFullReport} disabled={!selectedSessionId}>
                                <BookOpen size={16} />
                                Báo cáo tổng hợp đợt (Excel)
                            </DropdownItem>
                        </DropdownContent>
                    </Dropdown>
                    <Select
                        value={selectedSessionId || ''}
                        onChange={(e) => setSelectedSession(e.target.value || null)}
                        className="session-selector"
                    >
                        <option value="">-- Tất cả đợt --</option>
                        {sessionOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {isLoading ? (
                    <>
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                    </>
                ) : statsError ? (
                    <div className="error-card">Không thể tải dữ liệu thống kê</div>
                ) : (
                    <>
                        <StatCard
                            title="Tổng sinh viên"
                            value={stats?.totalStudents || 0}
                            icon={Users}
                            variant="primary"
                            subtitle={`${stats?.registrationRate || 0}% đã đăng ký đề tài`}
                            onClick={() => navigate('/admin/users?role=student')}
                            delay={0}
                        />
                        <StatCard
                            title="Đề tài đã duyệt"
                            value={(stats?.topicStats?.approved || 0) + (stats?.topicStats?.in_progress || 0) + (stats?.topicStats?.completed || 0)}
                            icon={CheckCircle}
                            variant="success"
                            subtitle="Đang thực hiện + Hoàn thành"
                            delay={0.1}
                        />
                        <StatCard
                            title="Chờ duyệt"
                            value={stats?.topicStats?.pending || 0}
                            icon={Clock}
                            variant="warning"
                            subtitle="Cần xử lý"
                            onClick={() => navigate('/admin/topics?status=pending')}
                            delay={0.2}
                        />
                        <StatCard
                            title="Cần chú ý"
                            value={(stats?.topicStats?.revision || 0) + (stats?.topicStats?.rejected || 0)}
                            icon={AlertTriangle}
                            variant="danger"
                            subtitle="Yêu cầu sửa + Từ chối"
                            delay={0.3}
                        />
                    </>
                )}
            </div>

            {/* Charts Row */}
            <div className="dashboard-charts">
                {/* Status Distribution Pie Chart */}
                <Card className="chart-card">
                    <CardHeader>
                        <h3>Phân bổ theo trạng thái</h3>
                    </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <div className="chart-loading">Đang tải...</div>
                        ) : pieChartData.length > 0 ? (
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="chart-legend">
                                    {pieChartData.map((entry, index) => (
                                        <div key={index} className="legend-item">
                                            <span className="legend-dot" style={{ backgroundColor: entry.color }} />
                                            <span className="legend-label">{entry.name}</span>
                                            <span className="legend-value">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="chart-empty">Chưa có dữ liệu đề tài</div>
                        )}
                    </CardBody>
                </Card>

                {/* Progress Bar Chart */}
                <Card className="chart-card">
                    <CardHeader>
                        <h3>Tiến độ tổng quan</h3>
                    </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <div className="chart-loading">Đang tải...</div>
                        ) : barChartData.some(d => d.value > 0) ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={barChartData} layout="vertical">
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={80} />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">Chưa có dữ liệu tiến độ</div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="dashboard-bottom">
                {/* Recent Activities */}
                <Card className="activities-card">
                    <CardHeader>
                        <h3>Hoạt động gần đây</h3>
                    </CardHeader>
                    <CardBody className="activities-body">
                        {activitiesLoading ? (
                            <div className="activities-loading">Đang tải...</div>
                        ) : activities.length > 0 ? (
                            <ul className="activities-list">
                                {activities.map((activity, index) => (
                                    <li key={activity.id || index} className="activity-item">
                                        <div className="activity-icon">
                                            <FileText size={16} />
                                        </div>
                                        <div className="activity-content">
                                            <span className="activity-actor">{activity.actor}</span>
                                            <span className="activity-action">{activity.action}</span>
                                            {activity.title && (
                                                <span className="activity-title">"{activity.title}"</span>
                                            )}
                                        </div>
                                        <span className="activity-time">
                                            {formatDistanceToNow(new Date(activity.timestamp), {
                                                addSuffix: true,
                                                locale: vi
                                            })}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="activities-empty">
                                <p>Chưa có hoạt động nào</p>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Upcoming Deadlines */}
                <Card className="deadlines-card">
                    <CardHeader>
                        <h3>Deadline sắp tới</h3>
                    </CardHeader>
                    <CardBody className="deadlines-body">
                        {deadlines.length > 0 ? (
                            <ul className="deadlines-list">
                                {deadlines.filter(d => !d.isPast).slice(0, 5).map((deadline, index) => (
                                    <li key={deadline.key} className={`deadline-item ${deadline.isUrgent ? 'urgent' : ''}`}>
                                        <div className="deadline-icon">
                                            <Calendar size={16} />
                                        </div>
                                        <div className="deadline-content">
                                            <span className="deadline-label">{deadline.label}</span>
                                            <span className="deadline-date">
                                                {format(new Date(deadline.date), 'dd/MM/yyyy', { locale: vi })}
                                            </span>
                                        </div>
                                        <Badge variant={deadline.isUrgent ? 'danger' : 'default'}>
                                            {deadline.daysLeft === 0 ? 'Hôm nay' : `${deadline.daysLeft} ngày`}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="deadlines-empty">
                                {selectedSessionId ? (
                                    <p>Không có deadline sắp tới</p>
                                ) : (
                                    <p>Chọn một đợt đồ án để xem deadline</p>
                                )}
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Quick Stats */}
                <Card className="quick-stats-card">
                    <CardHeader>
                        <h3>Thống kê nhanh</h3>
                    </CardHeader>
                    <CardBody>
                        <div className="quick-stats-grid">
                            <div className="quick-stat">
                                <Users size={20} className="quick-stat-icon" />
                                <div className="quick-stat-info">
                                    <span className="quick-stat-value">{stats?.totalTeachers || 0}</span>
                                    <span className="quick-stat-label">Giảng viên</span>
                                </div>
                            </div>
                            <div className="quick-stat">
                                <BookOpen size={20} className="quick-stat-icon" />
                                <div className="quick-stat-info">
                                    <span className="quick-stat-value">{stats?.totalClasses || 0}</span>
                                    <span className="quick-stat-label">Lớp học</span>
                                </div>
                            </div>
                            <div className="quick-stat">
                                <FileText size={20} className="quick-stat-icon" />
                                <div className="quick-stat-info">
                                    <span className="quick-stat-value">{stats?.topicStats?.total || 0}</span>
                                    <span className="quick-stat-label">Tổng đề tài</span>
                                </div>
                            </div>
                            <div className="quick-stat">
                                <TrendingUp size={20} className="quick-stat-icon" />
                                <div className="quick-stat-info">
                                    <span className="quick-stat-value">{stats?.registrationRate || 0}%</span>
                                    <span className="quick-stat-label">Tỉ lệ ĐK</span>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
