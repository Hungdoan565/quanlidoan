import { useState, useMemo } from 'react';
import {
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Clock,
    Search,
    Filter,
    Eye,
    RefreshCw,
    CheckSquare,
    Square,
    Loader2
} from 'lucide-react';
import { usePendingTopics, useMyAllTopics, useBulkApproveTopics } from '../../../hooks/useTeacherReviews';
import { TopicReviewModal } from './TopicReviewModal';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import './TopicReviewsPage.css';

// Status configuration
const STATUS_CONFIG = {
    pending: { label: 'Chờ duyệt', color: 'warning', icon: Clock },
    revision: { label: 'Yêu cầu sửa', color: 'info', icon: AlertCircle },
    approved: { label: 'Đã duyệt', color: 'success', icon: CheckCircle },
    in_progress: { label: 'Đang thực hiện', color: 'primary', icon: RefreshCw },
    submitted: { label: 'Đã nộp', color: 'info', icon: FileText },
    rejected: { label: 'Từ chối', color: 'danger', icon: XCircle },
    completed: { label: 'Hoàn thành', color: 'success', icon: CheckCircle },
};

// Tab configuration
const TABS = [
    { key: 'pending', label: 'Chờ duyệt', icon: Clock },
    { key: 'approved', label: 'Đã duyệt', icon: CheckCircle },
    { key: 'all', label: 'Tất cả', icon: FileText },
];

export function TopicReviewsPage() {
    const [activeTab, setActiveTab] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Fetch data based on active tab
    const {
        data: pendingTopics,
        isLoading: pendingLoading,
        refetch: refetchPending
    } = usePendingTopics();

    const {
        data: allTopics,
        isLoading: allLoading,
        refetch: refetchAll
    } = useMyAllTopics(activeTab === 'all' ? null : activeTab !== 'pending' ? activeTab : null);

    // Bulk approve mutation
    const bulkApproveMutation = useBulkApproveTopics();

    // Determine which data to display
    const topics = activeTab === 'pending' ? pendingTopics : allTopics;
    const isLoading = activeTab === 'pending' ? pendingLoading : allLoading;

    // Selectable topics (only pending or revision status)
    const selectableTopics = useMemo(() => 
        filteredTopics.filter(t => ['pending', 'revision'].includes(t.status)), 
        [filteredTopics]
    );

    // Handle select all
    const handleSelectAll = () => {
        if (selectedIds.size === selectableTopics.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(selectableTopics.map(t => t.id)));
        }
    };

    // Handle toggle select
    const handleToggleSelect = (topicId) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(topicId)) {
            newSet.delete(topicId);
        } else {
            newSet.add(topicId);
        }
        setSelectedIds(newSet);
    };

    // Handle bulk approve
    const handleBulkApprove = async () => {
        if (selectedIds.size === 0) return;
        try {
            await bulkApproveMutation.mutateAsync(Array.from(selectedIds));
            setSelectedIds(new Set());
            refetchPending();
            refetchAll();
        } catch (error) {
            console.error('Bulk approve error:', error);
        }
    };

    // Filter topics by search term
    const filteredTopics = topics?.filter(topic => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            topic.title?.toLowerCase().includes(search) ||
            topic.student?.full_name?.toLowerCase().includes(search) ||
            topic.student?.student_code?.toLowerCase().includes(search) ||
            topic.class?.name?.toLowerCase().includes(search)
        );
    }) || [];

    // Handle view topic
    const handleViewTopic = (topic) => {
        setSelectedTopic(topic);
        setIsModalOpen(true);
    };

    // Handle modal close
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTopic(null);
    };

    // Handle action complete (refresh data)
    const handleActionComplete = () => {
        refetchPending();
        refetchAll();
        handleCloseModal();
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="topic-reviews-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1>
                        <FileText size={28} aria-hidden="true" />
                        Duyệt đề tài
                    </h1>
                    <p>Xem xét và phê duyệt đề tài của sinh viên</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <div className="tabs" role="tablist">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            aria-controls={`panel-${tab.key}`}
                        >
                            <tab.icon size={18} aria-hidden="true" />
                            <span>{tab.label}</span>
                            {tab.key === 'pending' && pendingTopics?.length > 0 && (
                                <span className="tab-badge">{pendingTopics.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="search-container">
                    <Search size={18} className="search-icon" aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm đề tài, sinh viên…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                        aria-label="Tìm kiếm đề tài hoặc sinh viên"
                        autoComplete="off"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="topics-content">
                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && (
                    <div className="bulk-action-bar">
<div className="bulk-info">
                            <CheckSquare size={18} aria-hidden="true" />
                            <span>Đã chọn {selectedIds.size} đề tài</span>
                        </div>
                        <div className="bulk-actions">
                            <Button
                                variant="ghost"
                                size="small"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Bỏ chọn
                            </Button>
                            <Button
                                variant="primary"
                                size="small"
                                onClick={handleBulkApprove}
                                disabled={bulkApproveMutation.isPending}
                            >
{bulkApproveMutation.isPending ? (
                                    <><Loader2 size={16} className="spin" aria-hidden="true" /> Đang duyệt...</>
                                ) : (
                                    <><CheckCircle size={16} aria-hidden="true" /> Duyệt tất cả</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <TopicsTableSkeleton />
                ) : filteredTopics.length === 0 ? (
                    <EmptyState
                        icon={activeTab === 'pending' ? Clock : FileText}
                        title={activeTab === 'pending' ? 'Không có đề tài chờ duyệt' : 'Không có đề tài'}
                        description={
                            searchTerm
                                ? 'Không tìm thấy đề tài phù hợp với từ khóa'
                                : activeTab === 'pending'
                                    ? 'Tất cả đề tài đã được xử lý'
                                    : 'Chưa có sinh viên đăng ký đề tài'
                        }
                    />
                ) : (
                    <div className="topics-table-container">
                        <table className="topics-table">
                            <thead>
                                <tr>
                                    {activeTab === 'pending' && selectableTopics.length > 0 && (
                                        <th className="checkbox-col">
                                            <button 
                                                className="checkbox-btn"
                                                onClick={handleSelectAll}
                                                aria-label={selectedIds.size === selectableTopics.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                            >
                                                {selectedIds.size === selectableTopics.length ? (
                                                    <CheckSquare size={18} aria-hidden="true" />
                                                ) : (
                                                    <Square size={18} aria-hidden="true" />
                                                )}
                                            </button>
                                        </th>
                                    )}
                                    <th>Sinh viên</th>
                                    <th>Đề tài</th>
                                    <th>Lớp</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày đăng ký</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTopics.map(topic => {
                                    const statusConfig = STATUS_CONFIG[topic.status] || STATUS_CONFIG.pending;
                                    const StatusIcon = statusConfig.icon;
                                    const isSelectable = ['pending', 'revision'].includes(topic.status);
                                    const isSelected = selectedIds.has(topic.id);

                                    return (
                                        <tr key={topic.id} className={isSelected ? 'selected' : ''}>
                                            {activeTab === 'pending' && selectableTopics.length > 0 && (
                                                <td className="checkbox-col">
                                                    {isSelectable && (
                                                        <button 
                                                            className="checkbox-btn"
                                                            onClick={() => handleToggleSelect(topic.id)}
                                                            aria-label={isSelected ? `Bỏ chọn ${topic.title}` : `Chọn ${topic.title}`}
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare size={18} className="checked" aria-hidden="true" />
                                                            ) : (
                                                                <Square size={18} aria-hidden="true" />
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                            <td>
                                                <div className="student-info">
                                                    <span className="student-name">{topic.student?.full_name}</span>
                                                    <span className="student-code">{topic.student?.student_code}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="topic-title">
                                                    {topic.title}
                                                    {topic.sample_topic && (
                                                        <span className="topic-type-badge">Đề tài mẫu</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="class-name">{topic.class?.name}</span>
                                            </td>
                                            <td>
<Badge variant={statusConfig.color}>
                                                    <StatusIcon size={14} aria-hidden="true" />
                                                    {statusConfig.label}
                                                </Badge>
                                            </td>
                                            <td>
                                                <span className="date">{formatDate(topic.created_at)}</span>
                                            </td>
                                            <td>
<Button
                                                    variant="outline"
                                                    size="small"
                                                    onClick={() => handleViewTopic(topic)}
                                                >
                                                    <Eye size={16} aria-hidden="true" />
                                                    Xem
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {isModalOpen && selectedTopic && (
                <TopicReviewModal
                    topic={selectedTopic}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onActionComplete={handleActionComplete}
                />
            )}
        </div>
    );
}

// Loading skeleton
function TopicsTableSkeleton() {
    return (
        <div className="topics-table-container">
            <table className="topics-table">
                <thead>
                    <tr>
                        <th>Sinh viên</th>
                        <th>Đề tài</th>
                        <th>Lớp</th>
                        <th>Trạng thái</th>
                        <th>Ngày đăng ký</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {[1, 2, 3, 4, 5].map(i => (
                        <tr key={i}>
                            <td><Skeleton width="150px" height="40px" /></td>
                            <td><Skeleton width="200px" height="24px" /></td>
                            <td><Skeleton width="100px" height="24px" /></td>
                            <td><Skeleton width="100px" height="28px" /></td>
                            <td><Skeleton width="120px" height="24px" /></td>
                            <td><Skeleton width="80px" height="32px" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default TopicReviewsPage;
