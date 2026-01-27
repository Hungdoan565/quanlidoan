import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    LogIn,
    LogOut,
    XCircle,
    Key,
    Users,
    TrendingUp,
    AlertTriangle,
    Download,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardBody,
    StatCard,
    SkeletonStatCard,
    Button,
    CustomSelect,
    Input,
    Badge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '../../../components/ui';
import { authLogsService } from '../../../services/auth-logs.service';
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { exportToExcel } from '../../../utils/excel';
import './AuthLogsPage.css';

const EVENT_LABELS = {
    login_success: 'Đăng nhập',
    login_failed: 'Thất bại',
    logout: 'Đăng xuất',
    password_changed: 'Đổi MK',
    password_reset_requested: 'Reset MK',
};

const EVENT_ICONS = {
    login_success: LogIn,
    login_failed: XCircle,
    logout: LogOut,
    password_changed: Key,
    password_reset_requested: Key,
};

const ROLE_LABELS = {
    all: 'Tất cả',
    admin: 'Admin',
    teacher: 'Giảng viên',
    student: 'Sinh viên',
};

const PERIOD_OPTIONS = [
    { value: 'today', label: 'Hôm nay' },
    { value: '7days', label: '7 ngày qua' },
    { value: '30days', label: '30 ngày qua' },
];

export function AuthLogsPage() {
    const [period, setPeriod] = useState('7days');
    const [filters, setFilters] = useState({
        eventType: '',
        role: 'all',
        search: '',
    });
    const [page, setPage] = useState(1);
    const limit = 20;

    // Fetch stats
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['auth-logs-stats', period],
        queryFn: () => authLogsService.getStats(period),
        staleTime: 60 * 1000,
    });

    // Fetch alerts
    const { data: alerts, isLoading: alertsLoading } = useQuery({
        queryKey: ['auth-logs-alerts'],
        queryFn: () => authLogsService.getAlerts(),
        staleTime: 60 * 1000,
    });

    // Calculate date range based on period
    const dateRange = useMemo(() => {
        const now = new Date();
        let dateFrom;
        switch (period) {
            case 'today':
                dateFrom = startOfDay(now).toISOString();
                break;
            case '7days':
                dateFrom = startOfDay(subDays(now, 7)).toISOString();
                break;
            case '30days':
            default:
                dateFrom = startOfDay(subDays(now, 30)).toISOString();
                break;
        }
        return {
            dateFrom,
            dateTo: endOfDay(now).toISOString(),
        };
    }, [period]);

    // Fetch logs with filters
    const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
        queryKey: ['auth-logs', filters, page, dateRange],
        queryFn: () => authLogsService.getAll(
            {
                ...filters,
                eventType: filters.eventType || undefined,
                ...dateRange,
            },
            page,
            limit
        ),
        staleTime: 30 * 1000,
    });

    const logs = logsData?.data || [];
    const totalLogs = logsData?.total || 0;
    const totalPages = Math.ceil(totalLogs / limit);

    // Chart data formatting
    const chartData = useMemo(() => {
        if (!stats?.chartData || stats.chartData.length === 0) return [];
        if (!dateRange?.dateFrom || !dateRange?.dateTo) return [];

        const byDay = new Map();
        stats.chartData.forEach(item => {
            byDay.set(item.date, { success: item.success || 0, failed: item.failed || 0 });
        });

        const days = eachDayOfInterval({
            start: new Date(dateRange.dateFrom),
            end: new Date(dateRange.dateTo),
        });

        return days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const counts = byDay.get(key) || { success: 0, failed: 0 };
            return {
                date: format(day, 'dd/MM', { locale: vi }),
                success: counts.success,
                failed: counts.failed,
            };
        });
    }, [stats, dateRange]);

    // Handle refresh
    const handleRefresh = () => {
        refetchStats();
        refetchLogs();
        toast.success('Đã cập nhật dữ liệu');
    };

    // Handle export
    const handleExport = async () => {
        try {
            const data = await authLogsService.exportLogs(dateRange);
            const exportData = data.map((log, idx) => ({
                stt: idx + 1,
                thoiGian: format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi }),
                email: log.email || '',
                hoTen: log.profiles?.full_name || '',
                vaiTro: ROLE_LABELS[log.profiles?.role] || '',
                suKien: EVENT_LABELS[log.event_type] || log.event_type,
                trangThai: log.status === 'success' ? 'Thành công' : 'Thất bại',
                loi: log.error_message || '',
            }));

            const today = format(new Date(), 'yyyy-MM-dd');
            exportToExcel(exportData, `AuthLogs_${today}`, {
                sheetName: 'Auth Logs',
                columnHeaders: {
                    stt: 'STT',
                    thoiGian: 'Thời gian',
                    email: 'Email',
                    hoTen: 'Họ tên',
                    vaiTro: 'Vai trò',
                    suKien: 'Sự kiện',
                    trangThai: 'Trạng thái',
                    loi: 'Lỗi',
                },
                columnWidths: { A: 5, B: 20, C: 30, D: 25, E: 12, F: 15, G: 12, H: 30 },
            });
            toast.success(`Đã xuất ${exportData.length} bản ghi`);
        } catch (error) {
            toast.error('Lỗi khi xuất dữ liệu: ' + error.message);
        }
    };

    const isLoading = statsLoading || logsLoading;

    return (
        <div className="auth-logs-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Auth Audit Log</h1>
                    <p>Theo dõi hoạt động đăng nhập và xác thực</p>
                </div>
                <div className="page-header-actions">
                    <Button
                        variant="outline"
                        leftIcon={<RefreshCw size={16} />}
                        onClick={handleRefresh}
                        disabled={isLoading}
                    >
                        Làm mới
                    </Button>
                    <Button
                        variant="outline"
                        leftIcon={<Download size={16} />}
                        onClick={handleExport}
                    >
                        Xuất Excel
                    </Button>
                    <CustomSelect
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        options={PERIOD_OPTIONS}
                        className="period-selector"
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {statsLoading ? (
                    <>
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                    </>
                ) : (
                    <>
                        <StatCard
                            title="Đăng nhập thành công"
                            value={stats?.loginSuccess || 0}
                            icon={LogIn}
                            variant="success"
                            delay={0}
                        />
                        <StatCard
                            title="Đăng nhập thất bại"
                            value={stats?.loginFailed || 0}
                            icon={XCircle}
                            variant="danger"
                            delay={0.1}
                        />
                        <StatCard
                            title="Đăng xuất"
                            value={stats?.logout || 0}
                            icon={LogOut}
                            variant="default"
                            delay={0.2}
                        />
                        <StatCard
                            title="User hoạt động"
                            value={stats?.uniqueUsers || 0}
                            icon={Users}
                            variant="primary"
                            delay={0.3}
                        />
                    </>
                )}
            </div>

            {/* Chart + Alerts Row */}
            <div className="auth-logs-charts">
                {/* Activity Chart */}
                <Card className="chart-card">
                    <CardHeader>
                        <h3>Hoạt động theo ngày</h3>
                    </CardHeader>
                    <CardBody>
                        {statsLoading ? (
                            <div className="chart-loading">Đang tải...</div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                                    <defs>
                                        <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="date"
                                        tickMargin={8}
                                        interval="preserveStartEnd"
                                        axisLine={{ stroke: '#e5e7eb' }}
                                        tickLine={{ stroke: '#e5e7eb' }}
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        axisLine={{ stroke: '#e5e7eb' }}
                                        tickLine={{ stroke: '#e5e7eb' }}
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                    />
                                    <Tooltip />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="success"
                                        name="Thành công"
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorSuccess)"
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 4 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="failed"
                                        name="Thất bại"
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorFailed)"
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 4 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">Chưa có dữ liệu</div>
                        )}
                    </CardBody>
                </Card>

                {/* Alerts Card */}
                <Card className="alerts-card">
                    <CardHeader>
                        <div className="alerts-header">
                            <AlertTriangle size={18} />
                            <h3>Cảnh báo bảo mật</h3>
                        </div>
                    </CardHeader>
                    <CardBody>
                        {alertsLoading ? (
                            <div className="alerts-loading">Đang kiểm tra...</div>
                        ) : alerts?.suspiciousCount > 0 ? (
                            <div className="alerts-list">
                                <p className="alerts-summary">
                                    <Badge variant="danger">{alerts.suspiciousCount}</Badge> tài khoản có dấu hiệu đáng ngờ (3+ lần thất bại trong 24h)
                                </p>
                                <ul>
                                    {alerts.suspiciousLogins.slice(0, 5).map((item, idx) => (
                                        <li key={idx} className="alert-item">
                                            <span className="alert-email">{item.email}</span>
                                            <Badge variant="danger">{item.failedAttempts} lần</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="alerts-empty">
                                <TrendingUp size={24} />
                                <p>Không có cảnh báo bất thường</p>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* Logs Table */}
            <Card className="logs-table-card">
                <CardHeader>
                    <div className="logs-header">
                        <h3>Chi tiết log</h3>
                        <div className="logs-filters">
                            <Input
                                placeholder="Tìm email, tên..."
                                value={filters.search}
                                onChange={(e) => {
                                    setFilters({ ...filters, search: e.target.value });
                                    setPage(1);
                                }}
                                className="search-input"
                            />
                            <CustomSelect
                                value={filters.eventType}
                                onChange={(e) => {
                                    setFilters({ ...filters, eventType: e.target.value });
                                    setPage(1);
                                }}
                                options={[
                                    { value: '', label: 'Tất cả sự kiện' },
                                    { value: 'login_success', label: 'Đăng nhập' },
                                    { value: 'login_failed', label: 'Thất bại' },
                                    { value: 'logout', label: 'Đăng xuất' },
                                    { value: 'password_changed', label: 'Đổi MK' },
                                ]}
                            />
                            <CustomSelect
                                value={filters.role}
                                onChange={(e) => {
                                    setFilters({ ...filters, role: e.target.value });
                                    setPage(1);
                                }}
                                options={[
                                    { value: 'all', label: 'Tất cả vai trò' },
                                    { value: 'admin', label: 'Admin' },
                                    { value: 'teacher', label: 'Giảng viên' },
                                    { value: 'student', label: 'Sinh viên' },
                                ]}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardBody>
                    {logsLoading ? (
                        <div className="logs-loading">
                            <Loader2 className="spin" size={24} />
                            <span>Đang tải...</span>
                        </div>
                    ) : logs.length > 0 ? (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead style={{ width: '18%' }}>Thời gian</TableHead>
                                        <TableHead style={{ width: '25%' }}>Người dùng</TableHead>
                                        <TableHead style={{ width: '12%' }}>Vai trò</TableHead>
                                        <TableHead style={{ width: '15%' }}>Sự kiện</TableHead>
                                        <TableHead style={{ width: '10%' }}>Trạng thái</TableHead>
                                        <TableHead>Chi tiết</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => {
                                        const EventIcon = EVENT_ICONS[log.event_type] || LogIn;
                                        return (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    <div className="log-time">
                                                        <span className="log-time-relative">
                                                            {formatDistanceToNow(new Date(log.created_at), {
                                                                addSuffix: true,
                                                                locale: vi,
                                                            })}
                                                        </span>
                                                        <span className="log-time-absolute">
                                                            {format(new Date(log.created_at), 'dd/MM HH:mm')}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="log-user">
                                                        <span className="log-user-name">
                                                            {log.profiles?.full_name || '-'}
                                                        </span>
                                                        <span className="log-user-email">{log.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        log.profiles?.role === 'admin' ? 'primary' :
                                                        log.profiles?.role === 'teacher' ? 'info' : 'default'
                                                    }>
                                                        {ROLE_LABELS[log.profiles?.role] || '-'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="log-event">
                                                        <EventIcon size={14} />
                                                        <span>{EVENT_LABELS[log.event_type] || log.event_type}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                                                        {log.status === 'success' ? '✓' : '✗'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {log.error_message && (
                                                        <span className="log-error" title={log.error_message}>
                                                            {log.error_message.slice(0, 30)}...
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            <div className="logs-pagination">
                                <span className="logs-pagination-info">
                                    Hiển thị {((page - 1) * limit) + 1} - {Math.min(page * limit, totalLogs)} / {totalLogs} bản ghi
                                </span>
                                <div className="logs-pagination-controls">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        ← Trước
                                    </Button>
                                    <span className="logs-pagination-page">
                                        Trang {page} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                    >
                                        Sau →
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="logs-empty">
                            <p>Không có log nào trong khoảng thời gian này</p>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}

export default AuthLogsPage;
