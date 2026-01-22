import { useState } from 'react';
import { Search, Users, GraduationCap, UserCheck, Shield, UserPlus, Folder } from 'lucide-react';
import { useUsers, useUserStats, useToggleUserActive } from '../../../hooks/useUsers';
import { useClasses } from '../../../hooks/useClasses';
import {
    Button,
    Input,
    Select,
    Card,
    CardHeader,
    CardBody,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Pagination,
    Badge,
    Avatar,
    SkeletonTable,
    NoDataState,
    ErrorState,
    ConfirmModal,
} from '../../../components/ui';
import { UserDetailModal } from './UserDetailModal';
import { UserFormModal } from './UserFormModal';
import './UsersPage.css';

const ROLE_OPTIONS = [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'teacher', label: 'Giảng viên' },
    { value: 'student', label: 'Sinh viên' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'true', label: 'Đang hoạt động' },
    { value: 'false', label: 'Đã vô hiệu' },
];

const ROLE_LABELS = {
    admin: { label: 'Admin', variant: 'danger', icon: Shield },
    teacher: { label: 'Giảng viên', variant: 'primary', icon: UserCheck },
    student: { label: 'Sinh viên', variant: 'success', icon: GraduationCap },
};

export function UsersListPage() {
    // Filters state
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        is_active: '', // Empty string = all users
    });
    const [selectedClassId, setSelectedClassId] = useState('');
    const [classSearch, setClassSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Modal states
    const [selectedUser, setSelectedUser] = useState(null);
    const [toggleConfirm, setToggleConfirm] = useState({ open: false, user: null, action: '' });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { data: classes = [], isLoading: isClassesLoading } = useClasses({
        search: classSearch || undefined,
    });
    const selectedClass = selectedClassId
        ? classes.find(cls => cls.id === selectedClassId)
        : null;
    const effectiveRole = selectedClassId ? 'student' : filters.role;

    // Queries - Now with server-side pagination
    const { data: usersData, isLoading, error, refetch } = useUsers(
        {
            search: filters.search || undefined,
            role: effectiveRole || undefined,
            is_active: filters.is_active === '' ? undefined : filters.is_active === 'true',
            class_id: selectedClassId || undefined,
        },
        currentPage,
        itemsPerPage
    );
    const { data: stats } = useUserStats();
    const toggleActive = useToggleUserActive();

    // Extract data from server response
    const users = usersData?.data || [];
    const totalItems = usersData?.total || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Handle filter changes - reset to page 1
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleClassSelect = (classId) => {
        setSelectedClassId(classId);
        if (classId) {
            setFilters(prev => ({ ...prev, role: 'student' }));
        }
        setCurrentPage(1);
    };

    // Handle toggle active
    const handleToggleActive = async () => {
        if (toggleConfirm.user) {
            await toggleActive.mutateAsync({
                id: toggleConfirm.user.id,
                isActive: toggleConfirm.action === 'activate',
            });
            setToggleConfirm({ open: false, user: null, action: '' });
        }
    };

    // Get role badge
    const getRoleBadge = (role) => {
        const config = ROLE_LABELS[role] || { label: role, variant: 'default' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    return (
        <div className="users-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Quản lý Người dùng</h1>
                    <p className="page-subtitle">Quản lý tài khoản trong hệ thống</p>
                </div>
                <Button leftIcon={<UserPlus size={18} />} onClick={() => setIsCreateModalOpen(true)}>
                    Thêm mới
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="users-stats">
                <Card className="stat-mini">
                    <div className="stat-mini-content">
                        <Users size={20} className="stat-icon total" />
                        <div>
                            <span className="stat-value">{stats?.total || 0}</span>
                            <span className="stat-label">Tổng</span>
                        </div>
                    </div>
                </Card>
                <Card className="stat-mini">
                    <div className="stat-mini-content">
                        <Shield size={20} className="stat-icon admin" />
                        <div>
                            <span className="stat-value">{stats?.admin || 0}</span>
                            <span className="stat-label">Admin</span>
                        </div>
                    </div>
                </Card>
                <Card className="stat-mini">
                    <div className="stat-mini-content">
                        <UserCheck size={20} className="stat-icon teacher" />
                        <div>
                            <span className="stat-value">{stats?.teacher || 0}</span>
                            <span className="stat-label">Giảng viên</span>
                        </div>
                    </div>
                </Card>
                <Card className="stat-mini">
                    <div className="stat-mini-content">
                        <GraduationCap size={20} className="stat-icon student" />
                        <div>
                            <span className="stat-value">{stats?.student || 0}</span>
                            <span className="stat-label">Sinh viên</span>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="users-layout">
                {/* Classes Sidebar */}
                <Card padding="md" className="classes-sidebar">
                    <div className="classes-sidebar-header">
                        <Folder size={16} />
                        <span>Lớp học</span>
                    </div>
                    <div className="classes-search">
                        <Input
                            placeholder="Tìm lớp..."
                            leftIcon={<Search size={16} />}
                            value={classSearch}
                            onChange={(e) => setClassSearch(e.target.value)}
                        />
                    </div>
                    <div className="class-list">
                        <button
                            className={`class-item ${selectedClassId === '' ? 'active' : ''}`}
                            onClick={() => handleClassSelect('')}
                        >
                            <span className="class-name">Tất cả người dùng</span>
                        </button>
                        {isClassesLoading ? (
                            <div className="class-loading">Đang tải lớp...</div>
                        ) : classes.length === 0 ? (
                            <div className="class-empty">Chưa có lớp học</div>
                        ) : (
                            classes.map((cls) => (
                                <button
                                    key={cls.id}
                                    className={`class-item ${selectedClassId === cls.id ? 'active' : ''}`}
                                    onClick={() => handleClassSelect(cls.id)}
                                >
                                    <div className="class-meta">
                                        <span className="class-name">{cls.name}</span>
                                        <span className="class-code">{cls.code}</span>
                                    </div>
                                    <span className="class-count">
                                        {cls.student_count}/{cls.max_students}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </Card>

                <div className="users-content">
                    {/* Filters */}
                    <Card padding="md" className="filters-card">
                        <div className="filters-header">
                            <div className="filters-title">
                                {selectedClass ? (
                                    <>
                                        <span>Danh sách sinh viên</span>
                                        <Badge variant="primary" size="sm">{selectedClass.name}</Badge>
                                    </>
                                ) : (
                                    <span>Danh sách người dùng</span>
                                )}
                            </div>
                        </div>
                        <div className="filters-row">
                            <div className="filter-search">
                                <Input
                                    placeholder={selectedClass ? 'Tìm theo tên, email, MSSV...' : 'Tìm theo tên, email, MSSV...'}
                                    leftIcon={<Search size={18} />}
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>
                            <div className="filter-selects">
                                <Select
                                    options={ROLE_OPTIONS}
                                    value={effectiveRole}
                                    onChange={(e) => handleFilterChange('role', e.target.value)}
                                    disabled={!!selectedClassId}
                                />
                                <Select
                                    options={STATUS_OPTIONS}
                                    value={filters.is_active}
                                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                                />
                            </div>
                        </div>
                        {selectedClassId && (
                            <div className="filters-hint">
                                Đang lọc theo lớp, vai trò được cố định là Sinh viên.
                            </div>
                        )}
                    </Card>

                    {/* Table */}
                    <Card padding="none" className="table-card">
                        {isLoading ? (
                            <SkeletonTable rows={8} cols={6} />
                        ) : users?.length === 0 ? (
                            <NoDataState
                                title={selectedClass ? 'Lớp chưa có sinh viên' : 'Không tìm thấy người dùng'}
                                description={selectedClass ? 'Thêm sinh viên vào lớp để bắt đầu quản lý' : 'Thay đổi bộ lọc hoặc tìm kiếm để xem kết quả khác'}
                            />
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Người dùng</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Vai trò</TableHead>
                                            <TableHead>Mã</TableHead>
                                            <TableHead>Trạng thái</TableHead>
                                            <TableHead style={{ width: 100 }}>Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users?.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <div className="user-cell">
                                                        <Avatar name={user.full_name} size="sm" />
                                                        <span className="user-name">{user.full_name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="user-email">{user.email}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {getRoleBadge(user.role)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="user-code">
                                                        {user.student_code || user.teacher_code || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={user.is_active ? 'success' : 'default'}>
                                                        {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="action-buttons">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedUser(user)}
                                                        >
                                                            Chi tiết
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setToggleConfirm({
                                                                open: true,
                                                                user,
                                                                action: user.is_active ? 'deactivate' : 'activate',
                                                            })}
                                                        >
                                                            {user.is_active ? 'Khóa' : 'Mở'}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {totalPages > 1 && (
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={totalItems}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setCurrentPage}
                                    />
                                )}
                            </>
                        )}
                    </Card>
                </div>
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <UserDetailModal
                    isOpen={!!selectedUser}
                    onClose={() => setSelectedUser(null)}
                    user={selectedUser}
                />
            )}

            {/* Toggle Confirmation */}
            <ConfirmModal
                isOpen={toggleConfirm.open}
                onClose={() => setToggleConfirm({ open: false, user: null, action: '' })}
                onConfirm={handleToggleActive}
                title={toggleConfirm.action === 'activate' ? 'Kích hoạt tài khoản' : 'Vô hiệu hóa tài khoản'}
                message={
                    toggleConfirm.action === 'activate'
                        ? `Bạn có chắc muốn kích hoạt lại tài khoản "${toggleConfirm.user?.full_name}"?`
                        : `Bạn có chắc muốn vô hiệu hóa tài khoản "${toggleConfirm.user?.full_name}"? Người dùng sẽ không thể đăng nhập.`
                }
                confirmText={toggleConfirm.action === 'activate' ? 'Kích hoạt' : 'Vô hiệu hóa'}
                variant={toggleConfirm.action === 'activate' ? 'primary' : 'danger'}
                loading={toggleActive.isPending}
            />

            {/* Create User Modal */}
            <UserFormModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={refetch}
            />
        </div>
    );
}
