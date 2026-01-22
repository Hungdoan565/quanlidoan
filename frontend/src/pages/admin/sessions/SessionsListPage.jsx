import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Copy, Lock, Unlock, Users, BookOpen, FileText, FileSpreadsheet } from 'lucide-react';
import { useSessions, useDeleteSession, useDuplicateSession, useToggleSessionStatus } from '../../../hooks/useSessions';
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
    StatusBadge,
    ConfirmModal,
    SkeletonTable,
    NoDataState,
    ErrorState,
} from '../../../components/ui';
import { formatDate } from '../../../lib/utils';
import { SessionFormModal } from './SessionFormModal';
import { CloneSessionModal } from './CloneSessionModal';
import { SessionRow } from './SessionRow';
import { SmartImportModal } from '../classes/SmartImportModal';
import './SessionsPage.css';

const SESSION_TYPE_OPTIONS = [
    { value: '', label: 'Tất cả loại' },
    { value: 'do_an_co_so', label: 'Đồ án cơ sở' },
    { value: 'do_an_tot_nghiep', label: 'Đồ án tốt nghiệp' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'draft', label: 'Nháp' },
    { value: 'open', label: 'Đang mở' },
    { value: 'closed', label: 'Đã đóng' },
    { value: 'archived', label: 'Lưu trữ' },
];

export function SessionsListPage() {
    const navigate = useNavigate();

    // Filters state
    const [filters, setFilters] = useState({
        search: '',
        session_type: '',
        status: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, session: null });
    const [cloneSession, setCloneSession] = useState(null);
    const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
    const [importSession, setImportSession] = useState(null);

    // Queries
    const { data: sessions, isLoading, error, refetch } = useSessions(filters);
    const deleteSession = useDeleteSession();
    const duplicateSession = useDuplicateSession();
    const toggleStatus = useToggleSessionStatus();

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    // Pagination
    const totalItems = sessions?.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedSessions = sessions?.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Handle actions
    const handleCreate = () => {
        setEditingSession(null);
        setIsFormModalOpen(true);
    };

    const handleEdit = (session) => {
        setEditingSession(session);
        setIsFormModalOpen(true);
    };

    const handleView = (session) => {
        navigate(`/admin/sessions/${session.id}`);
    };

    const handleDelete = async () => {
        if (deleteConfirm.session) {
            await deleteSession.mutateAsync(deleteConfirm.session.id);
            setDeleteConfirm({ open: false, session: null });
        }
    };

    const handleFormSuccess = () => {
        setIsFormModalOpen(false);
        setEditingSession(null);
    };

    // Get session type label
    const getSessionTypeLabel = (type) => {
        return type === 'do_an_tot_nghiep' ? 'Tốt nghiệp' : 'Cơ sở';
    };

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    return (
        <div className="sessions-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Quản lý Đợt đồ án</h1>
                    <p className="page-subtitle">Quản lý các đợt đồ án trong hệ thống</p>
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
                        Tạo đợt mới
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card padding="md" className="filters-card">
                <div className="filters-row">
                    <div className="filter-search">
                        <Input
                            placeholder="Tìm kiếm theo tên..."
                            leftIcon={<Search size={18} />}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                    <div className="filter-selects">
                        <Select
                            options={SESSION_TYPE_OPTIONS}
                            value={filters.session_type}
                            onChange={(e) => handleFilterChange('session_type', e.target.value)}
                            placeholder="Loại đồ án"
                        />
                        <Select
                            options={STATUS_OPTIONS}
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            placeholder="Trạng thái"
                        />
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card padding="none" className="table-card">
                {isLoading ? (
                    <SkeletonTable rows={5} cols={5} />
                ) : paginatedSessions?.length === 0 ? (
                    <NoDataState
                        title="Chưa có đợt đồ án"
                        description="Tạo đợt đồ án đầu tiên để bắt đầu"
                        actionLabel="Tạo đợt mới"
                        onAction={handleCreate}
                    />
                ) : (
                    <>
                        <table className="sessions-table">
                            <thead>
                                <tr>
                                    <th>Tên đợt</th>
                                    <th>Năm học</th>
                                    <th>Lớp học</th>
                                    <th>Loại</th>
                                    <th>Trạng thái</th>
                                    <th style={{ width: 160 }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedSessions?.map((session) => (
                                    <SessionRow
                                        key={session.id}
                                        session={session}
                                        onEdit={handleEdit}
                                        onDelete={(s) => setDeleteConfirm({ open: true, session: s })}
                                        onClone={setCloneSession}
                                        onToggleStatus={(s) => toggleStatus.mutate({ id: s.id, currentStatus: s.status })}
                                        onImport={(s) => {
                                            setImportSession(s);
                                            setIsSmartImportOpen(true);
                                        }}
                                        toggleStatusPending={toggleStatus.isPending}
                                    />
                                ))}
                            </tbody>
                        </table>

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
            <SessionFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setEditingSession(null);
                }}
                session={editingSession}
                onSuccess={handleFormSuccess}
            />

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, session: null })}
                onConfirm={handleDelete}
                title="Xóa đợt đồ án"
                message={`Bạn có chắc chắn muốn xóa đợt "${deleteConfirm.session?.name}"? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                variant="danger"
                loading={deleteSession.isPending}
            />

            {/* Clone Modal */}
            <CloneSessionModal
                isOpen={!!cloneSession}
                onClose={() => setCloneSession(null)}
                session={cloneSession}
            />

            {/* Smart Import Modal */}
            <SmartImportModal
                isOpen={isSmartImportOpen}
                onClose={() => {
                    setIsSmartImportOpen(false);
                    setImportSession(null);
                }}
                defaultSessionId={importSession?.id || null}
            />
        </div>
    );
}
