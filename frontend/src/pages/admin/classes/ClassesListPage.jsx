import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Plus, Search, Users, Edit, Trash2, Eye, ArrowLeft, Calendar, FileSpreadsheet } from 'lucide-react';
import { useClasses, useDeleteClass } from '../../../hooks/useClasses';
import { useSessions } from '../../../hooks/useSessions';
import {
    Button,
    Input,
    Select,
    Card,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Pagination,
    Badge,
    ConfirmModal,
    SkeletonTable,
    NoDataState,
    ErrorState,
} from '../../../components/ui';
import { ClassFormModal } from './ClassFormModal';
import { SmartImportModal } from './SmartImportModal';
import './ClassesPage.css';

export function ClassesListPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Get initial session from URL params
    const sessionFromUrl = searchParams.get('session') || '';
    const actionFromUrl = searchParams.get('action');

    // Filters state
    const [filters, setFilters] = useState({
        search: '',
        session_id: sessionFromUrl,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, cls: null });
    const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);

    // Queries
    const { data: sessions = [] } = useSessions({});
    const { data: classes, isLoading, error, refetch } = useClasses(filters);
    const deleteClass = useDeleteClass();

    // Filter active sessions
    const activeSessions = sessions.filter(s => s.status !== 'archived');
    const sessionOptions = [
        { value: '', label: 'Tất cả đợt' },
        ...activeSessions.map(s => ({
            value: s.id,
            label: `${s.name} (${s.academic_year})`,
        })),
    ];

    // Get current filtered session info
    const currentSession = filters.session_id
        ? sessions.find(s => s.id === filters.session_id)
        : null;

    // Handle URL params on mount - auto-open create modal
    useEffect(() => {
        if (actionFromUrl === 'create') {
            setIsFormModalOpen(true);
            // Clear the action param
            searchParams.delete('action');
            setSearchParams(searchParams, { replace: true });
        }
    }, [actionFromUrl]);

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    // Pagination
    const totalItems = classes?.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedClasses = classes?.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Handle actions
    const handleCreate = () => {
        setEditingClass(null);
        setIsFormModalOpen(true);
    };

    const handleEdit = (cls) => {
        setEditingClass(cls);
        setIsFormModalOpen(true);
    };

    const handleView = (cls) => {
        navigate(`/admin/classes/${cls.id}`);
    };

    const handleDelete = async () => {
        if (deleteConfirm.cls) {
            await deleteClass.mutateAsync(deleteConfirm.cls.id);
            setDeleteConfirm({ open: false, cls: null });
        }
    };

    const handleFormSuccess = () => {
        setIsFormModalOpen(false);
        setEditingClass(null);
    };

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    return (
        <div className="classes-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    {currentSession ? (
                        <>
                            <Link to="/admin/sessions" className="back-link">
                                <ArrowLeft size={16} />
                                Quay lại đợt đồ án
                            </Link>
                            <h1 className="page-title">Lớp học - {currentSession.name}</h1>
                            <p className="page-subtitle">
                                <Calendar size={14} />
                                {currentSession.academic_year} • Học kỳ {currentSession.semester}
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="page-title">Quản lý Lớp học phần</h1>
                            <p className="page-subtitle">Quản lý lớp học và phân công giảng viên</p>
                        </>
                    )}
                </div>
                <div className="header-actions">
                    <Button
                        variant="secondary"
                        leftIcon={<FileSpreadsheet size={18} />}
                        onClick={() => setIsSmartImportOpen(true)}
                    >
                        Import lớp từ Excel
                    </Button>
                    <Button leftIcon={<Plus size={18} />} onClick={handleCreate}>
                        {currentSession ? 'Thêm lớp vào đợt này' : 'Tạo lớp mới'}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card padding="md" className="filters-card">
                <div className="filters-row">
                    <div className="filter-search">
                        <Input
                            placeholder="Tìm theo tên hoặc mã lớp..."
                            leftIcon={<Search size={18} />}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                    <div className="filter-selects">
                        <Select
                            options={sessionOptions}
                            value={filters.session_id}
                            onChange={(e) => handleFilterChange('session_id', e.target.value)}
                            placeholder="Đợt đồ án"
                        />
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card padding="none" className="table-card">
                {isLoading ? (
                    <SkeletonTable rows={5} cols={6} />
                ) : paginatedClasses?.length === 0 ? (
                    <NoDataState
                        title="Chưa có lớp học"
                        description="Tạo lớp học đầu tiên để bắt đầu quản lý sinh viên"
                        actionLabel="Tạo lớp mới"
                        onAction={handleCreate}
                    />
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã lớp</TableHead>
                                    <TableHead>Tên lớp</TableHead>
                                    <TableHead>Đợt đồ án</TableHead>
                                    <TableHead>GVHD / GVPB</TableHead>
                                    <TableHead>Sĩ số</TableHead>
                                    <TableHead style={{ width: 120 }}>Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedClasses?.map((cls) => (
                                    <TableRow key={cls.id} clickable onClick={() => handleView(cls)}>
                                        <TableCell>
                                            <span className="class-code">{cls.code}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="class-name">{cls.name}</span>
                                        </TableCell>
                                        <TableCell>
                                            {cls.session ? (
                                                <div className="session-info">
                                                    <span className="session-name">{cls.session.name}</span>
                                                    <span className="session-year">{cls.session.academic_year}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {cls.advisor || cls.reviewer ? (
                                                <div className="teacher-pair">
                                                    <div className="teacher-item">
                                                        <Badge variant="primary" size="sm">HD</Badge>
                                                        <span>{cls.advisor?.full_name || 'Chưa phân'}</span>
                                                    </div>
                                                    <div className="teacher-item">
                                                        <Badge variant="secondary" size="sm">PB</Badge>
                                                        <span>{cls.reviewer?.full_name || 'Chưa phân'}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Badge variant="warning">Chưa phân công</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="student-count">
                                                <Users size={14} />
                                                <span>{cls.student_count}/{cls.max_students}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <div className="action-buttons">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleView(cls)}
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(cls)}
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteConfirm({ open: true, cls })}
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16} />
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

            {/* Create/Edit Modal */}
            <ClassFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setEditingClass(null);
                }}
                cls={editingClass}
                sessions={activeSessions}
                onSuccess={handleFormSuccess}
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, cls: null })}
                onConfirm={handleDelete}
                title="Xóa lớp học"
                message={`Bạn có chắc chắn muốn xóa lớp "${deleteConfirm.cls?.name}"? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                variant="danger"
                loading={deleteClass.isPending}
            />

            {/* Smart Import Modal */}
            <SmartImportModal
                isOpen={isSmartImportOpen}
                onClose={() => setIsSmartImportOpen(false)}
                defaultSessionId={filters.session_id}
            />
        </div>
    );
}
