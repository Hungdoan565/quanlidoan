import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Users, CheckCircle, Clock,
    AlertCircle, ChevronRight, Search, X, ArrowLeft, GraduationCap
} from 'lucide-react';
import {
    Card,
    CardBody,
    Badge,
    Input,
    Select,
    Button,
    Avatar,
    SkeletonText,
    NoDataState,
    ErrorState,
    ProgressBar,
} from '../../../components/ui';
import { useMyStudentsLogbook } from '../../../hooks/useLogbook';
import { useMyClasses } from '../../../hooks/useTeacher';
import './StudentsLogbookPage.css';

export function StudentsLogbookPage() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterWeek, setFilterWeek] = useState('all');
    const [selectedClassName, setSelectedClassName] = useState(null);

    // Query
    const { data: students, isLoading, error, refetch } = useMyStudentsLogbook();
    const { data: myClasses, isLoading: isLoadingClasses } = useMyClasses();

    const hasActiveFilters = searchTerm || filterStatus !== 'all' || filterWeek !== 'all';

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterStatus('all');
        setFilterWeek('all');
    };

    // Group students by class
    const classesSummary = useMemo(() => {
        if (!students) return [];
        
        const classMap = new Map();
        
        students.forEach(topic => {
            const className = topic.class?.name || 'Không xác định';
            const sessionName = topic.class?.session?.name || '';
            const key = className;
            
            if (!classMap.has(key)) {
                classMap.set(key, {
                    className,
                    sessionName,
                    students: [],
                    stats: { total: 0, onTrack: 0, pending: 0, missing: 0 }
                });
            }
            
            const classData = classMap.get(key);
            classData.students.push(topic);
            classData.stats.total++;
            
            const stats = topic.logbook_stats;
            if (stats.total_entries >= stats.expected_weeks) {
                classData.stats.onTrack++;
            } else {
                classData.stats.missing++;
            }
            if (stats.total_entries > stats.confirmed_entries) {
                classData.stats.pending++;
            }
        });
        
        return Array.from(classMap.values()).sort((a, b) => 
            a.className.localeCompare(b.className)
        );
    }, [students]);

    // Get students for selected class
    const classStudents = useMemo(() => {
        if (!selectedClassName || !students) return students || [];
        return students.filter(t => t.class?.name === selectedClassName);
    }, [students, selectedClassName]);

    // Filter students (applies to selected class or all)
    const filteredStudents = useMemo(() => {
        const baseStudents = selectedClassName ? classStudents : students;
        if (!baseStudents) return [];

        return baseStudents.filter(topic => {
            const studentName = topic.student?.full_name?.toLowerCase() || '';
            const studentCode = topic.student?.student_code?.toLowerCase() || '';
            const topicTitle = topic.title?.toLowerCase() || '';
            const search = searchTerm.toLowerCase();

            const matchSearch = !searchTerm ||
                studentName.includes(search) ||
                studentCode.includes(search) ||
                topicTitle.includes(search);

            const stats = topic.logbook_stats;
            
            let matchStatus = true;
            if (filterStatus === 'behind') {
                matchStatus = stats.total_entries < stats.expected_weeks;
            } else if (filterStatus === 'ontrack') {
                matchStatus = stats.total_entries >= stats.expected_weeks;
            } else if (filterStatus === 'pending') {
                matchStatus = stats.total_entries > stats.confirmed_entries;
            }

            let matchWeek = true;
            if (filterWeek !== 'all' && stats.last_entry_at) {
                const lastEntryDate = new Date(stats.last_entry_at);
                const now = new Date();
                const diffTime = Math.abs(now - lastEntryDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                const currentWeekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1));
                currentWeekStart.setHours(0, 0, 0, 0);
                
                if (filterWeek === 'current') {
                    matchWeek = lastEntryDate >= currentWeekStart;
                } else if (filterWeek === 'last') {
                    const lastWeekStart = new Date(currentWeekStart);
                    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
                    const lastWeekEnd = new Date(currentWeekStart);
                    lastWeekEnd.setSeconds(-1);
                    matchWeek = lastEntryDate >= lastWeekStart && lastEntryDate <= lastWeekEnd;
                } else if (filterWeek === 'recent') {
                    matchWeek = diffDays <= 14;
                }
            } else if (filterWeek !== 'all' && !stats.last_entry_at) {
                matchWeek = false;
            }

            return matchSearch && matchStatus && matchWeek;
        });
    }, [students, classStudents, selectedClassName, searchTerm, filterStatus, filterWeek]);

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

    // Helper: Progress Variant
    const getProgressVariant = (stats) => {
        const ratio = stats.expected_weeks > 0 ? stats.total_entries / stats.expected_weeks : 0;
        if (ratio >= 1) return 'success';
        if (ratio >= 0.7) return 'warning';
        return 'danger';
    };

    // Helper: Progress Badge
    const getProgressBadge = (stats) => {
        const ratio = stats.expected_weeks > 0 ? stats.total_entries / stats.expected_weeks : 0;
        if (ratio >= 1) {
            return <Badge variant="success" className="status-badge"><CheckCircle size={14} /> Đúng tiến độ</Badge>;
        } else if (ratio >= 0.7) {
            return <Badge variant="warning" className="status-badge"><Clock size={14} /> Gần đủ</Badge>;
        } else {
            return <Badge variant="danger" className="status-badge"><AlertCircle size={14} /> Thiếu nhật ký</Badge>;
        }
    };

    const handleViewDetail = (topicId) => {
        navigate(`/teacher/logbook/${topicId}`);
    };

    const handleCardKeyDown = (e, topicId) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleViewDetail(topicId);
        }
    };

    const handleSelectClass = (className) => {
        setSelectedClassName(className);
        handleClearFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBackToClasses = () => {
        setSelectedClassName(null);
        handleClearFilters();
    };

    if (isLoading) {
        return (
            <div className="students-logbook-page">
                <div className="page-header">
                    <SkeletonText lines={2} />
                </div>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i}><CardBody><SkeletonText lines={3} /></CardBody></Card>
                    ))}
                </div>
                <Card><CardBody><SkeletonText lines={6} /></CardBody></Card>
            </div>
        );
    }

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    // Calculate stats based on current view
    const currentScope = selectedClassName ? classStudents : students;
    const totalStudents = currentScope?.length || 0;
    const onTrackCount = currentScope?.filter(s => s.logbook_stats.total_entries >= s.logbook_stats.expected_weeks).length || 0;
    const pendingCount = currentScope?.filter(s => s.logbook_stats.total_entries > s.logbook_stats.confirmed_entries).length || 0;
    const missingCount = currentScope?.filter(s => s.logbook_stats.total_entries < s.logbook_stats.expected_weeks).length || 0;

    // Check if we have multiple classes
    const hasMultipleClasses = classesSummary.length > 1;

    return (
        <div className="students-logbook-page">
            {/* Back Button (when viewing a class) */}
            {selectedClassName && (
                <Button 
                    variant="ghost" 
                    leftIcon={<ArrowLeft size={18} />}
                    onClick={handleBackToClasses}
                    className="back-to-classes-btn"
                >
                    Quay lại danh sách lớp
                </Button>
            )}

            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">
                        <BookOpen size={24} className="text-primary-600" />
                        Nhật ký Sinh viên
                        {selectedClassName && (
                            <span className="page-title-class">• {selectedClassName}</span>
                        )}
                    </h1>
                    <p className="page-subtitle">
                        {selectedClassName 
                            ? `Sinh viên lớp ${selectedClassName}`
                            : 'Theo dõi tiến độ nhật ký của sinh viên bạn hướng dẫn'
                        }
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <Card className="stat-card primary">
                    <CardBody>
                        <div className="stat-icon">
                            <Users size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{totalStudents}</span>
                            <span className="stat-label">
                                {selectedClassName ? 'Sinh viên lớp này' : 'Tổng sinh viên'}
                            </span>
                        </div>
                    </CardBody>
                </Card>
                <Card className="stat-card success">
                    <CardBody>
                        <div className="stat-icon">
                            <CheckCircle size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{onTrackCount}</span>
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
                            <span className="stat-value">{pendingCount}</span>
                            <span className="stat-label">Chờ xác nhận</span>
                        </div>
                    </CardBody>
                </Card>
                <Card className="stat-card danger">
                    <CardBody>
                        <div className="stat-icon">
                            <AlertCircle size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{missingCount}</span>
                            <span className="stat-label">Thiếu nhật ký</span>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* CLASS CARDS VIEW (Level 1) */}
            {!selectedClassName && hasMultipleClasses && (
                <div className="classes-section">
                    <h2 className="section-title">
                        <GraduationCap size={20} />
                        Danh sách lớp ({classesSummary.length} lớp)
                    </h2>
                    <div className="classes-grid">
                        {classesSummary.map((cls) => (
                            <Card 
                                key={cls.className}
                                className="class-card clickable"
                                onClick={() => handleSelectClass(cls.className)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelectClass(cls.className);
                                    }
                                }}
                            >
                                <CardBody>
                                    <div className="class-card-header">
                                        <div className="class-info">
                                            <h3 className="class-name">{cls.className}</h3>
                                            {cls.sessionName && (
                                                <span className="class-session">{cls.sessionName}</span>
                                            )}
                                        </div>
                                        <ChevronRight size={20} className="class-arrow" />
                                    </div>
                                    <div className="class-stats-row">
                                        <div className="class-student-count">
                                            <Users size={16} />
                                            <span>{cls.stats.total} sinh viên</span>
                                        </div>
                                        <div className="class-mini-badges">
                                            <span className="mini-badge success" title="Đúng tiến độ">
                                                <CheckCircle size={12} />
                                                {cls.stats.onTrack}
                                            </span>
                                            <span className="mini-badge warning" title="Chờ xác nhận">
                                                <Clock size={12} />
                                                {cls.stats.pending}
                                            </span>
                                            <span className="mini-badge danger" title="Thiếu nhật ký">
                                                <AlertCircle size={12} />
                                                {cls.stats.missing}
                                            </span>
                                        </div>
                                    </div>
                                    <ProgressBar 
                                        value={cls.stats.onTrack} 
                                        max={cls.stats.total || 1}
                                        variant="success"
                                        size="sm"
                                        className="class-progress-bar"
                                    />
                                    <div className="class-progress-label">
                                        {Math.round((cls.stats.onTrack / (cls.stats.total || 1)) * 100)}% đúng tiến độ
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* STUDENTS VIEW (Level 2 or single class) */}
            {(selectedClassName || !hasMultipleClasses) && (
                <>
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
                                        { value: 'all', label: 'Tất cả trạng thái' },
                                        { value: 'ontrack', label: 'Đúng tiến độ' },
                                        { value: 'pending', label: 'Chờ xác nhận' },
                                        { value: 'behind', label: 'Thiếu nhật ký' },
                                    ]}
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="filter-select"
                                />
                                <Select
                                    options={[
                                        { value: 'all', label: 'Tất cả tuần' },
                                        { value: 'current', label: 'Tuần hiện tại' },
                                        { value: 'last', label: 'Tuần trước' },
                                        { value: 'recent', label: '2 tuần gần đây' },
                                    ]}
                                    value={filterWeek}
                                    onChange={(e) => setFilterWeek(e.target.value)}
                                    className="filter-select"
                                />
                                {hasActiveFilters && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleClearFilters}
                                        className="clear-filters-btn"
                                        leftIcon={<X size={16} />}
                                    >
                                        Xóa bộ lọc
                                    </Button>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* Students List */}
                    {filteredStudents.length === 0 ? (
                        <Card>
                            <CardBody>
                                <NoDataState
                                    icon={BookOpen}
                                    title="Không tìm thấy sinh viên nào"
                                    description={
                                        hasActiveFilters
                                            ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                                            : "Bạn chưa được phân công hướng dẫn sinh viên nào"
                                    }
                                    action={
                                        hasActiveFilters ? (
                                            <Button variant="outline" onClick={handleClearFilters}>
                                                Xóa bộ lọc
                                            </Button>
                                        ) : null
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
                                    >
                                        <CardBody className="student-card-body">
                                            <div className="student-card-content">
                                                {/* Left: Avatar + Info */}
                                                <div className="student-section-left">
                                                    <Avatar 
                                                        src={topic.student?.avatar_url} 
                                                        name={topic.student?.full_name} 
                                                        size="lg" 
                                                    />
                                                    <div className="student-details">
                                                        <h3 className="student-name">
                                                            {topic.student?.full_name}
                                                        </h3>
                                                        <p className="student-code">
                                                            {topic.student?.student_code}
                                                        </p>
                                                        <p className="topic-title" title={topic.title}>
                                                            {topic.title}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Center: Progress */}
                                                <div className="student-section-center">
                                                    <div className="progress-header">
                                                        <span className="progress-label">
                                                            Tiến độ: <strong>{stats.total_entries}/{stats.expected_weeks}</strong> tuần
                                                        </span>
                                                    </div>
                                                    <ProgressBar
                                                        value={stats.total_entries}
                                                        max={stats.expected_weeks || 1}
                                                        variant={getProgressVariant(stats)}
                                                        size="sm"
                                                        className="logbook-progress-bar"
                                                    />
                                                    <div className="progress-meta">
                                                        <span>
                                                            Cập nhật: {formatRelativeTime(stats.last_entry_at)}
                                                        </span>
                                                        <span className="meta-separator">•</span>
                                                        <span>
                                                            {stats.confirmed_entries} xác nhận
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Right: Badge + Action */}
                                                <div className="student-section-right">
                                                    {getProgressBadge(stats)}
                                                    <div className="card-arrow">
                                                        <ChevronRight size={20} />
                                                    </div>
                                                </div>
                                            </div>
                                        </CardBody>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default StudentsLogbookPage;
