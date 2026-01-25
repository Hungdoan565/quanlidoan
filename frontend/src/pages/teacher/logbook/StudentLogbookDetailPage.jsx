import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    BookOpen, ArrowLeft, Calendar, CheckCircle, Clock,
    MessageSquare, Send, AlertCircle, XCircle,
    FileText, FileCheck, Presentation, Code, Download,
    ListChecks, Loader, Target, AlertTriangle, Paperclip,
    Users, Github, ExternalLink, ChevronDown
} from 'lucide-react';
import {
    Button,
    Card,
    CardBody,
    Badge,
    Input,
    Textarea,
    Modal,
    SkeletonText,
    NoDataState,
    ErrorState,
} from '../../../components/ui';
import {
    useTopicLogbookDetail,
    useApproveEntry,
    useRequestRevision,
    useAddTeacherNote,
    useConfirmMeeting,
    useUnconfirmMeeting,
} from '../../../hooks/useLogbook';
import { useReportsByTopic, useDownloadReport } from '../../../hooks/useReports';
import { logbookService } from '../../../services/logbook.service';
import './StudentLogbookDetailPage.css';

// Status config for logbook entries
const LOGBOOK_STATUS_CONFIG = {
    draft: { variant: 'default', label: 'Bản nháp', icon: Clock },
    pending: { variant: 'warning', label: 'Chờ duyệt', icon: Clock },
    approved: { variant: 'success', label: 'Đã duyệt', icon: CheckCircle },
    needs_revision: { variant: 'danger', label: 'Cần sửa', icon: AlertTriangle },
};

export function StudentLogbookDetailPage() {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const [feedbackModal, setFeedbackModal] = useState({ open: false, entryId: null, action: null });
    const [feedbackText, setFeedbackText] = useState('');
    const [confirmModal, setConfirmModal] = useState({ open: false, entryId: null });
    const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
    const [downloadingAttachment, setDownloadingAttachment] = useState(null);
    const [expandedEntries, setExpandedEntries] = useState(new Set());

    // Queries
    const { data: topic, isLoading, error, refetch } = useTopicLogbookDetail(topicId);
    const approveEntry = useApproveEntry();
    const requestRevision = useRequestRevision();
    const addNote = useAddTeacherNote();
    const confirmMeeting = useConfirmMeeting();
    const unconfirmMeeting = useUnconfirmMeeting();

    // Reports data
    const { data: reports = [], isLoading: reportsLoading } = useReportsByTopic(topicId);
    const downloadReport = useDownloadReport();

    // Handle attachment download
    const handleDownloadAttachment = async (attachment) => {
        try {
            setDownloadingAttachment(attachment.path || attachment.name);
            await logbookService.downloadAttachment(attachment);
            toast.success('Đã tải tệp: ' + attachment.name);
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Không thể tải tệp: ' + (err.message || 'Lỗi không xác định'));
        } finally {
            setDownloadingAttachment(null);
        }
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return 'Chưa có';
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    // Calculate week date range
    const getWeekDateRange = (weekNumber) => {
        if (!topic?.approved_at) return '';
        const start = new Date(topic.approved_at);
        start.setDate(start.getDate() + (weekNumber - 1) * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${formatDate(start)} - ${formatDate(end)}`;
    };

    // Report phases configuration
    const reportPhases = [
        { id: 'report1', name: 'Báo cáo Tiến độ 1', icon: FileText },
        { id: 'report2', name: 'Báo cáo Tiến độ 2', icon: FileText },
        { id: 'final', name: 'Báo cáo Cuối kỳ', icon: FileCheck },
        { id: 'slide', name: 'Slide Bảo vệ', icon: Presentation },
        { id: 'source_code', name: 'Mã nguồn', icon: Code },
    ];

    // Get reports summary
    const getReportsSummary = () => {
        const submitted = {};
        reportPhases.forEach(phase => {
            const phaseReports = reports.filter(r => r.phase === phase.id);
            if (phaseReports.length > 0) {
                submitted[phase.id] = phaseReports.reduce((a, b) => 
                    a.version > b.version ? a : b
                );
            }
        });
        return {
            submitted,
            count: Object.keys(submitted).length,
            total: reportPhases.length
        };
    };

    const reportsSummary = getReportsSummary();
    const entries = topic?.logbook_entries || [];
    const approvedCount = entries.filter(e => e.status === 'approved' || e.teacher_confirmed).length;
    const pendingCount = entries.filter(e => e.status === 'pending').length;

    // Get status config for entry
    const getStatusConfig = (entry) => {
        const status = entry.status || (entry.teacher_confirmed ? 'approved' : 'pending');
        return LOGBOOK_STATUS_CONFIG[status] || LOGBOOK_STATUS_CONFIG.pending;
    };

    // Handle approve
    const handleApprove = async (entryId) => {
        await approveEntry.mutateAsync({
            entryId,
            feedback: feedbackText || null,
            topicId,
        });
        setFeedbackModal({ open: false, entryId: null, action: null });
        setFeedbackText('');
    };

    // Handle request revision
    const handleRequestRevision = async (entryId) => {
        if (!feedbackText.trim()) {
            return; // Require feedback for revision
        }
        await requestRevision.mutateAsync({
            entryId,
            feedback: feedbackText,
            topicId,
        });
        setFeedbackModal({ open: false, entryId: null, action: null });
        setFeedbackText('');
    };

    // Handle confirm meeting (legacy support)
    const handleOpenConfirmModal = (entry) => {
        setMeetingDate(entry.meeting_date
            ? new Date(entry.meeting_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setConfirmModal({ open: true, entryId: entry.id });
    };

    const handleConfirmMeeting = async () => {
        await confirmMeeting.mutateAsync({
            entryId: confirmModal.entryId,
            meetingDate: meetingDate,
            topicId,
        });
        setConfirmModal({ open: false, entryId: null });
    };

    // Handle unconfirm
    const handleUnconfirm = async (entryId) => {
        if (window.confirm('Bạn có chắc muốn hủy xác nhận buổi gặp này?')) {
            await unconfirmMeeting.mutateAsync({ entryId, topicId });
        }
    };

    // Render task list
    const renderTaskList = (tasks, showProgress = false) => {
        if (!tasks || tasks.length === 0) {
            return <span className="no-tasks">Không có</span>;
        }

        return (
            <ul className="task-display-list">
                {tasks.map((task, index) => {
                    const taskText = typeof task === 'string' ? task : task.task;
                    const progress = typeof task === 'object' ? task.progress : null;
                    
                    return (
                        <li key={index} className="task-display-item">
                            <span className="task-text">{taskText}</span>
                            {showProgress && progress !== null && (
                                <span className="task-progress-badge">{progress}%</span>
                            )}
                        </li>
                    );
                })}
            </ul>
        );
    };

    if (isLoading) {
        return (
            <div className="logbook-detail-page">
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

    if (!topic) {
        return (
            <div className="logbook-detail-page">
                <NoDataState
                    icon={AlertCircle}
                    title="Không tìm thấy đề tài"
                    description="Đề tài không tồn tại hoặc bạn không có quyền xem"
                    action={
                        <Button onClick={() => navigate('/teacher/logbook')}>
                            Quay lại
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className="logbook-detail-page">
            {/* Header */}
            <div className="page-header">
                <Button
                    variant="ghost"
                    leftIcon={<ArrowLeft size={18} />}
                    onClick={() => navigate('/teacher/logbook')}
                >
                    Quay lại
                </Button>
            </div>

            {/* Student Info */}
            <Card className="student-info-card">
                <CardBody>
                    <div className="student-header">
                        <div className="student-avatar large">
                            {topic.student?.full_name?.charAt(0) || 'S'}
                        </div>
                        <div className="student-details">
                            <h1 className="student-name">{topic.student?.full_name}</h1>
                            <p className="student-code">{topic.student?.student_code}</p>
                            <p className="student-email">{topic.student?.email}</p>
                        </div>
                    </div>
                    <div className="topic-info">
                        <div className="topic-title-row">
                            <BookOpen size={18} />
                            <span>{topic.title}</span>
                        </div>
                        <div className="topic-meta">
                            <span>Lớp: {topic.class?.name}</span>
                            <span>•</span>
                            <span>Duyệt: {formatDate(topic.approved_at)}</span>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="logbook-stats-grid">
                        <div className="stat-item">
                            <span className="stat-value">{entries.length}</span>
                            <span className="stat-label">Nhật ký</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{approvedCount}</span>
                            <span className="stat-label">Đã duyệt</span>
                        </div>
                        <div className="stat-item stat-highlight">
                            <span className="stat-value">{pendingCount}</span>
                            <span className="stat-label">Chờ duyệt</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{reportsSummary.count}/{reportsSummary.total}</span>
                            <span className="stat-label">Báo cáo</span>
                        </div>
                    </div>

                    {/* Repository URL Section */}
                    {topic.repo_url && (
                        <div className="repo-url-section">
                            <div className="repo-url-header">
                                <Github size={18} />
                                <span>Repository mã nguồn</span>
                            </div>
                            <a 
                                href={topic.repo_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="repo-url-link"
                            >
                                {topic.repo_url}
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Reports Progress Section */}
            <Card className="reports-section-card">
                <CardBody>
                    <div className="reports-header">
                        <h2 className="section-title">
                            <FileText size={20} />
                            Báo cáo tiến độ
                        </h2>
                        <Badge 
                            variant={reportsSummary.count === reportsSummary.total ? 'success' : 'info'}
                            size="lg"
                        >
                            {reportsSummary.count}/{reportsSummary.total} đã nộp
                        </Badge>
                    </div>
                    
                    <div className="reports-grid">
                        {reportPhases.map(phase => {
                            const report = reportsSummary.submitted[phase.id];
                            const isSubmitted = !!report;
                            const PhaseIcon = phase.icon;
                            
                            return (
                                <div key={phase.id} className={`report-item ${isSubmitted ? 'submitted' : 'pending'}`}>
                                    <div className="report-icon">
                                        <PhaseIcon size={18} />
                                    </div>
                                    <div className="report-info">
                                        <span className="report-name">{phase.name}</span>
                                        {isSubmitted ? (
                                            <>
                                                <span className="report-meta">
                                                    v{report.version} • {formatDate(report.submitted_at)}
                                                </span>
                                                <span className="report-filename">{report.file_name}</span>
                                            </>
                                        ) : (
                                            <span className="report-status">Chưa nộp</span>
                                        )}
                                    </div>
                                    <div className="report-actions">
                                        {isSubmitted ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                leftIcon={<Download size={14} />}
                                                onClick={() => downloadReport.mutate(report)}
                                                loading={downloadReport.isPending}
                                            >
                                                Tải về
                                            </Button>
                                        ) : (
                                            <Badge variant="default">Chờ</Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardBody>
            </Card>

            {/* Entries List */}
            <div className="entries-section">
                <h2 className="section-title">
                    Nhật ký ({entries.length} entries)
                    {pendingCount > 0 && (
                        <Badge variant="warning" style={{ marginLeft: 8 }}>
                            {pendingCount} chờ duyệt
                        </Badge>
                    )}
                </h2>

                {entries.length === 0 ? (
                    <Card>
                        <CardBody>
                            <NoDataState
                                icon={BookOpen}
                                title="Chưa có nhật ký"
                                description="Sinh viên chưa thêm nhật ký nào"
                            />
                        </CardBody>
                    </Card>
                ) : (
                    <div className="entries-list entries-accordion">
                        {entries.map((entry) => {
                            const statusConfig = getStatusConfig(entry);
                            const StatusIcon = statusConfig.icon;
                            const isApproved = entry.status === 'approved' || entry.teacher_confirmed;
                            const isPending = entry.status === 'pending';
                            const hasStructuredData = entry.completed_tasks || entry.in_progress_tasks || entry.planned_tasks;
                            const isExpanded = expandedEntries.has(entry.id);
                            
                            // Calculate task counts for summary
                            const completedCount = entry.completed_tasks?.length || 0;
                            const inProgressCount = entry.in_progress_tasks?.length || 0;
                            const plannedCount = entry.planned_tasks?.length || 0;
                            const totalTasks = completedCount + inProgressCount + plannedCount;
                            
                            const toggleExpand = () => {
                                setExpandedEntries(prev => {
                                    const next = new Set(prev);
                                    if (next.has(entry.id)) {
                                        next.delete(entry.id);
                                    } else {
                                        next.add(entry.id);
                                    }
                                    return next;
                                });
                            };

                            return (
                                <div 
                                    key={entry.id} 
                                    className={`entry-accordion-card entry-status-${entry.status || 'pending'} ${isExpanded ? 'expanded' : ''}`}
                                >
                                    {/* Collapsed Header - Always Visible */}
                                    <button 
                                        type="button"
                                        className="entry-accordion-header"
                                        onClick={toggleExpand}
                                        aria-expanded={isExpanded}
                                    >
                                        <div className="entry-accordion-left">
                                            <span className="entry-week-badge">Tuần {entry.week_number}</span>
                                            <span className="entry-date-range">{getWeekDateRange(entry.week_number)}</span>
                                        </div>
                                        
                                        <div className="entry-accordion-right">
                                            {/* Task counts summary */}
                                            {totalTasks > 0 && (
                                                <div className="entry-task-summary">
                                                    <span className="task-count completed" title="Đã hoàn thành">
                                                        <ListChecks size={12} />
                                                        {completedCount}
                                                    </span>
                                                    <span className="task-count in-progress" title="Đang thực hiện">
                                                        <Loader size={12} />
                                                        {inProgressCount}
                                                    </span>
                                                    <span className="task-count planned" title="Kế hoạch">
                                                        <Target size={12} />
                                                        {plannedCount}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {/* Status badge */}
                                            <Badge variant={statusConfig.variant} size="sm">
                                                <StatusIcon size={12} />
                                                {statusConfig.label}
                                            </Badge>
                                            
                                            {/* Expand chevron */}
                                            <span className={`entry-chevron ${isExpanded ? 'rotated' : ''}`}>
                                                <ChevronDown size={18} />
                                            </span>
                                        </div>
                                    </button>
                                    
                                    {/* Expandable Content */}
                                    <div className={`entry-accordion-content ${isExpanded ? 'expanded' : ''}`}>
                                        <div className="entry-accordion-body">
                                            {/* Meeting Info */}
                                            <div className="entry-meeting-info">
                                                <div className="meta-item">
                                                    <Calendar size={14} />
                                                    <span>Ngày gặp: {formatDate(entry.meeting_date)}</span>
                                                </div>
                                                {entry.meeting_type && (
                                                    <Badge variant="default" size="sm">
                                                        <Users size={12} />
                                                        {entry.meeting_type === 'online' ? 'Online' : 'Trực tiếp'}
                                                    </Badge>
                                                )}
                                                {entry.attachments?.length > 0 && (
                                                    <div className="meta-item">
                                                        <Paperclip size={14} />
                                                        <span>{entry.attachments.length} tệp</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Attachments List - Downloadable */}
                                            {entry.attachments?.length > 0 && (
                                                <div className="entry-attachments">
                                                    <div className="attachments-header">
                                                        <Paperclip size={16} />
                                                        <span>Tệp đính kèm ({entry.attachments.length})</span>
                                                    </div>
                                                    <ul className="attachments-list">
                                                        {entry.attachments.map((attachment, idx) => (
                                                            <li key={idx} className="attachment-item">
                                                                <div className="attachment-info">
                                                                    <FileText size={14} />
                                                                    <span className="attachment-name">{attachment.name}</span>
                                                                    {attachment.size && (
                                                                        <span className="attachment-size">
                                                                            ({(attachment.size / 1024).toFixed(1)} KB)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    leftIcon={<Download size={14} />}
                                                                    onClick={() => handleDownloadAttachment(attachment)}
                                                                    loading={downloadingAttachment === (attachment.path || attachment.name)}
                                                                >
                                                                    Tải
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Structured Content Display */}
                                            {hasStructuredData ? (
                                                <div className="entry-structured-content">
                                                    {/* Completed Tasks */}
                                                    <div className="task-section">
                                                        <div className="task-section-header">
                                                            <ListChecks size={16} className="icon-success" />
                                                            <span>Đã hoàn thành ({completedCount})</span>
                                                        </div>
                                                        {renderTaskList(entry.completed_tasks)}
                                                    </div>

                                                    {/* In Progress Tasks */}
                                                    <div className="task-section">
                                                        <div className="task-section-header">
                                                            <Loader size={16} className="icon-primary" />
                                                            <span>Đang thực hiện ({inProgressCount})</span>
                                                        </div>
                                                        {renderTaskList(entry.in_progress_tasks, true)}
                                                    </div>

                                                    {/* Planned Tasks */}
                                                    <div className="task-section">
                                                        <div className="task-section-header">
                                                            <Target size={16} className="icon-warning" />
                                                            <span>Kế hoạch tuần sau ({plannedCount})</span>
                                                        </div>
                                                        {renderTaskList(entry.planned_tasks)}
                                                    </div>

                                                    {/* Issues */}
                                                    {entry.issues && (
                                                        <div className="task-section issues-section">
                                                            <div className="task-section-header">
                                                                <AlertTriangle size={16} className="icon-danger" />
                                                                <span>Vấn đề & Khó khăn</span>
                                                            </div>
                                                            <p className="issues-text">{entry.issues}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* Legacy content display */
                                                <div className="entry-content">
                                                    <p className="content-text">{entry.content}</p>
                                                </div>
                                            )}

                                            {/* Teacher Feedback Section */}
                                            <div className="teacher-section">
                                                <label className="section-label">Phản hồi của GV:</label>
                                                {entry.feedback_comment || entry.teacher_note ? (
                                                    <div className="teacher-note">
                                                        <MessageSquare size={14} />
                                                        <div>
                                                            <span>{entry.feedback_comment || entry.teacher_note}</span>
                                                            {entry.feedback_at && (
                                                                <span className="feedback-time">
                                                                    {new Date(entry.feedback_at).toLocaleString('vi-VN')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="no-note">Chưa có phản hồi</p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="entry-actions">
                                                {isPending && (
                                                    <>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            leftIcon={<AlertTriangle size={14} />}
                                                            onClick={() => setFeedbackModal({ 
                                                                open: true, 
                                                                entryId: entry.id, 
                                                                action: 'revision' 
                                                            })}
                                                        >
                                                            Yêu cầu sửa
                                                        </Button>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            leftIcon={<CheckCircle size={14} />}
                                                            onClick={() => setFeedbackModal({ 
                                                                open: true, 
                                                                entryId: entry.id, 
                                                                action: 'approve' 
                                                            })}
                                                        >
                                                            Duyệt
                                                        </Button>
                                                    </>
                                                )}

                                                {isApproved && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        leftIcon={<XCircle size={14} />}
                                                        onClick={() => handleUnconfirm(entry.id)}
                                                    >
                                                        Hủy duyệt
                                                    </Button>
                                                )}

                                                {!isApproved && !isPending && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        leftIcon={<MessageSquare size={14} />}
                                                        onClick={() => setFeedbackModal({ 
                                                            open: true, 
                                                            entryId: entry.id, 
                                                            action: 'note' 
                                                        })}
                                                    >
                                                        Thêm ghi chú
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Feedback Modal */}
            <Modal
                isOpen={feedbackModal.open}
                onClose={() => {
                    setFeedbackModal({ open: false, entryId: null, action: null });
                    setFeedbackText('');
                }}
                title={
                    feedbackModal.action === 'approve' ? 'Duyệt Nhật ký' :
                    feedbackModal.action === 'revision' ? 'Yêu cầu Sinh viên sửa' :
                    'Thêm ghi chú'
                }
                size="md"
            >
                <div className="feedback-form">
                    <Textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={
                            feedbackModal.action === 'approve' 
                                ? 'Nhận xét (không bắt buộc)...'
                                : feedbackModal.action === 'revision'
                                    ? 'Nhập lý do yêu cầu sửa (bắt buộc)...'
                                    : 'Nhập ghi chú cho sinh viên...'
                        }
                        rows={4}
                    />
                    {feedbackModal.action === 'revision' && !feedbackText.trim() && (
                        <p className="form-error">Vui lòng nhập lý do yêu cầu sửa</p>
                    )}
                    <p className="form-hint">
                        {feedbackModal.action === 'approve' 
                            ? 'Bạn có thể thêm nhận xét hoặc để trống.'
                            : 'Phản hồi sẽ hiển thị cho sinh viên xem.'
                        }
                    </p>
                    <div className="form-actions">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setFeedbackModal({ open: false, entryId: null, action: null });
                                setFeedbackText('');
                            }}
                        >
                            Hủy
                        </Button>
                        {feedbackModal.action === 'approve' && (
                            <Button
                                leftIcon={<CheckCircle size={16} />}
                                onClick={() => handleApprove(feedbackModal.entryId)}
                                loading={approveEntry.isPending}
                            >
                                Duyệt
                            </Button>
                        )}
                        {feedbackModal.action === 'revision' && (
                            <Button
                                variant="danger"
                                leftIcon={<AlertTriangle size={16} />}
                                onClick={() => handleRequestRevision(feedbackModal.entryId)}
                                loading={requestRevision.isPending}
                                disabled={!feedbackText.trim()}
                            >
                                Yêu cầu sửa
                            </Button>
                        )}
                        {feedbackModal.action === 'note' && (
                            <Button
                                leftIcon={<Send size={16} />}
                                onClick={async () => {
                                    await addNote.mutateAsync({
                                        entryId: feedbackModal.entryId,
                                        note: feedbackText,
                                        topicId,
                                    });
                                    setFeedbackModal({ open: false, entryId: null, action: null });
                                    setFeedbackText('');
                                }}
                                loading={addNote.isPending}
                            >
                                Lưu ghi chú
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Confirm Meeting Modal (legacy) */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, entryId: null })}
                title="Xác nhận buổi gặp"
                size="sm"
            >
                <div className="confirm-form">
                    <p>Xác nhận bạn đã gặp và trao đổi với sinh viên.</p>
                    <div className="form-group">
                        <label>Ngày gặp thực tế:</label>
                        <Input
                            type="date"
                            leftIcon={<Calendar size={16} />}
                            value={meetingDate}
                            onChange={(e) => setMeetingDate(e.target.value)}
                        />
                    </div>
                    <div className="form-actions">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmModal({ open: false, entryId: null })}
                        >
                            Hủy
                        </Button>
                        <Button
                            leftIcon={<CheckCircle size={16} />}
                            onClick={handleConfirmMeeting}
                            loading={confirmMeeting.isPending}
                        >
                            Xác nhận
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default StudentLogbookDetailPage;
