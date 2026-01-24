import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Users, Calendar, CheckCircle, Clock,
    AlertCircle, ChevronRight, Search, Filter
} from 'lucide-react';
import {
    Card,
    CardBody,
    Badge,
    Input,
    Select,
    SkeletonText,
    NoDataState,
    ErrorState,
    ProgressBar,
} from '../../../components/ui';
import { useMyStudentsLogbook } from '../../../hooks/useLogbook';
import './StudentsLogbookPage.css';

export function StudentsLogbookPage() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Query
    const { data: students, isLoading, error, refetch } = useMyStudentsLogbook();

    // Filter students
    const filteredStudents = students?.filter(topic => {
        const studentName = topic.student?.full_name?.toLowerCase() || '';
        const studentCode = topic.student?.student_code?.toLowerCase() || '';
        const topicTitle = topic.title?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();

        const matchSearch = !searchTerm ||
            studentName.includes(search) ||
            studentCode.includes(search) ||
            topicTitle.includes(search);

        const stats = topic.logbook_stats;
        let matchFilter = true;
        if (filterStatus === 'behind') {
            matchFilter = stats.total_entries < stats.expected_weeks;
        } else if (filterStatus === 'ontrack') {
            matchFilter = stats.total_entries >= stats.expected_weeks;
        } else if (filterStatus === 'pending') {
            matchFilter = stats.total_entries > stats.confirmed_entries;
        }

        return matchSearch && matchFilter;
    }) || [];

    // Navigate to detail
    const handleViewDetail = (topicId) => {
        navigate(`/teacher/logbook/${topicId}`);
    };

    // Handle keyboard navigation
    const handleCardKeyDown = (e, topicId) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleViewDetail(topicId);
        }
    };

    // Format relative time
    const formatRelativeTime = (date) => {
        if (!date) return 'Chưa có';
        const now = new Date();
        const then = new Date(date);
        const diffMs = now - then;
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

        if (diffDays === 0) return 'Hôm nay';
        if (diffDays === 1) return 'Hôm qua';
        if (diffDays < 7) return `${diffDays} ngày trước`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
        return new Date(date).toLocaleDateString('vi-VN');
    };

    // Get status badge
    const getProgressBadge = (stats) => {
        const ratio = stats.expected_weeks > 0
            ? stats.total_entries / stats.expected_weeks
            : 0;

        if (ratio >= 1) {
            return <Badge variant="success"><CheckCircle size={12} /> Đúng tiến độ</Badge>;
        } else if (ratio >= 0.7) {
            return <Badge variant="warning"><Clock size={12} /> Gần đủ</Badge>;
        } else {
            return <Badge variant="danger"><AlertCircle size={12} /> Thiếu nhật ký</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="students-logbook-page">
                <div className="page-header">
                    <SkeletonText lines={2} />
                </div>
                <Card><CardBody><SkeletonText lines={6} /></CardBody></Card>
            </div>
        );
    }

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    return (
        <div className="students-logbook-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">
                        <BookOpen size={28} />
                        Nhật ký Sinh viên
                    </h1>
                    <p className="page-subtitle">
                        Theo dõi tiến độ nhật ký của sinh viên bạn hướng dẫn
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <Card className="stat-card">
                    <CardBody>
                        <div className="stat-icon">
                            <Users size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{students?.length || 0}</span>
                            <span className="stat-label">Sinh viên</span>
                        </div>
                    </CardBody>
                </Card>
                <Card className="stat-card success">
                    <CardBody>
                        <div className="stat-icon">
                            <CheckCircle size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">
                                {students?.filter(s => s.logbook_stats.total_entries >= s.logbook_stats.expected_weeks).length || 0}
                            </span>
                            <span className="stat-label">Đúng tiến độ</span>
                        </div>
                    </CardBody>
                </Card>
                <Card className="stat-card warning">
                    <CardBody>
                        <div className="stat-icon">
                            <Clock size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">
                                {students?.filter(s =>
                                    s.logbook_stats.total_entries > s.logbook_stats.confirmed_entries
                                ).length || 0}
                            </span>
                            <span className="stat-label">Chờ xác nhận</span>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Filters */}
            <Card className="filters-card">
                <CardBody>
                    <div className="filters-row">
                        <Input
                            placeholder="Tìm theo tên, MSSV, đề tài..."
                            leftIcon={<Search size={16} />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <Select
                            options={[
                                { value: 'all', label: 'Tất cả' },
                                { value: 'behind', label: 'Thiếu nhật ký' },
                                { value: 'ontrack', label: 'Đúng tiến độ' },
                                { value: 'pending', label: 'Chờ xác nhận' },
                            ]}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        />
                    </div>
                </CardBody>
            </Card>

            {/* Students List */}
            {filteredStudents.length === 0 ? (
                <Card>
                    <CardBody>
                        <NoDataState
                            icon={BookOpen}
                            title="Không có sinh viên nào"
                            description={
                                searchTerm || filterStatus !== 'all'
                                    ? "Thay đổi bộ lọc để xem kết quả khác"
                                    : "Bạn chưa được phân công hướng dẫn sinh viên nào"
                            }
                        />
                    </CardBody>
                </Card>
            ) : (
                <div className="students-list">
                    {filteredStudents.map((topic) => {
                        const stats = topic.logbook_stats;
                        return (
                            <Card
                                key={topic.id}
                                className="student-card clickable"
                                onClick={() => handleViewDetail(topic.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => handleCardKeyDown(e, topic.id)}
                                aria-label={`Xem nhật ký: ${topic.student?.full_name} - ${topic.title}`}
                            >
                                <CardBody>
                                    <div className="student-card-content">
                                        <div className="student-info">
                                            <div className="student-avatar">
                                                {topic.student?.full_name?.charAt(0) || 'S'}
                                            </div>
                                            <div className="student-details">
                                                <h3 className="student-name">
                                                    {topic.student?.full_name}
                                                </h3>
                                                <p className="student-code">
                                                    {topic.student?.student_code}
                                                </p>
                                                <p className="topic-title">
                                                    {topic.title}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="logbook-progress">
                                            <div className="progress-header">
                                                <span className="progress-label">
                                                    Tiến độ: {stats.total_entries}/{stats.expected_weeks} tuần
                                                </span>
                                                {getProgressBadge(stats)}
                                            </div>
                                            <ProgressBar
                                                value={stats.total_entries}
                                                max={stats.expected_weeks || 1}
                                                variant={stats.total_entries >= stats.expected_weeks ? 'success' : 'primary'}
                                            />
                                            <div className="progress-meta">
                                                <span>
                                                    <CheckCircle size={12} />
                                                    {stats.confirmed_entries} xác nhận
                                                </span>
                                                <span>
                                                    <Calendar size={12} />
                                                    {formatRelativeTime(stats.last_entry_at)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="card-arrow">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default StudentsLogbookPage;
