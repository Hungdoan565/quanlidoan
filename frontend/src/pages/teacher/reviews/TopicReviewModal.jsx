import { useState } from 'react';
import {
    X,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
    BookOpen,
    Calendar,
    Code,
    FileText,
    Loader2
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

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
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

                    {/* Action Forms */}
                    {topic.status === 'pending' && (
                        <div className="action-section">
                            <h4>Thao tác</h4>

                            {/* Action Type Selection */}
                            {!actionType && (
                                <div className="action-buttons">
                                    <Button
                                        variant="success"
                                        onClick={handleApprove}
                                        disabled={isLoading}
                                    >
{approveMutation.isPending ? (
                                            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                                        ) : (
                                            <CheckCircle size={18} aria-hidden="true" />
                                        )}
                                        Phê duyệt
                                    </Button>
                                    <Button
                                        variant="warning"
                                        onClick={() => setActionType('revision')}
                                        disabled={isLoading}
                                    >
                                        <AlertCircle size={18} aria-hidden="true" />
                                        Yêu cầu chỉnh sửa
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => setActionType('reject')}
                                        disabled={isLoading}
                                    >
                                        <XCircle size={18} aria-hidden="true" />
                                        Từ chối
                                    </Button>
                                </div>
                            )}

                            {/* Revision Form */}
                            {actionType === 'revision' && (
                                <div className="action-form">
                                    <label htmlFor="revision-note">Nội dung yêu cầu chỉnh sửa:</label>
                                    <textarea
                                        id="revision-note"
                                        value={revisionNote}
                                        onChange={(e) => setRevisionNote(e.target.value)}
                                        placeholder="Nhập nội dung yêu cầu sinh viên chỉnh sửa…"
                                        rows={4}
                                    />
                                    <div className="form-actions">
                                        <Button
                                            variant="outline"
                                            onClick={() => setActionType(null)}
                                            disabled={isLoading}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            variant="warning"
                                            onClick={handleRevision}
                                            disabled={!revisionNote.trim() || isLoading}
                                        >
{revisionMutation.isPending ? (
                                                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                                            ) : (
                                                <AlertCircle size={18} aria-hidden="true" />
                                            )}
                                            Gửi yêu cầu
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Reject Form */}
                            {actionType === 'reject' && (
                                <div className="action-form">
                                    <label htmlFor="reject-reason">Lý do từ chối:</label>
                                    <textarea
                                        id="reject-reason"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Nhập lý do từ chối đề tài…"
                                        rows={4}
                                    />
                                    <div className="form-actions">
                                        <Button
                                            variant="outline"
                                            onClick={() => setActionType(null)}
                                            disabled={isLoading}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            variant="danger"
                                            onClick={handleReject}
                                            disabled={!rejectReason.trim() || isLoading}
                                        >
{rejectMutation.isPending ? (
                                                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                                            ) : (
                                                <XCircle size={18} aria-hidden="true" />
                                            )}
                                            Xác nhận từ chối
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer for non-pending topics */}
                {topic.status !== 'pending' && (
                    <div className="modal-footer">
                        <Button variant="outline" onClick={onClose}>
                            Đóng
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TopicReviewModal;
