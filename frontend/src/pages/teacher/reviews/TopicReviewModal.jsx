import { useState, useEffect } from 'react';
import {
    X,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
    BookOpen,
    Calendar,
    Code,
    FileText
} from 'lucide-react';
import { useApproveTopic, useRequestRevision, useRejectTopic } from '../../../hooks/useTeacherReviews';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import './TopicReviewModal.css';

export function TopicReviewModal({ topic, isOpen, onClose, onActionComplete }) {
    const [actionType, setActionType] = useState(null); // 'approve' | 'revision' | 'reject'
    const [revisionNote, setRevisionNote] = useState('');
    const [rejectReason, setRejectReason] = useState('');

    // Mutations
    const approveMutation = useApproveTopic();
    const revisionMutation = useRequestRevision();
    const rejectMutation = useRejectTopic();

    const isLoading = approveMutation.isPending || revisionMutation.isPending || rejectMutation.isPending;

    // Handle approve
    const handleApprove = async () => {
        try {
            await approveMutation.mutateAsync(topic.id);
            onActionComplete();
        } catch (error) {
            console.error('Approve error:', error);
        }
    };

    // Handle revision
    const handleRevision = async () => {
        if (!revisionNote.trim()) return;
        try {
            await revisionMutation.mutateAsync({ topicId: topic.id, note: revisionNote });
            onActionComplete();
        } catch (error) {
            console.error('Revision error:', error);
        }
    };

    // Handle reject
    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        try {
            await rejectMutation.mutateAsync({ topicId: topic.id, reason: rejectReason });
            onActionComplete();
        } catch (error) {
            console.error('Reject error:', error);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div className="topic-review-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2>Chi tiết đề tài</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Đóng">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content">
                    {/* Topic Title */}
                    <div className="topic-section">
                        <h3 className="topic-main-title">{topic.title}</h3>
                        {topic.sample_topic && (
                            <Badge variant="primary">Đề tài mẫu: {topic.sample_topic.title}</Badge>
                        )}
                    </div>

{/* Student Info */}
                    <div className="info-card">
                        <div className="info-header">
                            <User size={18} aria-hidden="true" />
                            <span>Thông tin sinh viên</span>
                        </div>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Họ tên</span>
                                <span className="info-value">{topic.student?.full_name}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">MSSV</span>
                                <span className="info-value">{topic.student?.student_code}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Email</span>
                                <span className="info-value">{topic.student?.email}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">SĐT</span>
                                <span className="info-value">{topic.student?.phone || '-'}</span>
                            </div>
                        </div>
                    </div>

{/* Class Info */}
                    <div className="info-card">
                        <div className="info-header">
                            <BookOpen size={18} aria-hidden="true" />
                            <span>Thông tin lớp học phần</span>
                        </div>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Lớp</span>
                                <span className="info-value">{topic.class?.name}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Mã lớp</span>
                                <span className="info-value">{topic.class?.code}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Đợt</span>
                                <span className="info-value">{topic.class?.session?.name}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Học kỳ</span>
                                <span className="info-value">
                                    HK{topic.class?.session?.semester} - {topic.class?.session?.academic_year}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Topic Description */}
{topic.description && (
                        <div className="info-card">
                            <div className="info-header">
                                <FileText size={18} aria-hidden="true" />
                                <span>Mô tả đề tài</span>
                            </div>
                            <p className="topic-description">{topic.description}</p>
                        </div>
                    )}

                    {/* Technologies */}
{topic.technologies && topic.technologies.length > 0 && (
                        <div className="info-card">
                            <div className="info-header">
                                <Code size={18} aria-hidden="true" />
                                <span>Công nghệ sử dụng</span>
                            </div>
                            <div className="tech-tags">
                                {topic.technologies.map((tech, index) => (
                                    <span key={index} className="tech-tag">{tech}</span>
                                ))}
                            </div>
                        </div>
                    )}

{/* Metadata */}
                    <div className="info-card">
                        <div className="info-header">
                            <Calendar size={18} aria-hidden="true" />
                            <span>Thời gian</span>
                        </div>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Ngày đăng ký</span>
                                <span className="info-value">{formatDate(topic.created_at)}</span>
                            </div>
                            {topic.approved_at && (
                                <div className="info-item">
                                    <span className="info-label">Ngày duyệt</span>
                                    <span className="info-value">{formatDate(topic.approved_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Previous Revision Note */}
                    {topic.revision_note && topic.status === 'revision' && (
                        <div className="info-card warning-card">
                            <div className="info-header">
                                <AlertCircle size={18} aria-hidden="true" />
                                <span>Yêu cầu chỉnh sửa trước đó</span>
                            </div>
                            <p className="revision-note">{topic.revision_note}</p>
                        </div>
                    )}
                </div>

                {/* Sticky Action Footer */}
                <div className="modal-footer">
                    {topic.status === 'pending' ? (
                        <>
                            {/* Action Type Selection */}
                            {!actionType && (
                                <div className="action-buttons-row">
                                    <Button
                                        variant="success"
                                        onClick={handleApprove}
                                        loading={approveMutation.isPending}
                                        disabled={isLoading}
                                        leftIcon={<CheckCircle size={18} />}
                                    >
                                        Phê duyệt
                                    </Button>
                                    <Button
                                        variant="warning"
                                        onClick={() => setActionType('revision')}
                                        disabled={isLoading}
                                        leftIcon={<AlertCircle size={18} />}
                                    >
                                        Yêu cầu chỉnh sửa
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => setActionType('reject')}
                                        disabled={isLoading}
                                        leftIcon={<XCircle size={18} />}
                                    >
                                        Từ chối
                                    </Button>
                                </div>
                            )}

                            {/* Revision Form */}
                            {actionType === 'revision' && (
                                <div className="action-form-inline">
                                    <div className="form-header">
                                        <AlertCircle size={18} className="icon-warning" aria-hidden="true" />
                                        <span>Yêu cầu chỉnh sửa</span>
                                    </div>
                                    <textarea
                                        id="revision-note"
                                        value={revisionNote}
                                        onChange={(e) => setRevisionNote(e.target.value)}
                                        placeholder="Nhập nội dung yêu cầu sinh viên chỉnh sửa…"
                                        rows={3}
                                        aria-label="Nội dung yêu cầu chỉnh sửa"
                                    />
                                    <div className="form-actions">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setActionType(null)}
                                            disabled={isLoading}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            variant="warning"
                                            onClick={handleRevision}
                                            loading={revisionMutation.isPending}
                                            disabled={!revisionNote.trim() || isLoading}
                                            leftIcon={<AlertCircle size={18} />}
                                        >
                                            Gửi yêu cầu
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Reject Form */}
                            {actionType === 'reject' && (
                                <div className="action-form-inline">
                                    <div className="form-header">
                                        <XCircle size={18} className="icon-danger" aria-hidden="true" />
                                        <span>Từ chối đề tài</span>
                                    </div>
                                    <textarea
                                        id="reject-reason"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Nhập lý do từ chối đề tài…"
                                        rows={3}
                                        aria-label="Lý do từ chối đề tài"
                                    />
                                    <div className="form-actions">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setActionType(null)}
                                            disabled={isLoading}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            variant="danger"
                                            onClick={handleReject}
                                            loading={rejectMutation.isPending}
                                            disabled={!rejectReason.trim() || isLoading}
                                            leftIcon={<XCircle size={18} />}
                                        >
                                            Xác nhận từ chối
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <Button variant="outline" onClick={onClose}>
                            Đóng
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TopicReviewModal;
