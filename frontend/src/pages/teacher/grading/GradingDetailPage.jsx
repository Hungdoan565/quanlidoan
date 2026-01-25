/**
 * GradingDetailPage - Simplified for Single Grading Flow
 * 
 * Design:
 * - Single section: Bảng chấm điểm (Advisor criteria only)
 * - Columns: # | Tiêu chí | Điểm nhập | Trọng số | Thành phần | Notes
 * - Total Score calculated directly from weighted criteria
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    CheckCircle,
    AlertTriangle,
    User,
    BookOpen,
    MessageSquare,
    ChevronDown,
    ClipboardCheck,
    Calculator,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useGradingCriteria, useTopicGrades, useSaveGrades, useSubmitGrades } from '../../../hooks/useGrading';
import { topicsService } from '../../../services/topics.service';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Card,
    CardBody,
    Button,
    Input,
    Textarea,
    StatusBadge,
    SkeletonCard,
    EmptyState,
    ConfirmModal
} from '../../../components/ui';
import './GradingDetailPage.css';

const SCORE_INPUT_PATTERN = /^\d*(?:[.,]\d*)?$/;

export function GradingDetailPage() {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuthStore();

    // State for scores - keyed by "graderRole_criterionName"
    const [scores, setScores] = useState({});
    const [notes, setNotes] = useState({});
    const [expandedNotes, setExpandedNotes] = useState(new Set());
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
    const { data: criteriaGroups = { advisor: [] }, isLoading: criteriaLoading } = useGradingCriteria(sessionId);

    // Fetch existing grades
    const { data: existingGrades = [], isLoading: gradesLoading } = useTopicGrades(topicId, profile?.id);

    // Mutations
    const saveGradesMutation = useSaveGrades();
    const submitGradesMutation = useSubmitGrades();

    // Prepare criteria with keys - ONLY ADVISOR
    const criteria = useMemo(() => {
        return (criteriaGroups.advisor || []).map((c, index) => ({
            ...c,
            graderRole: 'advisor',
            key: `advisor_${c.name}`,
            index,
        }));
    }, [criteriaGroups.advisor]);

    // Initialize scores from existing grades
    useEffect(() => {
        if (existingGrades.length > 0) {
            const initialScores = {};
            const initialNotes = {};
            const notesWithContent = new Set();
            
            existingGrades.forEach(grade => {
                // Ensure we only load advisor grades if any stray reviewer grades exist
                if (grade.grader_role === 'advisor') {
                    const key = `${grade.grader_role}_${grade.criterion_name}`;
                    initialScores[key] = grade.score?.toString() || '';
                    initialNotes[key] = grade.notes || '';
                    if (grade.notes) {
                        notesWithContent.add(key);
                    }
                }
            });
            setScores(initialScores);
            setNotes(initialNotes);
            setExpandedNotes(notesWithContent);
        }
    }, [existingGrades]);

    const parseScoreValue = useCallback((rawValue, maxScore) => {
        if (rawValue === '' || rawValue === null || rawValue === undefined) {
            return null;
        }

        const normalized = rawValue.toString().replace(',', '.');
        const numValue = Number(normalized);

        if (Number.isNaN(numValue)) return null;
        if (numValue < 0 || numValue > maxScore) return null;

        return numValue;
    }, []);

    // Handle score change
    const handleScoreChange = useCallback((key, value) => {
        if (value === '' || SCORE_INPUT_PATTERN.test(value)) {
            setScores(prev => ({ ...prev, [key]: value }));
            setIsDirty(true);
        }
    }, []);

    const handleScoreBlur = useCallback((key, maxScore) => {
        let didUpdate = false;
        setScores(prev => {
            const rawValue = prev[key];
            if (rawValue === '' || rawValue === null || rawValue === undefined) {
                return prev;
            }

            const normalized = rawValue.toString().replace(',', '.');
            const numValue = Number(normalized);
            if (Number.isNaN(numValue)) {
                didUpdate = true;
                return { ...prev, [key]: '' };
            }

            const clamped = Math.min(Math.max(numValue, 0), maxScore);
            const rounded = Math.round(clamped * 100) / 100;
            const formatted = Number.isInteger(rounded)
                ? rounded.toString()
                : rounded.toFixed(2).replace(/\.?0+$/, '');

            if (formatted === rawValue) {
                return prev;
            }

            didUpdate = true;
            return { ...prev, [key]: formatted };
        });
        if (didUpdate) {
            setIsDirty(true);
        }
    }, []);

    // Handle notes change
    const handleNotesChange = useCallback((key, value) => {
        setNotes(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
    }, []);

    // Toggle notes expansion
    const toggleNotes = useCallback((key) => {
        setExpandedNotes(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const getScoreValue = useCallback((criterion) => {
        const maxScore = Number(criterion.max_score || 10);
        return parseScoreValue(scores[criterion.key], maxScore);
    }, [scores, parseScoreValue]);

    // Calculate component score for a criterion
    const getComponentScore = useCallback((criterion) => {
        const scoreValue = getScoreValue(criterion);
        if (scoreValue === null) return null;
        const maxScore = Number(criterion.max_score || 10);
        const weight = criterion.weight || 0;
        // Component score = (điểm nhập / max) * trọng số * 10
        return (scoreValue / maxScore) * weight * 10;
    }, [getScoreValue]);

    // Calculate subtotal
    const calculateSubtotal = useCallback((criteriaList) => {
        let sum = 0;
        let filledCount = 0;
        criteriaList.forEach(c => {
            const component = getComponentScore(c);
            if (component !== null) {
                sum += component;
                filledCount++;
            }
        });
        return { sum, filledCount, total: criteriaList.length };
    }, [getComponentScore]);

    // Result
    const result = useMemo(() => calculateSubtotal(criteria), [calculateSubtotal, criteria]);

    const allFilled = result.total > 0 && result.filledCount === result.total;
    const weightTotal = useMemo(
        () => criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0),
        [criteria]
    );
    const maxTotal = weightTotal * 10;
    const isWeightValid = Math.abs(weightTotal - 1) < 0.01;

    const invalidScores = useMemo(() => {
        return criteria.filter(criterion => {
            const rawValue = scores[criterion.key];
            if (rawValue === '' || rawValue === undefined || rawValue === null) {
                return false;
            }
            return getScoreValue(criterion) === null;
        });
    }, [criteria, scores, getScoreValue]);

    const hasInvalidScores = invalidScores.length > 0;
    const canSubmit = allFilled && isWeightValid && !hasInvalidScores;

    // Save all scores
    const handleSave = async () => {
        if (hasInvalidScores) {
            const firstInvalid = invalidScores[0];
            const maxScore = Number(firstInvalid?.max_score || 10);
            toast.error(`Äiá»ƒm khÃ´ng há»£p lá»‡: ${firstInvalid?.name}. Vui lÃ²ng nháº­p trong khoáº£ng 0 - ${maxScore}.`);
            return;
        }

        const gradesToSave = criteria
            .filter(c => scores[c.key] !== '' && scores[c.key] !== undefined)
            .map(c => ({
                topicId,
                criterionName: c.name,
                score: parseScoreValue(scores[c.key], Number(c.max_score || 10)),
                notes: notes[c.key] || '',
                gradedBy: profile.id,
                graderRole: c.graderRole,
            }));

        if (gradesToSave.length === 0) return;

        await saveGradesMutation.mutateAsync(gradesToSave);
        setIsDirty(false);
    };

    // Submit final grades
    const handleSubmit = async () => {
        await handleSave();
        // Only submit for advisor
        await submitGradesMutation.mutateAsync({ topicId, graderType: 'advisor' });
        
        setShowConfirmSubmit(false);
        navigate('/teacher/grading');
    };

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
                            <ArrowLeft size={16} aria-hidden="true" />
                            Quay lại
                        </Button>
                    }
                />
            </div>
        );
    }

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
                        <ArrowLeft size={20} aria-hidden="true" />
                    </button>
                    <div>
                        <h1>Chấm điểm</h1>
                        <p>{topic.title}</p>
                    </div>
                </div>
            </div>

            <div className="grading-detail-content">
                {/* Topic Info Card */}
                <Card className="topic-info-card compact">
                    <CardBody>
                        <div className="topic-info-compact">
                            <div className="topic-main-info">
                                <h2 className="topic-title">{topic.title}</h2>
                                <StatusBadge status={topic.status} />
                            </div>
                            <div className="topic-meta-row">
                                <span className="meta-item">
                                    <User size={14} aria-hidden="true" />
                                    {topic.student?.full_name}
                                    {topic.student?.student_code && ` (${topic.student.student_code})`}
                                </span>
                                <span className="meta-item">
                                    <BookOpen size={14} aria-hidden="true" />
                                    {topic.class?.name}
                                </span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {criteria.length === 0 ? (
                    <Card>
                        <CardBody>
                            <EmptyState
                                title="Chưa có tiêu chí chấm điểm"
                                description="Admin cần cấu hình tiêu chí chấm điểm cho đợt này"
                            />
                        </CardBody>
                    </Card>
                ) : (
                    <>
                        <GradingSection
                            label="Bảng chấm điểm"
                            criteria={criteria}
                            scores={scores}
                            notes={notes}
                            expandedNotes={expandedNotes}
                            existingGrades={existingGrades}
                            onScoreChange={handleScoreChange}
                            onScoreBlur={handleScoreBlur}
                            onNotesChange={handleNotesChange}
                            onToggleNotes={toggleNotes}
                            getComponentScore={getComponentScore}
                            getScoreValue={getScoreValue}
                            subtotal={result.sum}
                            filledCount={result.filledCount}
                            totalCount={result.total}
                            weightTotal={weightTotal}
                            maxTotal={maxTotal}
                            isWeightValid={isWeightValid}
                        />

                        {/* Summary Card */}
                        <Card className="score-summary-card">
                            <CardBody>
                                <div className="summary-header">
                                    <Calculator size={20} aria-hidden="true" />
                                    <h3>TỔNG KẾT</h3>
                                </div>

                                <div className="summary-breakdown">
                                    <div className="summary-row final">
                                        <span className="row-label">TỔNG ĐIỂM</span>
                                        <span className="final-score">
                                            {result.filledCount > 0 ? result.sum.toFixed(2) : '—'}
                                        </span>
                                        <span className="final-max">/{maxTotal > 0 ? maxTotal.toFixed(2) : 'â€”'}</span>
                                    </div>
                                </div>

                                {(!isWeightValid || hasInvalidScores) && (
                                    <div className="summary-alerts">
                                        {!isWeightValid && (
                                            <div className="summary-alert warning">
                                                <AlertTriangle size={16} aria-hidden="true" />
                                                <span>
                                                    Tá»•ng trá»ng sá»‘ hiá»‡n táº¡i: {(weightTotal * 100).toFixed(0)}%. Vui lÃ²ng kiá»ƒm tra láº¡i.
                                                </span>
                                            </div>
                                        )}
                                        {hasInvalidScores && (
                                            <div className="summary-alert danger">
                                                <AlertTriangle size={16} aria-hidden="true" />
                                                <span>CÃ³ Ä‘iá»ƒm nháº­p khÃ´ng há»£p lá»‡. Vui lÃ²ng kiá»ƒm tra cá»™t Ä‘iá»ƒm.</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        {/* Actions */}
                        <div className="grading-actions">
                            <Button
                                variant="outline"
                                onClick={handleSave}
                                disabled={!isDirty || hasInvalidScores || saveGradesMutation.isPending}
                                loading={saveGradesMutation.isPending}
                            >
                                <Save size={16} aria-hidden="true" />
                                Lưu nháp
                            </Button>

                            <Button
                                variant="primary"
                                onClick={() => setShowConfirmSubmit(true)}
                                disabled={!canSubmit || submitGradesMutation.isPending}
                            >
                                <CheckCircle size={16} aria-hidden="true" />
                                Hoàn thành chấm điểm
                            </Button>
                        </div>
                    </>
                )}
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
 * GradingSection Component
 * Displays grading criteria with header, table, and subtotal
 */
function GradingSection({
    label,
    criteria,
    scores,
    notes,
    expandedNotes,
    existingGrades,
    onScoreChange,
    onScoreBlur,
    onNotesChange,
    onToggleNotes,
    getComponentScore,
    getScoreValue,
    subtotal,
    filledCount,
    totalCount,
    weightTotal,
    maxTotal,
    isWeightValid,
}) {
    const isComplete = filledCount === totalCount && totalCount > 0;
    
    return (
        <Card className="grading-section-card">
            {/* Section Header */}
            <div className="grading-section-header">
                <ClipboardCheck size={20} aria-hidden="true" />
                <h3>{label}</h3>
                <div className="section-meta">
                    <span className="section-progress">
                        {filledCount}/{totalCount}
                    </span>
                    <span
                        className={`section-weight ${isWeightValid ? 'valid' : 'invalid'}`}
                        title={`Tá»•ng trá»ng sá»‘: ${(weightTotal * 100).toFixed(0)}%`}
                    >
                        {isWeightValid ? (
                            <CheckCircle size={14} aria-hidden="true" />
                        ) : (
                            <AlertTriangle size={14} aria-hidden="true" />
                        )}
                        {(weightTotal * 100).toFixed(0)}%
                    </span>
                </div>
            </div>

            {/* Criteria Table */}
            <div className="grading-table">
                <div className="grading-table-row header">
                    <div className="col-index">#</div>
                    <div className="col-name">Tiêu chí</div>
                    <div className="col-input">Điểm nhập</div>
                    <div className="col-weight">Trọng số</div>
                    <div className="col-component">Thành phần</div>
                    <div className="col-notes"></div>
                </div>

                {criteria.map((criterion, idx) => {
                    const key = criterion.key;
                    const hasNotes = notes[key]?.trim();
                    const isExpanded = expandedNotes.has(key);
                    const componentScore = getComponentScore(criterion);
                    const existingGrade = existingGrades.find(
                        g => g.criterion_name === criterion.name && g.grader_role === 'advisor'
                    );
                    const maxScore = Number(criterion.max_score || 10);
                    const rawValue = scores[key];
                    const scoreValue = getScoreValue(criterion);
                    const isInvalidScore = rawValue !== '' && rawValue !== undefined && rawValue !== null && scoreValue === null;

                    return (
                        <div key={key} className="grading-table-row-wrapper">
                            <div className={`grading-table-row ${existingGrade ? 'saved' : ''}`}>
                                <div className="col-index">{idx + 1}</div>
                                <div className="col-name">
                                    <span className="criterion-name">{criterion.name}</span>
                                    {criterion.description && (
                                        <span className="criterion-desc">{criterion.description}</span>
                                    )}
                                </div>
                                <div className="col-input">
                                    <div className="score-input-compact">
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            pattern="\\d*(?:[.,]\\d*)?"
                                            value={scores[key] ?? ''}
                                            onChange={(e) => onScoreChange(key, e.target.value)}
                                            onBlur={() => onScoreBlur(key, maxScore)}
                                            placeholder="—"
                                            className={`score-input ${isInvalidScore ? 'is-invalid' : ''}`}
                                            aria-invalid={isInvalidScore}
                                            title={`Nháº­p Ä‘iá»ƒm 0 - ${maxScore}`}
                                        />
                                        <span className="score-max">/{maxScore}</span>
                                    </div>
                                </div>
                                <div className="col-weight">
                                    <span className="weight-badge">
                                        {((criterion.weight || 0) * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="col-component">
                                    <span className="component-score">
                                        {componentScore !== null ? componentScore.toFixed(2) : '—'}
                                    </span>
                                </div>
                                <div className="col-notes">
                                    <button
                                        type="button"
                                        className={`notes-toggle ${hasNotes ? 'has-content' : ''} ${isExpanded ? 'expanded' : ''}`}
                                        onClick={() => onToggleNotes(key)}
                                        aria-expanded={isExpanded}
                                        aria-label={isExpanded ? 'Ẩn ghi chú' : 'Thêm ghi chú'}
                                    >
                                        <MessageSquare size={16} />
                                        <ChevronDown size={14} className="chevron" />
                                    </button>
                                </div>
                            </div>

                            {/* Expandable Notes */}
                            {isExpanded && (
                                <div className="notes-expanded">
                                    <Textarea
                                        placeholder="Nhập ghi chú cho tiêu chí này..."
                                        value={notes[key] ?? ''}
                                        onChange={(e) => onNotesChange(key, e.target.value)}
                                        rows={2}
                                        className="notes-textarea"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Section Subtotal */}
            <div className="section-subtotal">
                <span className="subtotal-label">
                    Tổng điểm:
                </span>
                <span className="subtotal-value">
                    {filledCount > 0 ? subtotal.toFixed(2) : '—'}
                </span>
                <span className="subtotal-max">/{maxTotal > 0 ? maxTotal.toFixed(2) : 'â€”'}</span>
                {isComplete && <CheckCircle size={18} className="subtotal-check" />}
            </div>
        </Card>
    );
}

export default GradingDetailPage;
