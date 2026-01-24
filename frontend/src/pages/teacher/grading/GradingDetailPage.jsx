/**
 * GradingDetailPage - Score entry form for a specific topic
 * 
 * NOTE: 1 GV kiêm cả GVHD + GVPB, nên chấm cả 2 loại tiêu chí cùng lúc
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    CheckCircle,
    User,
    BookOpen,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useGradingCriteria, useTopicGrades, useSaveGrades, useSubmitGrades } from '../../../hooks/useGrading';
import { topicsService } from '../../../services/topics.service';
import { useQuery } from '@tanstack/react-query';
import {
    Card,
    CardHeader,
    CardBody,
    CardFooter,
    Button,
    Input,
    Textarea,
    Badge,
    StatusBadge,
    SkeletonCard,
    EmptyState,
    ConfirmModal
} from '../../../components/ui';
import { GRADER_TYPE_LABELS } from '../../../lib/constants';
import './GradingDetailPage.css';

export function GradingDetailPage() {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuthStore();

    // State for scores - keyed by "graderRole_criterionName"
    const [scores, setScores] = useState({});
    const [notes, setNotes] = useState({});
    const [isDirty, setIsDirty] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

    // Fetch topic details
    const { data: topic, isLoading: topicLoading } = useQuery({
        queryKey: ['topic', topicId],
        queryFn: () => topicsService.getById(topicId),
        enabled: !!topicId,
    });

    // Get session ID from topic
    const sessionId = topic?.class?.session_id || topic?.class?.session?.id;

    // Fetch criteria (grouped by role)
    const { data: criteriaGroups = { advisor: [], reviewer: [], council: [] }, isLoading: criteriaLoading } = useGradingCriteria(sessionId);

    // Fetch existing grades
    const { data: existingGrades = [], isLoading: gradesLoading } = useTopicGrades(topicId, profile?.id);

    // Mutations
    const saveGradesMutation = useSaveGrades();
    const submitGradesMutation = useSubmitGrades();

    // Combine advisor and reviewer criteria (since 1 GV does both)
    const allCriteria = useMemo(() => {
        const result = [];
        
        // Add advisor criteria
        (criteriaGroups.advisor || []).forEach((c, index) => {
            result.push({
                ...c,
                graderRole: 'advisor',
                key: `advisor_${c.name}`,
                index,
            });
        });
        
        // Add reviewer criteria
        (criteriaGroups.reviewer || []).forEach((c, index) => {
            result.push({
                ...c,
                graderRole: 'reviewer',
                key: `reviewer_${c.name}`,
                index,
            });
        });
        
        return result;
    }, [criteriaGroups]);

    // Initialize scores from existing grades
    useEffect(() => {
        if (existingGrades.length > 0) {
            const initialScores = {};
            const initialNotes = {};
            existingGrades.forEach(grade => {
                const key = `${grade.grader_role}_${grade.criterion_name}`;
                initialScores[key] = grade.score?.toString() || '';
                initialNotes[key] = grade.notes || '';
            });
            setScores(initialScores);
            setNotes(initialNotes);
        }
    }, [existingGrades]);

    // Handle score change
    const handleScoreChange = (key, value, maxScore) => {
        const numValue = parseFloat(value);
        if (value === '' || (numValue >= 0 && numValue <= maxScore)) {
            setScores(prev => ({ ...prev, [key]: value }));
            setIsDirty(true);
        }
    };

    // Handle notes change
    const handleNotesChange = (key, value) => {
        setNotes(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
    };

    // Save all scores
    const handleSave = async () => {
        const gradesToSave = allCriteria
            .filter(c => scores[c.key] !== '' && scores[c.key] !== undefined)
            .map(c => ({
                topicId,
                criterionName: c.name,
                score: parseFloat(scores[c.key]),
                notes: notes[c.key] || '',
                gradedBy: profile.id,
                graderRole: c.graderRole,
            }));

        if (gradesToSave.length === 0) {
            return;
        }

        await saveGradesMutation.mutateAsync(gradesToSave);
        setIsDirty(false);
    };

    // Submit final grades
    const handleSubmit = async () => {
        // First save any pending changes
        await handleSave();
        
        // Mark as final for both roles (since 1 GV does both)
        await submitGradesMutation.mutateAsync({
            topicId,
            graderType: 'advisor',
        });
        await submitGradesMutation.mutateAsync({
            topicId,
            graderType: 'reviewer',
        });
        
        setShowConfirmSubmit(false);
        navigate('/teacher/grading');
    };

    // Calculate progress
    const progress = useMemo(() => {
        const total = allCriteria.length;
        const filled = allCriteria.filter(c => scores[c.key] !== '' && scores[c.key] !== undefined).length;
        return {
            total,
            completed: filled,
            percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
        };
    }, [allCriteria, scores]);

    // Check if all criteria are filled
    const allFilled = progress.completed === progress.total && progress.total > 0;

    const isLoading = topicLoading || criteriaLoading || gradesLoading;

    if (isLoading) {
        return (
            <div className="page grading-detail-page">
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    if (!topic) {
        return (
            <div className="page grading-detail-page">
                <EmptyState
                    type="error"
                    title="Không tìm thấy đề tài"
                    description="Đề tài không tồn tại hoặc bạn không có quyền truy cập"
                    action={
                        <Button onClick={() => navigate('/teacher/grading')}>
                            <ArrowLeft size={16} />
                            Quay lại
                        </Button>
                    }
                />
            </div>
        );
    }

    // Group criteria by role for display
    const advisorCriteria = allCriteria.filter(c => c.graderRole === 'advisor');
    const reviewerCriteria = allCriteria.filter(c => c.graderRole === 'reviewer');

    return (
        <div className="page grading-detail-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <button 
                        className="back-button" 
                        onClick={() => navigate('/teacher/grading')}
                        aria-label="Quay lại danh sách chấm điểm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1>Chấm điểm</h1>
                        <p>{topic.title}</p>
                    </div>
                </div>
            </div>

            <div className="grading-detail-content">
                {/* Topic Info Card */}
                <Card className="topic-info-card">
                    <CardBody>
                        <div className="topic-info-header">
                            <h2 className="topic-title">{topic.title}</h2>
                            <StatusBadge status={topic.status} />
                        </div>

                        <div className="topic-info-grid">
                            <div className="topic-info-item">
                                <User size={16} />
                                <div>
                                    <span className="label">Sinh viên</span>
                                    <span className="value">
                                        {topic.student?.full_name}
                                        {topic.student?.student_code && ` (${topic.student.student_code})`}
                                    </span>
                                </div>
                            </div>

                            <div className="topic-info-item">
                                <BookOpen size={16} />
                                <div>
                                    <span className="label">Lớp</span>
                                    <span className="value">{topic.class?.name}</span>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Grading Form */}
                <Card className="grading-form-card">
                    <CardHeader>
                        <div className="grading-form-header">
                            <h3>Bảng chấm điểm</h3>
                            <div className="grading-progress-info">
                                <span>Tiến độ: {progress.completed}/{progress.total}</span>
                                <div className="grading-progress-bar-large">
                                    <div 
                                        className="grading-progress-fill-large"
                                        style={{ width: `${progress.percentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardBody>
                        {allCriteria.length === 0 ? (
                            <EmptyState
                                title="Chưa có tiêu chí chấm điểm"
                                description="Admin cần cấu hình tiêu chí chấm điểm cho đợt này"
                            />
                        ) : (
                            <div className="grading-sections">
                                {/* Advisor Criteria */}
                                {advisorCriteria.length > 0 && (
                                    <div className="grading-section">
                                        <h4 className="section-title">
                                            <Badge variant="primary">GVHD</Badge>
                                            Tiêu chí hướng dẫn
                                        </h4>
                                        <div className="grading-criteria-list">
                                            {advisorCriteria.map((criterion, idx) => (
                                                <CriterionRow
                                                    key={criterion.key}
                                                    index={idx + 1}
                                                    criterion={criterion}
                                                    score={scores[criterion.key] ?? ''}
                                                    notes={notes[criterion.key] ?? ''}
                                                    onScoreChange={(value) => handleScoreChange(criterion.key, value, criterion.max_score || 10)}
                                                    onNotesChange={(value) => handleNotesChange(criterion.key, value)}
                                                    existingGrade={existingGrades.find(g => g.criterion_name === criterion.name && g.grader_role === 'advisor')}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Reviewer Criteria */}
                                {reviewerCriteria.length > 0 && (
                                    <div className="grading-section">
                                        <h4 className="section-title">
                                            <Badge variant="warning">GVPB</Badge>
                                            Tiêu chí phản biện
                                        </h4>
                                        <div className="grading-criteria-list">
                                            {reviewerCriteria.map((criterion, idx) => (
                                                <CriterionRow
                                                    key={criterion.key}
                                                    index={idx + 1}
                                                    criterion={criterion}
                                                    score={scores[criterion.key] ?? ''}
                                                    notes={notes[criterion.key] ?? ''}
                                                    onScoreChange={(value) => handleScoreChange(criterion.key, value, criterion.max_score || 10)}
                                                    onNotesChange={(value) => handleNotesChange(criterion.key, value)}
                                                    existingGrade={existingGrades.find(g => g.criterion_name === criterion.name && g.grader_role === 'reviewer')}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardBody>

                    {allCriteria.length > 0 && (
                        <CardFooter className="grading-form-footer">
                            <div className="action-buttons">
                                <Button
                                    variant="outline"
                                    onClick={handleSave}
                                    disabled={!isDirty || saveGradesMutation.isPending}
                                    loading={saveGradesMutation.isPending}
                                >
                                    <Save size={16} />
                                    Lưu nháp
                                </Button>

                                <Button
                                    variant="primary"
                                    onClick={() => setShowConfirmSubmit(true)}
                                    disabled={!allFilled || submitGradesMutation.isPending}
                                >
                                    <CheckCircle size={16} />
                                    Hoàn thành chấm điểm
                                </Button>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>

            {/* Confirm Submit Modal */}
            <ConfirmModal
                isOpen={showConfirmSubmit}
                onClose={() => setShowConfirmSubmit(false)}
                onConfirm={handleSubmit}
                title="Xác nhận hoàn thành"
                message="Sau khi hoàn thành, bạn sẽ không thể chỉnh sửa điểm. Bạn có chắc chắn?"
                confirmText="Hoàn thành"
                variant="primary"
                loading={submitGradesMutation.isPending}
            />
        </div>
    );
}

/**
 * Criterion Row Component
 */
function CriterionRow({ index, criterion, score, notes, onScoreChange, onNotesChange, existingGrade }) {
    return (
        <div className="grading-criteria-item">
            <div className="criteria-header">
                <div className="criteria-info">
                    <span className="criteria-index">{index}</span>
                    <div>
                        <h4 className="criteria-name">{criterion.name}</h4>
                    </div>
                </div>
                <div className="criteria-weight">
                    <span className="weight-value">
                        {((criterion.weight || 0) * 100).toFixed(0)}%
                    </span>
                    <span className="weight-label">Trọng số</span>
                </div>
            </div>

            <div className="criteria-input-row">
                <div className="score-input-group">
                    <Input
                        type="number"
                        min="0"
                        max={criterion.max_score || 10}
                        step="0.5"
                        value={score}
                        onChange={(e) => onScoreChange(e.target.value)}
                        placeholder="0"
                        className="score-input"
                    />
                    <span className="score-max">
                        / {criterion.max_score || 10}
                    </span>
                </div>

                <Textarea
                    placeholder="Ghi chú (tùy chọn)..."
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    rows={2}
                    className="notes-input"
                />
            </div>

            {existingGrade && (
                <div className="criteria-saved-indicator">
                    <CheckCircle size={12} />
                    Đã lưu
                </div>
            )}
        </div>
    );
}

export default GradingDetailPage;
