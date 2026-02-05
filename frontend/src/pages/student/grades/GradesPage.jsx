import {
    Award,
    Calendar,
    Clock,
    FileText,
    Star,
    User,
    Users,
    MapPin,
    AlertCircle,
    CheckCircle,
    BookOpen
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardBody,
    Badge,
    SkeletonCard,
    NoDataState,
    ErrorState,
    ProgressBar,
} from '../../../components/ui';
import { useGradeSummary, useDefenseSchedule } from '../../../hooks/useGrades';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import './GradesPage.css';

const gradeClassification = (score) => {
    if (score >= 9) return { label: 'Xuất sắc', variant: 'success', icon: Star };
    if (score >= 8) return { label: 'Giỏi', variant: 'success', icon: Award };
    if (score >= 7) return { label: 'Khá', variant: 'info', icon: CheckCircle };
    if (score >= 5) return { label: 'Trung bình', variant: 'warning', icon: AlertCircle };
    return { label: 'Yếu', variant: 'danger', icon: AlertCircle };
};

export function GradesPage() {
    const { data: summary, isLoading, error, refetch, topic } = useGradeSummary();
    const { data: defenseSchedule, isLoading: scheduleLoading } = useDefenseSchedule();

    if (isLoading) {
        return (
            <div className="grades-page">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title"><Award size={28}  aria-hidden="true" /> Xem Điểm</h1>
                    </div>
                </div>
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    if (error) {
        return (
            <div className="grades-page">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title"><Award size={28}  aria-hidden="true" /> Xem Điểm</h1>
                    </div>
                </div>
                <ErrorState 
                    onRetry={refetch}
                    title="Không thể tải dữ liệu"
                    message={error?.message || "Đã xảy ra lỗi khi tải thông tin điểm. Vui lòng thử lại sau."}
                />
            </div>
        );
    }

    if (!topic) {
        return (
            <div className="grades-page">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title"><Award size={28}  aria-hidden="true" /> Xem Điểm</h1>
                    </div>
                </div>
                <NoDataState
                    icon={BookOpen}
                    title="Chưa có đề tài"
                    description="Bạn cần đăng ký và được duyệt đề tài trước khi xem điểm"
                />
            </div>
        );
    }

    const classification = summary?.hasGrades && summary.averageScore 
        ? gradeClassification(summary.averageScore) 
        : null;
    const ClassificationIcon = classification?.icon;

    return (
        <div className="grades-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">
                        <Award size={28}  aria-hidden="true" />
                        Xem Điểm
                    </h1>
                    <p className="page-subtitle">{topic.title}</p>
                </div>
            </div>

            {/* Topic Status Info */}
            <Card className="topic-status-card">
                <CardBody>
                    <div className="topic-status-grid">
                        <div className="status-item">
                            <span className="status-label">Trạng thái đề tài</span>
                            <Badge variant={topic.status === 'completed' ? 'success' : 'info'}>
                                {topic.status === 'completed' ? 'Hoàn thành' : 
                                 topic.status === 'defended' ? 'Đã bảo vệ' :
                                 topic.status === 'in_progress' ? 'Đang thực hiện' : 
                                 topic.status === 'approved' ? 'Đã duyệt' : topic.status}
                            </Badge>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Giảng viên HD</span>
                            <span className="status-value">
                                {topic.advisor?.full_name || 'Chưa phân công'}
                            </span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Lớp</span>
                            <span className="status-value">
                                {topic.class?.name || '-'}
                            </span>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Defense Schedule */}
            {scheduleLoading ? (
                <SkeletonCard />
            ) : defenseSchedule ? (
                <Card className="defense-card">
                    <CardHeader>
                        <h3><Calendar size={18}  aria-hidden="true" /> Lịch Bảo vệ</h3>
                    </CardHeader>
                    <CardBody>
                        <div className="defense-grid">
                            <div className="defense-item">
                                <Calendar size={16}  aria-hidden="true" />
                                <div>
                                    <span className="defense-label">Ngày bảo vệ</span>
                                    <span className="defense-value">
                                        {format(new Date(defenseSchedule.defense_date), 'EEEE, dd/MM/yyyy', { locale: vi })}
                                    </span>
                                </div>
                            </div>
                            <div className="defense-item">
                                <Clock size={16}  aria-hidden="true" />
                                <div>
                                    <span className="defense-label">Thời gian</span>
                                    <span className="defense-value">
                                        {defenseSchedule.start_time} - {defenseSchedule.end_time}
                                    </span>
                                </div>
                            </div>
                            {defenseSchedule.room && (
                                <div className="defense-item">
                                    <MapPin size={16}  aria-hidden="true" />
                                    <div>
                                        <span className="defense-label">Phòng</span>
                                        <span className="defense-value">{defenseSchedule.room}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Council Members */}
                        {defenseSchedule.council?.members?.length > 0 && (
                            <div className="council-section">
                                <h4><Users size={16}  aria-hidden="true" /> Hội đồng bảo vệ</h4>
                                <div className="council-members">
                                    {defenseSchedule.council.members.map((member) => (
                                        <div key={member.id} className="council-member">
                                            <User size={14}  aria-hidden="true" />
                                            <span className="member-name">{member.teacher?.full_name}</span>
                                            <Badge variant="outline" size="sm">
                                                {member.role === 'chairman' ? 'Chủ tịch' :
                                                 member.role === 'secretary' ? 'Thư ký' : 'Thành viên'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {defenseSchedule.notes && (
                            <div className="defense-notes">
                                <strong>Ghi chú:</strong> {defenseSchedule.notes}
                            </div>
                        )}
                    </CardBody>
                </Card>
            ) : (
                <Card className="defense-card empty">
                    <CardBody>
                        <NoDataState
                            icon={Calendar}
                            title="Chưa có lịch bảo vệ"
                            description="Lịch bảo vệ sẽ được cập nhật khi đến giai đoạn bảo vệ đồ án"
                        />
                    </CardBody>
                </Card>
            )}

            {/* Grades Section */}
            {!summary?.hasGrades ? (
                <Card className="grades-card empty">
                    <CardBody>
                        <NoDataState
                            icon={Award}
                            title="Chưa có điểm"
                            description="Điểm sẽ được công bố sau khi bạn hoàn thành bảo vệ đồ án và được giảng viên chấm điểm"
                        />
                    </CardBody>
                </Card>
            ) : (
                <>
                    {/* Grade Summary */}
                    <Card className="grade-summary-card">
                        <CardBody>
                            <div className="grade-summary">
                                <div className="grade-score-section">
                                    <div className="grade-score">
                                        <span className="score-value">{summary.averageScore.toFixed(1)}</span>
                                        <span className="score-max">/10</span>
                                    </div>
                                    {classification && (
                                        <Badge variant={classification.variant} className="grade-classification">
                                            <ClassificationIcon size={14}  aria-hidden="true" />
                                            {classification.label}
                                        </Badge>
                                    )}
                                </div>
                                <div className="grade-meta">
                                    <div className="grade-meta-item">
                                        <span className="meta-label">Tổng điểm</span>
                                        <span className="meta-value">{summary.totalScore}/{summary.maxPossible}</span>
                                    </div>
                                    {summary.gradedAt && (
                                        <div className="grade-meta-item">
                                            <span className="meta-label">Ngày chấm</span>
                                            <span className="meta-value">
                                                {format(new Date(summary.gradedAt), 'dd/MM/yyyy', { locale: vi })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Detailed Grades */}
                    <Card className="grades-detail-card">
                        <CardHeader>
                            <h3><FileText size={18}  aria-hidden="true" /> Chi tiết điểm theo tiêu chí</h3>
                        </CardHeader>
                        <CardBody>
                            <div className="grades-list">
                                {summary.grades.map((grade) => (
                                    <div key={grade.id} className="grade-item">
                                        <div className="grade-item-header">
                                            <span className="criteria-name">
                                                {grade.criterion_name}
                                            </span>
                                            <div className="grade-score-badge">
                                                <span className="item-score">{grade.score}</span>
                                                <span className="item-max">/10</span>
                                            </div>
                                        </div>
                                        
                                        <ProgressBar 
                                            value={grade.score} 
                                            max={10} 
                                            variant={grade.score >= 8 ? 'success' : grade.score >= 5 ? 'warning' : 'danger'}
                                        />
                                        
                                        {grade.notes && (
                                            <div className="grade-comments">
                                                <strong>Nhận xét:</strong> {grade.notes}
                                            </div>
                                        )}
                                        
                                        {grade.graded_by && (
                                            <div className="grade-grader">
                                                <User size={12}  aria-hidden="true" />
                                                <span>{grade.graded_by.full_name}</span>
                                                {grade.grader_role && (
                                                    <Badge variant="outline" size="sm">
                                                        {grade.grader_role === 'advisor' ? 'GVHD' :
                                                         grade.grader_role === 'reviewer' ? 'GVPB' : 
                                                         grade.grader_role === 'council' ? 'Hội đồng' : grade.grader_role}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </>
            )}
        </div>
    );
}

export default GradesPage;
