import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    BookOpen, User, Calendar, Code, AlertTriangle, 
    ExternalLink, Github, FileText, ClipboardList, FileTextIcon
} from 'lucide-react';
import { 
    Modal, 
    Badge,
    Card,
    CardBody,
    Button,
    StatusBadge,
    SkeletonText,
} from '../../../components/ui';
import { supabase } from '../../../lib/supabase';
import './StudentTopicDetailModal.css';

/**
 * Modal chi tiết đề tài sinh viên
 * Hiển thị thông tin đề tài khi click vào từ TeacherClassDetailPage
 */
export function StudentTopicDetailModal({ isOpen, onClose, topicId, studentInfo }) {
    const navigate = useNavigate();
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch topic details when modal opens
    useEffect(() => {
        if (isOpen && topicId) {
            fetchTopicDetails();
        } else {
            setTopic(null);
        }
    }, [isOpen, topicId]);

    const fetchTopicDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('topics')
                .select(`
                    *,
                    student:profiles!topics_student_id_fkey(
                        id, full_name, student_code, email
                    ),
                    class:classes(
                        id, name, code,
                        session:sessions(id, name)
                    ),
                    sample_topic:sample_topics(
                        id, title
                    )
                `)
                .eq('id', topicId)
                .single();

            if (error) throw error;
            setTopic(data);
        } catch (err) {
            console.error('Error fetching topic details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewLogbook = () => {
        onClose();
        navigate(`/teacher/logbook/${topicId}`);
    };

    const handleViewGrading = () => {
        onClose();
        navigate(`/teacher/grading/${topicId}`);
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Chi tiết đề tài"
            size="lg"
        >
            {loading ? (
                <div className="topic-detail-content">
                    <Card className="topic-detail-card">
                        <CardBody>
                            <SkeletonText lines={8} />
                        </CardBody>
                    </Card>
                </div>
            ) : topic ? (
                <div className="topic-detail-content">
                    <Card className="topic-detail-card">
                        <CardBody>
                            {/* Header */}
                            <div className="topic-detail-header">
                                <div className="topic-detail-icon">
                                    <BookOpen size={24} aria-hidden="true" />
                                </div>
                                <div className="topic-detail-header-content">
                                    <h3 className="topic-detail-title">{topic.title}</h3>
                                    <div className="topic-detail-meta">
                                        <StatusBadge status={topic.status} />
                                        {topic.sample_topic && (
                                            <Badge variant="secondary" size="sm">
                                                Từ đề tài mẫu
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Student & Class Info */}
                            <div className="topic-detail-info-row">
                                <div className="topic-detail-info-item">
                                    <User size={16} aria-hidden="true" />
                                    <span className="topic-detail-info-label">Sinh viên:</span>
                                    <span className="topic-detail-info-value">
                                        {topic.student?.full_name} ({topic.student?.student_code})
                                    </span>
                                </div>
                                <div className="topic-detail-info-item">
                                    <Calendar size={16} aria-hidden="true" />
                                    <span className="topic-detail-info-label">Lớp:</span>
                                    <span className="topic-detail-info-value">
                                        {topic.class?.name} - {topic.class?.session?.name}
                                    </span>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="topic-detail-info-row">
                                <div className="topic-detail-info-item">
                                    <Calendar size={16} aria-hidden="true" />
                                    <span className="topic-detail-info-label">Ngày đăng ký:</span>
                                    <span className="topic-detail-info-value">
                                        {formatDate(topic.created_at)}
                                    </span>
                                </div>
                                {topic.approved_at && (
                                    <div className="topic-detail-info-item">
                                        <Calendar size={16} aria-hidden="true" />
                                        <span className="topic-detail-info-label">Ngày duyệt:</span>
                                        <span className="topic-detail-info-value">
                                            {formatDate(topic.approved_at)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="topic-detail-section">
                                <h4 className="topic-detail-section-title">Mô tả</h4>
                                <p className="topic-detail-description">
                                    {topic.description || 'Chưa có mô tả'}
                                </p>
                            </div>

                            {/* Technologies */}
                            {(topic.technologies || []).length > 0 && (
                                <div className="topic-detail-section">
                                    <h4 className="topic-detail-section-title">
                                        <Code size={14} aria-hidden="true" />
                                        Công nghệ sử dụng
                                    </h4>
                                    <div className="topic-detail-tech-tags">
                                        {topic.technologies.map((tech, i) => (
                                            <Badge key={i} variant="secondary" size="sm">
                                                <Code size={12} aria-hidden="true" />
                                                {tech}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Repository URL */}
                            {topic.repo_url && (
                                <div className="topic-detail-section">
                                    <h4 className="topic-detail-section-title">
                                        <Github size={14} aria-hidden="true" />
                                        Repository
                                    </h4>
                                    <a 
                                        href={topic.repo_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="topic-detail-repo-link"
                                    >
                                        {topic.repo_url}
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}

                            {/* Revision Note (if any) */}
                            {topic.revision_note && (
                                <div className="topic-detail-section topic-detail-notes">
                                    <h4 className="topic-detail-section-title">
                                        <AlertTriangle size={14} aria-hidden="true" />
                                        Yêu cầu chỉnh sửa
                                    </h4>
                                    <p>{topic.revision_note}</p>
                                </div>
                            )}

                            {/* Rejection Reason (if any) */}
                            {topic.rejection_reason && (
                                <div className="topic-detail-section topic-detail-notes" style={{ background: 'var(--danger-50)', borderColor: 'var(--danger-200)' }}>
                                    <h4 className="topic-detail-section-title" style={{ color: 'var(--danger-700)' }}>
                                        <AlertTriangle size={14} aria-hidden="true" />
                                        Lý do từ chối
                                    </h4>
                                    <p style={{ color: 'var(--danger-800)' }}>{topic.rejection_reason}</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            ) : (
                <div className="topic-detail-content">
                    <Card className="topic-detail-card">
                        <CardBody>
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                Không tìm thấy thông tin đề tài
                            </p>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Actions */}
            <div className="topic-detail-actions">
                <Button variant="ghost" onClick={onClose}>
                    Đóng
                </Button>
                {topic && topic.status !== 'pending' && topic.status !== 'rejected' && (
                    <>
                        <Button 
                            variant="outline" 
                            leftIcon={<ClipboardList size={16} />}
                            onClick={handleViewLogbook}
                        >
                            Xem nhật ký
                        </Button>
                        <Button 
                            leftIcon={<FileText size={16} />}
                            onClick={handleViewGrading}
                        >
                            Chấm điểm
                        </Button>
                    </>
                )}
            </div>
        </Modal>
    );
}

export default StudentTopicDetailModal;
