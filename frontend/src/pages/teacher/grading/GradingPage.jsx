/**
 * GradingPage - Teacher's grading dashboard
 * Shows list of topics to grade, grouped by class
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Star, 
    User, 
    BookOpen, 
    CheckCircle, 
    Clock,
    ArrowLeft,
    GraduationCap,
    ChevronRight,
    Users,
} from 'lucide-react';
import { useGradableTopics } from '../../../hooks/useGrading';
import { useMyClasses } from '../../../hooks/useTeacher';
import {
    Card,
    CardBody,
    Badge,
    Button,
    SkeletonCard,
    EmptyState,
    ProgressBar,
} from '../../../components/ui';
import './GradingPage.css';

export function GradingPage() {
    const navigate = useNavigate();
    const [selectedClassName, setSelectedClassName] = useState(null);

    // Fetch gradable topics
    const { data: topics = [], isLoading, error } = useGradableTopics('advisor');
    const { data: myClasses, isLoading: isLoadingClasses } = useMyClasses();

    // Group topics by class AND include empty classes from myClasses
    const classesSummary = useMemo(() => {
        const classMap = new Map();
        
        // First, add all classes from myClasses (teacher's assigned classes)
        if (myClasses) {
            myClasses.forEach(cls => {
                const className = cls.name || cls.code;
                if (!classMap.has(className)) {
                    classMap.set(className, {
                        className,
                        topics: [],
                        stats: { total: 0, pending: 0, completed: 0 }
                    });
                }
            });
        }
        
        // Then, populate with topics data
        if (topics && topics.length > 0) {
            topics.forEach(topic => {
                const className = topic.class?.name || 'Không xác định';
                const key = className;
                
                if (!classMap.has(key)) {
                    classMap.set(key, {
                        className,
                        topics: [],
                        stats: { total: 0, pending: 0, completed: 0 }
                    });
                }
                
                const classData = classMap.get(key);
                classData.topics.push(topic);
                classData.stats.total++;
                
                if (topic.gradingStatus?.isComplete) {
                    classData.stats.completed++;
                } else {
                    classData.stats.pending++;
                }
            });
        }
        
        return Array.from(classMap.values()).sort((a, b) => 
            a.className.localeCompare(b.className)
        );
    }, [topics, myClasses]);

    // Get topics for selected class
    const classTopics = useMemo(() => {
        if (!selectedClassName || !topics) return topics || [];
        return topics.filter(t => t.class?.name === selectedClassName);
    }, [topics, selectedClassName]);

    // Calculate stats based on current view
    const currentScope = selectedClassName ? classTopics : topics;
    const pendingCount = currentScope.filter(t => !t.gradingStatus?.isComplete).length;
    const completedCount = currentScope.filter(t => t.gradingStatus?.isComplete).length;

    const handleTopicClick = (topic) => {
        navigate(`/teacher/grading/${topic.id}`);
    };

    const handleSelectClass = (className) => {
        setSelectedClassName(className);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBackToClasses = () => {
        setSelectedClassName(null);
    };

    // Check if we have multiple classes (based on teacher's assigned classes, not just those with topics)
    const hasMultipleClasses = (myClasses?.length || 0) > 1;

    return (
        <div className="page grading-page">
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

            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>
                        Chấm điểm
                        {selectedClassName && (
                            <span className="page-title-class">• {selectedClassName}</span>
                        )}
                    </h1>
                    <p>
                        {selectedClassName 
                            ? `Đề tài lớp ${selectedClassName}`
                            : 'Chấm điểm đề tài sinh viên được phân công'
                        }
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grading-stats">
                <div className="grading-stat">
                    <span className="stat-value">{currentScope.length}</span>
                    <span className="stat-label">
                        {selectedClassName ? 'Đề tài lớp này' : 'Tổng đề tài'}
                    </span>
                </div>
                <div className="grading-stat pending">
                    <span className="stat-value">{pendingCount}</span>
                    <span className="stat-label">Chưa chấm</span>
                </div>
                <div className="grading-stat completed">
                    <span className="stat-value">{completedCount}</span>
                    <span className="stat-label">Đã chấm</span>
                </div>
            </div>

            {/* Content */}
            {(isLoading || isLoadingClasses) ? (
                <div className="grading-topics-grid">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : error ? (
                <EmptyState
                    type="error"
                    title="Không thể tải dữ liệu"
                    description={error.message}
                />
            ) : topics.length === 0 ? (
                <div className="grading-empty">
                    <Star size={48} className="grading-empty-icon" aria-hidden="true" />
                    <h3>Không có đề tài cần chấm</h3>
                    <p>Bạn chưa được phân công hướng dẫn sinh viên nào</p>
                </div>
            ) : (
                <>
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
                                                </div>
                                                <ChevronRight size={20} className="class-arrow" />
                                            </div>
                                            <div className="class-stats-row">
                                                <div className="class-student-count">
                                                    <Users size={16} />
                                                    <span>{cls.stats.total} đề tài</span>
                                                </div>
                                                <div className="class-mini-badges">
                                                    <span className="mini-badge success" title="Đã chấm">
                                                        <CheckCircle size={12} />
                                                        {cls.stats.completed}
                                                    </span>
                                                    <span className="mini-badge warning" title="Chưa chấm">
                                                        <Clock size={12} />
                                                        {cls.stats.pending}
                                                    </span>
                                                </div>
                                            </div>
                                            <ProgressBar 
                                                value={cls.stats.completed} 
                                                max={cls.stats.total || 1}
                                                variant="success"
                                                size="sm"
                                                className="class-progress-bar"
                                            />
                                            <div className="class-progress-label">
                                                {Math.round((cls.stats.completed / (cls.stats.total || 1)) * 100)}% đã chấm
                                            </div>
                                        </CardBody>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TOPICS VIEW (Level 2 or single class) */}
                    {(selectedClassName || !hasMultipleClasses) && (
                        <div className="grading-topics-grid">
                            {(selectedClassName ? classTopics : topics).map((topic) => (
                                <TopicGradingCard
                                    key={topic.id}
                                    topic={topic}
                                    onClick={() => handleTopicClick(topic)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * Topic Card Component
 */
function TopicGradingCard({ topic, onClick }) {
    const { gradingStatus } = topic;
    const isComplete = gradingStatus?.isComplete;
    const percentage = gradingStatus?.percentage || 0;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <Card 
            className="grading-topic-card" 
            hover 
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label={`Chấm điểm đề tài: ${topic.title}`}
        >
            <CardBody>
                {/* Header */}
                <div className="topic-card-header">
                    <h4 className="topic-card-title">{topic.title}</h4>
                    {isComplete ? (
                        <Badge variant="success">
                            <CheckCircle size={12} aria-hidden="true" />
                            Đã chấm
                        </Badge>
                    ) : (
                        <Badge variant="warning">
                            <Clock size={12} aria-hidden="true" />
                            Chưa chấm
                        </Badge>
                    )}
                </div>

                {/* Student Info */}
                <div className="topic-card-student">
                    <User size={14} aria-hidden="true" />
                    <span>{topic.student?.full_name}</span>
                    {topic.student?.student_code && (
                        <span className="student-code">({topic.student.student_code})</span>
                    )}
                </div>

                {/* Meta */}
                <div className="topic-card-meta">
                    <span className="topic-card-class">
                        <BookOpen size={12} aria-hidden="true" />
                        {topic.class?.name}
                    </span>
                    
                    {/* Progress */}
                    <div className="grading-progress">
                        <div className="grading-progress-bar">
                            <div 
                                className={`grading-progress-fill ${isComplete ? 'complete' : ''}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="grading-progress-text">
                            {gradingStatus?.graded}/{gradingStatus?.total}
                        </span>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

export default GradingPage;
