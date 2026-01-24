/**
 * GradingPage - Teacher's grading dashboard
 * Shows list of topics to grade
 * 
 * NOTE: 1 GV kiêm cả GVHD + GVPB (advisor_id = reviewer_id)
 */

import { useNavigate } from 'react-router-dom';
import { 
    Star, 
    User, 
    BookOpen, 
    CheckCircle, 
    Clock,
} from 'lucide-react';
import { useGradableTopics } from '../../../hooks/useGrading';
import {
    Card,
    CardBody,
    Badge,
    SkeletonCard,
    EmptyState
} from '../../../components/ui';
import './GradingPage.css';

export function GradingPage() {
    const navigate = useNavigate();

    // Fetch gradable topics (chỉ cần lấy 1 lần vì 1 GV kiêm 2 vai trò)
    const { data: topics = [], isLoading, error } = useGradableTopics('advisor');

    // Count stats
    const pendingCount = topics.filter(t => !t.gradingStatus?.isComplete).length;
    const completedCount = topics.filter(t => t.gradingStatus?.isComplete).length;

    const handleTopicClick = (topic) => {
        navigate(`/teacher/grading/${topic.id}`);
    };

    return (
        <div className="page grading-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Chấm điểm</h1>
                    <p>Chấm điểm đề tài sinh viên được phân công</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grading-stats">
                <div className="grading-stat">
                    <span className="stat-value">{topics.length}</span>
                    <span className="stat-label">Tổng đề tài</span>
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
            {isLoading ? (
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
                <div className="grading-topics-grid">
                    {topics.map((topic) => (
                        <TopicGradingCard
                            key={topic.id}
                            topic={topic}
                            onClick={() => handleTopicClick(topic)}
                        />
                    ))}
                </div>
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
                            <CheckCircle size={12} />
                            Đã chấm
                        </Badge>
                    ) : (
                        <Badge variant="warning">
                            <Clock size={12} />
                            Chưa chấm
                        </Badge>
                    )}
                </div>

                {/* Student Info */}
                <div className="topic-card-student">
                    <User size={14} />
                    <span>{topic.student?.full_name}</span>
                    {topic.student?.student_code && (
                        <span className="student-code">({topic.student.student_code})</span>
                    )}
                </div>

                {/* Meta */}
                <div className="topic-card-meta">
                    <span className="topic-card-class">
                        <BookOpen size={12} />
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
