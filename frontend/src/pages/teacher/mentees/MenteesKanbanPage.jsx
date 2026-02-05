import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Users, AlertTriangle, AlertCircle, CheckCircle,
    BookOpen, FileText, Clock, ChevronDown,
    Search, ExternalLink, Copy, UserX
} from 'lucide-react';
import { CollapsibleCardGroup } from './CollapsibleCardGroup';
import { groupStudentsByClass } from './utils/groupStudentsByClass';
import {
    Card,
    CardBody,
    Badge,
    Input,
    Button,
    SkeletonCard,
    NoDataState,
    ErrorState,
} from '../../../components/ui';
import { useAllMyStudents } from '../../../hooks/useTeacher';
import { useMyStudentsLogbook } from '../../../hooks/useLogbook';
import './MenteesKanbanPage.css';

// Health status calculation - updated to handle students without topics
const calculateHealthStatus = (student, logbookStats) => {
    // If no topic, categorize as 'no_topic'
    if (!student.topic || !student.status) {
        return {
            health: 'no_topic',
            score: 0,
            signals: [{ type: 'danger', text: 'Chưa đăng ký đề tài', icon: UserX }],
        };
    }

    const signals = [];
    let score = 100;

    // 1. Logbook progress signal
    if (logbookStats) {
        const ratio = logbookStats.expected_weeks > 0
            ? logbookStats.total_entries / logbookStats.expected_weeks
            : 0;
        
        if (ratio < 0.5) {
            signals.push({ type: 'danger', text: 'Thiếu nhật ký nghiêm trọng', icon: BookOpen });
            score -= 40;
        } else if (ratio < 0.8) {
            signals.push({ type: 'warning', text: 'Nhật ký chưa đủ', icon: BookOpen });
            score -= 20;
        }

        // No entry in 14+ days
        if (logbookStats.last_entry_at) {
            const daysSinceEntry = Math.floor(
                (Date.now() - new Date(logbookStats.last_entry_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceEntry >= 14) {
                signals.push({ type: 'danger', text: `Không hoạt động ${daysSinceEntry} ngày`, icon: Clock });
                score -= 30;
            } else if (daysSinceEntry >= 7) {
                signals.push({ type: 'warning', text: `Không hoạt động ${daysSinceEntry} ngày`, icon: Clock });
                score -= 15;
            }
        }
    }

    // 2. Topic status signal
    if (student.status === 'pending') {
        signals.push({ type: 'info', text: 'Đang chờ duyệt đề tài', icon: FileText });
        score -= 10;
    } else if (student.status === 'rejected') {
        signals.push({ type: 'danger', text: 'Đề tài bị từ chối', icon: AlertCircle });
        score -= 50;
    } else if (student.status === 'revision') {
        signals.push({ type: 'warning', text: 'Cần chỉnh sửa đề tài', icon: FileText });
        score -= 20;
    }

    // 3. No repo URL (for approved topics)
    if (['approved', 'in_progress'].includes(student.status) && !student.repo_url) {
        signals.push({ type: 'warning', text: 'Chưa có link repository', icon: ExternalLink });
        score -= 10;
    }

    // Determine health category
    let health;
    if (score >= 80) {
        health = 'good';
    } else if (score >= 50) {
        health = 'attention';
    } else {
        health = 'danger';
    }

    return { health, score, signals };
};

// Kanban column configuration - added no_topic column
const COLUMNS = [
    { 
        id: 'no_topic', 
        label: 'Chưa đăng ký', 
        icon: UserX, 
        color: 'muted',
        description: 'Chưa có đề tài' 
    },
    { 
        id: 'danger', 
        label: 'Nguy hiểm', 
        icon: AlertTriangle, 
        color: 'danger',
        description: 'Cần can thiệp ngay' 
    },
    { 
        id: 'attention', 
        label: 'Cần chú ý', 
        icon: AlertCircle, 
        color: 'warning',
        description: 'Cần theo dõi sát' 
    },
    { 
        id: 'good', 
        label: 'Ổn', 
        icon: CheckCircle, 
        color: 'success',
        description: 'Đang tiến triển tốt' 
    },
];

export function MenteesKanbanPage() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [hasSelectedClass, setHasSelectedClass] = useState(false);
    const [showClassDropdown, setShowClassDropdown] = useState(false);

    // Fetch data - using new hook that gets ALL students
    const { data: studentsData, isLoading: studentsLoading, error: studentsError, refetch } = useAllMyStudents();
    const { data: logbookData = [], isLoading: logbookLoading } = useMyStudentsLogbook();

    const students = studentsData?.students || [];
    const classes = studentsData?.classes || [];

    // Auto-select if only 1 class
    useEffect(() => {
        if (classes.length === 1) {
            setSelectedClass(classes[0].id);
            setHasSelectedClass(true);
        }
    }, [classes]);

    const isLoading = studentsLoading || logbookLoading;
    const error = studentsError;

    // Build logbook stats map
    const logbookMap = useMemo(() => {
        const map = {};
        logbookData.forEach(item => {
            map[item.id] = item.logbook_stats;
        });
        return map;
    }, [logbookData]);

    // Filter and categorize students
    const categorizedMentees = useMemo(() => {
        const result = { no_topic: [], danger: [], attention: [], good: [] };
        
        students.forEach(student => {
            // Filter by class
            if (selectedClass !== 'all' && student.class_id !== selectedClass) {
                return;
            }

            // Filter by search
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const name = student.student?.full_name?.toLowerCase() || '';
                const code = student.student?.student_code?.toLowerCase() || '';
                const title = student.title?.toLowerCase() || '';
                const className = student.class?.code?.toLowerCase() || '';
                if (!name.includes(search) && !code.includes(search) && !title.includes(search) && !className.includes(search)) {
                    return;
                }
            }

            const logbookStats = student.topic?.id ? logbookMap[student.topic.id] : null;
            const { health, score, signals } = calculateHealthStatus(student, logbookStats);
            
            result[health].push({
                ...student,
                healthScore: score,
                signals,
                logbookStats,
            });
        });

        // Sort by health score (worst first in danger/attention)
        result.no_topic.sort((a, b) => (a.student?.full_name || '').localeCompare(b.student?.full_name || ''));
        result.danger.sort((a, b) => a.healthScore - b.healthScore);
        result.attention.sort((a, b) => a.healthScore - b.healthScore);
        result.good.sort((a, b) => b.healthScore - a.healthScore);

        return result;
    }, [students, logbookMap, searchTerm, selectedClass]);

    // Group students by class
    const groupedMentees = useMemo(() => {
        if (classes.length <= 1) {
            return null; // No grouping needed for single class
        }
        return groupStudentsByClass(categorizedMentees);
    }, [categorizedMentees, classes.length]);

    // Total filtered count
    const totalFiltered = useMemo(() => {
        return Object.values(categorizedMentees).reduce((sum, arr) => sum + arr.length, 0);
    }, [categorizedMentees]);

    // Handle card click
    const handleCardClick = (mentee) => {
        if (mentee.topic?.id) {
            navigate(`/teacher/reviews/${mentee.topic.id}`);
        } else {
            // For students without topic, copy email
            if (mentee.student?.email) {
                navigator.clipboard.writeText(mentee.student.email);
                toast.info(`Đã copy email: ${mentee.student.email}`);
            }
        }
    };

    // Handle keyboard navigation for cards
    const handleCardKeyDown = (e, mentee) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(mentee);
        }
    };

    // Handle view logbook
    const handleViewLogbook = (e, topicId) => {
        e.stopPropagation();
        navigate(`/teacher/logbook/${topicId}`);
    };

    // Render mentee card
    const renderMenteeCard = (mentee) => (
        <Card 
            key={mentee.id} 
            className={`mentee-card ${!mentee.topic ? 'no-topic' : ''}`}
            onClick={() => handleCardClick(mentee)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => handleCardKeyDown(e, mentee)}
            aria-label={`${mentee.student?.full_name} - ${mentee.title || 'Chưa đăng ký đề tài'}`}
        >
            <CardBody>
                {/* Student Info with Class Badge */}
                <div className="mentee-header">
                    <div className="mentee-avatar">
                        {mentee.student?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div className="mentee-info">
                        <span className="mentee-name">
                            {mentee.student?.full_name}
                        </span>
                        <span className="mentee-code">
                            {mentee.student?.student_code}
                        </span>
                    </div>
                    {/* Class Badge */}
                    {classes.length > 1 && mentee.class && (
                        <Badge variant="outline" className="class-badge">
                            {mentee.class.code}
                        </Badge>
                    )}
                </div>

                {/* Topic or No Topic Message */}
                {mentee.title ? (
                    <p className="mentee-topic" title={mentee.title}>
                        {mentee.title}
                    </p>
                ) : (
                    <p className="mentee-topic no-topic-text">
                        Chưa đăng ký đề tài
                    </p>
                )}

                {/* Signals */}
                {mentee.signals.length > 0 && (
                    <div className="mentee-signals">
                        {mentee.signals.map((signal, idx) => {
                            const SigIcon = signal.icon;
                            return (
                                <div 
                                    key={idx} 
                                    className={`signal signal-${signal.type}`}
                                    title={signal.text}
                                >
                                    <SigIcon size={12} aria-hidden="true" />
                                    <span>{signal.text}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Logbook Progress (if has topic) */}
                {mentee.logbookStats && (
                    <div className="mentee-progress">
                        <div className="progress-info">
                            <BookOpen size={12} aria-hidden="true" />
                            <span>
                                {mentee.logbookStats.total_entries}/{mentee.logbookStats.expected_weeks} tuần
                            </span>
                        </div>
                        <div className="progress-bar-mini">
                            <div 
                                className="progress-fill"
                                style={{
                                    width: `${Math.min(100, (mentee.logbookStats.total_entries / Math.max(1, mentee.logbookStats.expected_weeks)) * 100)}%`
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mentee-actions">
                    {mentee.topic?.id && (
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => handleViewLogbook(e, mentee.topic.id)}
                            leftIcon={<BookOpen size={14} aria-hidden="true" />}
                        >
                            Nhật ký
                        </Button>
                    )}
                    {mentee.student?.email && (
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async (e) => {
                                e.stopPropagation();
                                await navigator.clipboard.writeText(mentee.student.email);
                                toast.success(`Đã copy: ${mentee.student.email}`);
                            }}
                            aria-label={`Copy email ${mentee.student.full_name}`}
                        >
                            <Copy size={14} aria-hidden="true" />
                        </Button>
                    )}
                </div>
            </CardBody>
        </Card>
    );

    // Get selected class name for display
    const selectedClassName = selectedClass === 'all' 
        ? 'Tất cả lớp' 
        : classes.find(c => c.id === selectedClass)?.code || 'Tất cả lớp';

    if (isLoading) {
        return (
            <div className="mentees-kanban-page">
                <div className="page-header">
                    <h1 className="page-title"><Users size={28} aria-hidden="true" /> Theo dõi Sinh viên</h1>
                </div>
                <div className="kanban-board">
                    {COLUMNS.map(col => (
                        <div key={col.id} className="kanban-column">
                            <SkeletonCard />
                            <SkeletonCard />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    if (students.length === 0) {
        return (
            <div className="mentees-kanban-page">
                <div className="page-header">
                    <h1 className="page-title"><Users size={28} aria-hidden="true" /> Theo dõi Sinh viên</h1>
                </div>
                <NoDataState
                    icon={Users}
                    title="Chưa có sinh viên"
                    description="Bạn chưa được phân công phụ trách lớp nào hoặc các lớp chưa có sinh viên"
                />
            </div>
        );
    }

    return (
        <div className="mentees-kanban-page">
            {/* Class Selection Overlay */}
            {classes.length > 1 && !hasSelectedClass && (
                <div className="class-selection-overlay">
                    <div className="class-selection-modal">
                        <h2 className="class-selection-title">Chọn lớp để xem</h2>
                        <p className="class-selection-desc">
                            Bạn đang phụ trách {classes.length} lớp. Vui lòng chọn một lớp để bắt đầu.
                        </p>
                        <div className="class-selection-buttons">
                            {classes.map(cls => {
                                const count = students.filter(s => s.class_id === cls.id).length;
                                return (
                                    <Button
                                        key={cls.id}
                                        variant="outline"
                                        className="class-select-btn"
                                        onClick={() => {
                                            setSelectedClass(cls.id);
                                            setHasSelectedClass(true);
                                        }}
                                    >
                                        <span className="class-btn-name">{cls.code} - {cls.name}</span>
                                        <Badge variant="muted">{count} SV</Badge>
                                    </Button>
                                );
                            })}
                            <Button
                                variant="ghost"
                                className="class-select-btn view-all-btn"
                                onClick={() => {
                                    setSelectedClass('all');
                                    setHasSelectedClass(true);
                                }}
                            >
                                Xem tất cả lớp
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">
                        <Users size={28} aria-hidden="true" />
                        Theo dõi Sinh viên
                    </h1>
                    <p className="page-subtitle">
                        Tổng quan tình trạng {totalFiltered} sinh viên
                        {selectedClass !== 'all' && ` - ${selectedClassName}`}
                    </p>
                </div>
                <div className="page-actions">
                    {/* Class Filter Dropdown */}
                    {classes.length > 1 && (
                        <div className="class-filter-wrapper">
                            <Button
                                variant="outline"
                                className="class-filter-btn"
                                onClick={() => setShowClassDropdown(!showClassDropdown)}
                            >
                                {selectedClassName}
                                <ChevronDown size={16} />
                            </Button>
                            {showClassDropdown && (
                                <>
                                    <div 
                                        className="dropdown-backdrop" 
                                        onClick={() => setShowClassDropdown(false)}
                                    />
                                    <div className="class-dropdown">
                                        <button
                                            className={`dropdown-item ${selectedClass === 'all' ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedClass('all');
                                                setShowClassDropdown(false);
                                            }}
                                        >
                                            Tất cả lớp ({students.length})
                                        </button>
                                        {classes.map(cls => {
                                            const count = students.filter(s => s.class_id === cls.id).length;
                                            return (
                                                <button
                                                    key={cls.id}
                                                    className={`dropdown-item ${selectedClass === cls.id ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSelectedClass(cls.id);
                                                        setShowClassDropdown(false);
                                                    }}
                                                >
                                                    {cls.code} - {cls.name} ({count})
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <Input
                        placeholder="Tìm sinh viên..."
                        leftIcon={<Search size={16} aria-hidden="true" />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            {/* Summary Stats */}
            <div className="health-summary">
                {COLUMNS.map(col => {
                    const count = categorizedMentees[col.id].length;
                    const Icon = col.icon;
                    return (
                        <div key={col.id} className={`summary-item ${col.color}`}>
                            <Icon size={20} aria-hidden="true" />
                            <span className="summary-count">{count}</span>
                            <span className="summary-label">{col.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Kanban Board */}
            <div className="kanban-board">
                {COLUMNS.map(col => {
                    const Icon = col.icon;
                    const mentees = categorizedMentees[col.id];
                    
                    return (
                        <div key={col.id} className={`kanban-column ${col.color}`}>
                            <div className="column-header">
                                <div className="column-title">
                                    <Icon size={18} aria-hidden="true" />
                                    <span>{col.label}</span>
                                    <Badge variant={col.color}>{mentees.length}</Badge>
                                </div>
                                <span className="column-desc">{col.description}</span>
                            </div>

                            <div className="column-content">
                                {mentees.length === 0 ? (
                                    <div className="column-empty">
                                        <CheckCircle size={24} aria-hidden="true" />
                                        <span>Không có sinh viên</span>
                                    </div>
                                ) : (
                                    <>
                                        {classes.length > 1 && groupedMentees ? (
                                            // Grouped by class
                                            Object.entries(groupedMentees[col.id] || {}).map(([classCode, classStudents]) => (
                                                classStudents.length > 0 && (
                                                    <CollapsibleCardGroup
                                                        key={classCode}
                                                        title={classCode}
                                                        students={classStudents}
                                                        threshold={8}
                                                        reorderable={true}
                                                        renderCard={renderMenteeCard}
                                                    />
                                                )
                                            ))
                                        ) : (
                                            // No grouping - single class or filtered
                                            <CollapsibleCardGroup
                                                students={mentees}
                                                threshold={8}
                                                reorderable={true}
                                                renderCard={renderMenteeCard}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MenteesKanbanPage;
