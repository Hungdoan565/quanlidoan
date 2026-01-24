import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Users, AlertTriangle, AlertCircle, CheckCircle,
    BookOpen, FileText, Clock, Calendar, ChevronRight,
    Search, Filter, ExternalLink, Copy
} from 'lucide-react';
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
import { useGuidingStudents } from '../../../hooks/useTeacher';
import { useMyStudentsLogbook } from '../../../hooks/useLogbook';
import './MenteesKanbanPage.css';

// Health status calculation
const calculateHealthStatus = (topic, logbookStats) => {
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
    if (topic.status === 'pending') {
        signals.push({ type: 'info', text: 'Đang chờ duyệt đề tài', icon: FileText });
        score -= 10;
    } else if (topic.status === 'rejected') {
        signals.push({ type: 'danger', text: 'Đề tài bị từ chối', icon: AlertCircle });
        score -= 50;
    }

    // 3. No repo URL (for approved topics)
    if (['approved', 'in_progress'].includes(topic.status) && !topic.repo_url) {
        signals.push({ type: 'warning', text: 'Chưa có link repository', icon: ExternalLink });
        score -= 10;
    }

    // Determine health category
    let health;
    if (score >= 80) {
        health = 'good'; // Ổn
    } else if (score >= 50) {
        health = 'attention'; // Cần chú ý
    } else {
        health = 'danger'; // Nguy hiểm
    }

    return { health, score, signals };
};

// Kanban column configuration
const COLUMNS = [
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

    // Fetch data
    const { data: topics = [], isLoading: topicsLoading, error: topicsError, refetch } = useGuidingStudents();
    const { data: logbookData = [], isLoading: logbookLoading } = useMyStudentsLogbook();

    const isLoading = topicsLoading || logbookLoading;
    const error = topicsError;

    // Build logbook stats map
    const logbookMap = useMemo(() => {
        const map = {};
        logbookData.forEach(item => {
            map[item.id] = item.logbook_stats;
        });
        return map;
    }, [logbookData]);

    // Categorize mentees into health buckets
    const categorizedMentees = useMemo(() => {
        const result = { danger: [], attention: [], good: [] };
        
        topics.forEach(topic => {
            // Filter by search
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const name = topic.student?.full_name?.toLowerCase() || '';
                const code = topic.student?.student_code?.toLowerCase() || '';
                const title = topic.title?.toLowerCase() || '';
                if (!name.includes(search) && !code.includes(search) && !title.includes(search)) {
                    return;
                }
            }

            const logbookStats = logbookMap[topic.id];
            const { health, score, signals } = calculateHealthStatus(topic, logbookStats);
            
            result[health].push({
                ...topic,
                healthScore: score,
                signals,
                logbookStats,
            });
        });

        // Sort by health score (worst first in danger/attention)
        result.danger.sort((a, b) => a.healthScore - b.healthScore);
        result.attention.sort((a, b) => a.healthScore - b.healthScore);
        result.good.sort((a, b) => b.healthScore - a.healthScore);

        return result;
    }, [topics, logbookMap, searchTerm]);

    // Handle card click
    const handleCardClick = (topicId) => {
        navigate(`/teacher/topics/${topicId}`);
    };

    // Handle keyboard navigation for cards
    const handleCardKeyDown = (e, topicId) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick(topicId);
        }
    };

    // Handle view logbook
    const handleViewLogbook = (e, topicId) => {
        e.stopPropagation();
        navigate(`/teacher/logbook/${topicId}`);
    };

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

    if (topics.length === 0) {
        return (
            <div className="mentees-kanban-page">
                <div className="page-header">
<h1 className="page-title"><Users size={28} aria-hidden="true" /> Theo dõi Sinh viên</h1>
                </div>
                <NoDataState
                    icon={Users}
                    title="Chưa có sinh viên"
                    description="Bạn chưa được phân công hướng dẫn sinh viên nào"
                />
            </div>
        );
    }

    return (
        <div className="mentees-kanban-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">
                        <Users size={28} aria-hidden="true" />
                        Theo dõi Sinh viên
                    </h1>
                    <p className="page-subtitle">
                        Tổng quan tình trạng {topics.length} sinh viên đang hướng dẫn
                    </p>
                </div>
                <div className="page-actions">
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
                                    mentees.map(mentee => (
                                        <Card 
                                            key={mentee.id} 
                                            className="mentee-card"
                                            onClick={() => handleCardClick(mentee.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => handleCardKeyDown(e, mentee.id)}
                                            aria-label={`Xem chi tiết: ${mentee.student?.full_name} - ${mentee.title}`}
                                        >
                                            <CardBody>
                                                {/* Student Info */}
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
                                                </div>

                                                {/* Topic */}
                                                <p className="mentee-topic" title={mentee.title}>
                                                    {mentee.title}
                                                </p>

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

                                                {/* Logbook Progress (if available) */}
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
<Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={(e) => handleViewLogbook(e, mentee.id)}
                                                    >
                                                        <BookOpen size={14} aria-hidden="true" />
                                                        Nhật ký
                                                    </Button>
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
                                    ))
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
