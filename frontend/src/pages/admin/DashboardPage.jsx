import { useEffect, useState, useMemo } from 'react';
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
import { useAdminDashboardStats, useRecentActivities, useActiveSessions, useUpcomingDeadlines, useAdminAlerts } from '../../hooks/useStats';
import { useUIStore } from '../../store/uiStore';
import { StatCard, SkeletonStatCard, CustomSelect, Card, CardHeader, CardBody, Badge, Button, Dropdown, DropdownTrigger, DropdownContent, DropdownItem, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input } from '../../components/ui';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { exportService } from '../../services/export.service';
import { exportToExcel } from '../../utils/excel';
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
    const [activeAlert, setActiveAlert] = useState(null);
    const [alertClassFilter, setAlertClassFilter] = useState('');
    const [alertSearch, setAlertSearch] = useState('');

    // Fetch data
    const { data: sessions = [], isLoading: sessionsLoading } = useActiveSessions();
    const { data: stats, isLoading: statsLoading, error: statsError } = useAdminDashboardStats(selectedSessionId);
    const { data: alerts, isLoading: alertsLoading } = useAdminAlerts(selectedSessionId);
    const { data: activities = [], isLoading: activitiesLoading } = useRecentActivities(8);
    const { data: deadlines = [] } = useUpcomingDeadlines(selectedSessionId);

    // Reset invalid selected session (fallback to "all")
    useEffect(() => {
        if (sessions.length === 0) {
            if (selectedSessionId) setSelectedSession(null);
            return;
        }

        if (selectedSessionId && !sessions.some(s => s.id === selectedSessionId)) {
            setSelectedSession(null);
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

    // Prepare chart data - memoized for performance
    const pieChartData = useMemo(() => {
        if (!stats) return [];
        return Object.entries(stats.topicStats)
            .filter(([key, value]) => key !== 'total' && value > 0)
            .map(([key, value]) => ({
                name: STATUS_LABELS[key] || key,
                value,
                color: STATUS_COLORS[key] || '#94a3b8',
            }));
    }, [stats]);

    const barChartData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'Chờ duyệt', value: stats.topicStats.pending, fill: STATUS_COLORS.pending },
            { name: 'Đang làm', value: stats.topicStats.in_progress, fill: STATUS_COLORS.in_progress },
            { name: 'Đã nộp', value: stats.topicStats.submitted, fill: STATUS_COLORS.submitted },
            { name: 'Hoàn thành', value: stats.topicStats.completed, fill: STATUS_COLORS.completed },
        ];
    }, [stats]);

    // Session options for dropdown - memoized
    const sessionOptions = useMemo(() => sessions.map(s => ({
        value: s.id,
        label: `${s.name} (${s.academic_year} - HK${s.semester})`,
    })), [sessions]);

    const alertSessionOptions = useMemo(() => ([
        { value: '', label: '-- Tất cả đợt --' },
        ...sessionOptions
    ]), [sessionOptions]);

    useEffect(() => {
        if (activeAlert) {
            setAlertClassFilter('');
            setAlertSearch('');
        }
    }, [activeAlert]);

    const isLoading = statsLoading || sessionsLoading;
    const missingLogbookItems = alerts?.missingLogbook?.items || [];
    const overdueReportItems = alerts?.overdueReports?.items || [];
    const missingLogbookCount = alerts?.missingLogbook?.count || 0;
    const overdueReportCount = alerts?.overdueReports?.count || 0;

    const logbookClassOptions = useMemo(() => {
        const map = new Map();
        missingLogbookItems.forEach(item => {
            if (!item.classId) return;
            const label = item.classCode || item.className || 'Lớp';
            map.set(item.classId, label);
        });
        return [{ value: '', label: 'Tất cả lớp' }, ...Array.from(map.entries()).map(([value, label]) => ({ value, label }))];
    }, [missingLogbookItems]);

    const reportClassOptions = useMemo(() => {
        const map = new Map();
        overdueReportItems.forEach(item => {
            if (!item.classId) return;
            const label = item.classCode || item.className || 'Lớp';
            map.set(item.classId, label);
        });
        return [{ value: '', label: 'Tất cả lớp' }, ...Array.from(map.entries()).map(([value, label]) => ({ value, label }))];
    }, [overdueReportItems]);

    const filteredLogbookItems = useMemo(() => {
        const keyword = alertSearch.trim().toLowerCase();
        return missingLogbookItems.filter(item => {
            if (alertClassFilter && item.classId !== alertClassFilter) return false;
            if (!keyword) return true;
            return [
                item.studentName,
                item.studentCode,
                item.topicTitle,
                item.classCode,
                item.className,
            ].some(value => (value || '').toString().toLowerCase().includes(keyword));
        });
    }, [missingLogbookItems, alertClassFilter, alertSearch]);

    const filteredReportItems = useMemo(() => {
        const keyword = alertSearch.trim().toLowerCase();
        return overdueReportItems.filter(item => {
            if (alertClassFilter && item.classId !== alertClassFilter) return false;
            if (!keyword) return true;
            return [
                item.studentName,
                item.studentCode,
                item.topicTitle,
                item.phaseLabel,
                item.classCode,
                item.className,
            ].some(value => (value || '').toString().toLowerCase().includes(keyword));
        });
    }, [overdueReportItems, alertClassFilter, alertSearch]);

    const handleExportAlerts = () => {
        const today = new Date().toISOString().slice(0, 10);
        if (activeAlert === 'logbook') {
            const data = filteredLogbookItems.map((item, index) => ({
                stt: index + 1,
                mssv: item.studentCode || '',
                sinhVien: item.studentName,
                lop: item.classCode || item.className || '',
                deTai: item.topicTitle || '',
                tuan: item.weekNumber,
                capNhat: item.lastEntryAt ? format(new Date(item.lastEntryAt), 'dd/MM/yyyy', { locale: vi }) : '',
            }));
            exportToExcel(data, `CanhBao_ThieuNhatKy_${sessionName}_${today}`, {
                sheetName: 'Thiếu nhật ký',
                columnHeaders: {
                    stt: 'STT',
                    mssv: 'MSSV',
                    sinhVien: 'Sinh viên',
                    lop: 'Lớp',
                    deTai: 'Đề tài',
                    tuan: 'Tuần',
                    capNhat: 'Cập nhật gần nhất',
                },
                columnWidths: { A: 5, B: 12, C: 25, D: 15, E: 40, F: 8, G: 18 },
            });
        } else if (activeAlert === 'reports') {
            const data = filteredReportItems.map((item, index) => ({
                stt: index + 1,
                mssv: item.studentCode || '',
                sinhVien: item.studentName,
                lop: item.classCode || item.className || '',
                deTai: item.topicTitle || '',
                baoCao: item.phaseLabel,
                han: item.deadline ? format(new Date(item.deadline), 'dd/MM/yyyy', { locale: vi }) : '',
                tre: item.daysLate,
            }));
            exportToExcel(data, `CanhBao_BaoCaoTre_${sessionName}_${today}`, {
                sheetName: 'Báo cáo trễ',
                columnHeaders: {
                    stt: 'STT',
                    mssv: 'MSSV',
                    sinhVien: 'Sinh viên',
                    lop: 'Lớp',
                    deTai: 'Đề tài',
                    baoCao: 'Báo cáo',
                    han: 'Hạn',
                    tre: 'Trễ (ngày)',
                },
                columnWidths: { A: 5, B: 12, C: 25, D: 15, E: 40, F: 18, G: 12, H: 10 },
            });
        }
    };

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
                        <DropdownTrigger asChild>
                            {({ onClick, 'aria-expanded': ariaExpanded }) => (
                                <Button 
                                    variant="outline" 
                                    disabled={exporting !== null}
                                    leftIcon={exporting ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
                                    onClick={onClick}
                                    aria-expanded={ariaExpanded}
                                    aria-haspopup="menu"
                                >
                                    Xuất báo cáo
                                </Button>
                            )}
                        </DropdownTrigger>
                        <DropdownContent align="end">
<DropdownItem onClick={handleExportTopics}>
                                <FileText size={16} aria-hidden="true" />
                                Danh sách đề tài (Excel)
                            </DropdownItem>
                            <DropdownItem onClick={handleExportTeacherWorkload}>
                                <Users size={16} aria-hidden="true" />
                                Tải lượng giảng viên (Excel)
                            </DropdownItem>
                            <DropdownItem onClick={handleExportFullReport} disabled={!selectedSessionId}>
                                <BookOpen size={16} aria-hidden="true" />
                                Báo cáo tổng hợp đợt (Excel)
                            </DropdownItem>
                        </DropdownContent>
                    </Dropdown>
                    <CustomSelect
                        value={selectedSessionId || ''}
                        onChange={(e) => setSelectedSession(e.target.value || null)}
                        className="session-selector"
                        options={[
                            { value: '', label: '-- Tất cả đợt --' },
                            ...sessionOptions
                        ]}
                    />
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
                            onClick={() => navigate('/admin/classes?status=pending')}
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

            {/* Alerts Row */}
            <div className="dashboard-alerts">
                <Card className="alert-card">
                    <CardHeader>
                        <div className="alert-card-title">
                            <AlertTriangle size={18} aria-hidden="true" />
                            <div>
                                <h3>Thiếu nhật ký</h3>
                                <p>Tuần hiện tại chưa nộp</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <div className="alert-card-content">
                            <span className="alert-card-value">
                                {alertsLoading ? '...' : missingLogbookCount}
                            </span>
                            <Badge variant={missingLogbookCount > 0 ? 'danger' : 'default'}>
                                {missingLogbookCount > 0 ? 'Cần xử lý' : 'Ổn định'}
                            </Badge>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveAlert('logbook')}
                            disabled={missingLogbookCount === 0}
                        >
                            Xem danh sách
                        </Button>
                    </CardBody>
                </Card>

                <Card className="alert-card">
                    <CardHeader>
                        <div className="alert-card-title">
                            <FileText size={18} aria-hidden="true" />
                            <div>
                                <h3>Trễ báo cáo</h3>
                                <p>Đã quá hạn nộp</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <div className="alert-card-content">
                            <span className="alert-card-value">
                                {alertsLoading ? '...' : overdueReportCount}
                            </span>
                            <Badge variant={overdueReportCount > 0 ? 'danger' : 'default'}>
                                {overdueReportCount > 0 ? 'Cần xử lý' : 'Ổn định'}
                            </Badge>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveAlert('reports')}
                            disabled={overdueReportCount === 0}
                        >
                            Xem danh sách
                        </Button>
                    </CardBody>
                </Card>
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
                                            <FileText size={16} aria-hidden="true" />
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
                                            <Calendar size={16} aria-hidden="true" />
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
                                <Users size={20} className="quick-stat-icon" aria-hidden="true" />
                                <div className="quick-stat-info">
                                    <span className="quick-stat-value">{stats?.totalTeachers || 0}</span>
                                    <span className="quick-stat-label">Giảng viên</span>
                                </div>
                            </div>
                            <div className="quick-stat">
                                <BookOpen size={20} className="quick-stat-icon" aria-hidden="true" />
                                <div className="quick-stat-info">
                                    <span className="quick-stat-value">{stats?.totalClasses || 0}</span>
                                    <span className="quick-stat-label">Lớp học</span>
                                </div>
                            </div>
                            <div className="quick-stat">
                                <FileText size={20} className="quick-stat-icon" aria-hidden="true" />
                                <div className="quick-stat-info">
                                    <span className="quick-stat-value">{stats?.topicStats?.total || 0}</span>
                                    <span className="quick-stat-label">Tổng đề tài</span>
                                </div>
                            </div>
                            <div className="quick-stat">
                                <TrendingUp size={20} className="quick-stat-icon" aria-hidden="true" />
                                <div className="quick-stat-info">
                                    <span className="quick-stat-value">{stats?.registrationRate || 0}%</span>
                                    <span className="quick-stat-label">Tỉ lệ ĐK</span>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            <Modal
                isOpen={activeAlert !== null}
                onClose={() => setActiveAlert(null)}
                title={activeAlert === 'logbook' ? 'Thiếu nhật ký tuần hiện tại' : 'Báo cáo nộp trễ'}
                size="lg"
            >
                <div className="alerts-filter-row">
                    <div className="alerts-filter-group">
                        <label>Đợt</label>
                        <CustomSelect
                            value={selectedSessionId || ''}
                            onChange={(e) => setSelectedSession(e.target.value || null)}
                            options={alertSessionOptions}
                        />
                    </div>
                    <div className="alerts-filter-group">
                        <label>Lớp</label>
                        <CustomSelect
                            value={alertClassFilter}
                            onChange={(e) => setAlertClassFilter(e.target.value)}
                            options={activeAlert === 'logbook' ? logbookClassOptions : reportClassOptions}
                        />
                    </div>
                    <div className="alerts-filter-group alerts-filter-search">
                        <label>Tìm kiếm</label>
                        <Input
                            value={alertSearch}
                            onChange={(e) => setAlertSearch(e.target.value)}
                            placeholder="MSSV, tên, đề tài..."
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Download size={16} aria-hidden="true" />}
                        onClick={handleExportAlerts}
                        disabled={
                            activeAlert === 'logbook'
                                ? filteredLogbookItems.length === 0
                                : filteredReportItems.length === 0
                        }
                    >
                        Xuất Excel
                    </Button>
                </div>
                {activeAlert === 'logbook' ? (
                    filteredLogbookItems.length > 0 ? (
                        <Table className="alerts-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead style={{ width: '8%' }}>STT</TableHead>
                                    <TableHead style={{ width: '18%' }}>MSSV</TableHead>
                                    <TableHead style={{ width: '24%' }}>Sinh viên</TableHead>
                                    <TableHead style={{ width: '16%' }}>Lớp</TableHead>
                                    <TableHead style={{ width: '12%' }}>Tuần</TableHead>
                                    <TableHead>Cập nhật gần nhất</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogbookItems.map((item, index) => (
                                    <TableRow key={`${item.topicId}-${item.studentCode}`}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{item.studentCode || '-'}</TableCell>
                                        <TableCell>{item.studentName}</TableCell>
                                        <TableCell>{item.classCode || item.className}</TableCell>
                                        <TableCell>
                                            <Badge variant="warning">Tuần {item.weekNumber}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {item.lastEntryAt
                                                ? format(new Date(item.lastEntryAt), 'dd/MM/yyyy', { locale: vi })
                                                : 'Chưa có'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="alerts-empty">Không có sinh viên thiếu nhật ký.</div>
                    )
                ) : filteredReportItems.length > 0 ? (
                    <Table className="alerts-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead style={{ width: '8%' }}>STT</TableHead>
                                <TableHead style={{ width: '18%' }}>MSSV</TableHead>
                                <TableHead style={{ width: '22%' }}>Sinh viên</TableHead>
                                <TableHead style={{ width: '16%' }}>Lớp</TableHead>
                                <TableHead>Báo cáo</TableHead>
                                <TableHead style={{ width: '12%' }}>Hạn</TableHead>
                                <TableHead style={{ width: '12%' }}>Trễ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredReportItems.map((item, index) => (
                                <TableRow key={`${item.topicId}-${item.phase}`}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{item.studentCode || '-'}</TableCell>
                                    <TableCell>{item.studentName}</TableCell>
                                    <TableCell>{item.classCode || item.className}</TableCell>
                                    <TableCell>{item.phaseLabel}</TableCell>
                                    <TableCell>
                                        {item.deadline
                                            ? format(new Date(item.deadline), 'dd/MM/yyyy', { locale: vi })
                                            : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="danger">{item.daysLate} ngày</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="alerts-empty">Không có báo cáo trễ hạn.</div>
                )}
            </Modal>
        </div>
    );
}
