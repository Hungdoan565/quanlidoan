import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    User,
    Mail,
    Phone,
    Clock,
    Edit,
    CheckCircle,
    AlertCircle,
    XCircle,
    FileText,
    Code,
    ArrowLeft
} from 'lucide-react';
import { useMyTopic, useUpdateTopic } from '../../hooks/useTopics';
import {
    Card,
    CardHeader,
    CardBody,
    Button,
    Input,
    Textarea,
    Badge,
    StatusBadge,
    ProgressTimeline,
    SkeletonCard,
    EmptyState
} from '../../components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import './MyTopicPage.css';

const statusConfig = {
    pending: { label: 'Chờ duyệt', color: 'warning', icon: Clock },
    revision: { label: 'Yêu cầu sửa', color: 'warning', icon: AlertCircle },
    approved: { label: 'Đã duyệt', color: 'success', icon: CheckCircle },
    in_progress: { label: 'Đang thực hiện', color: 'info', icon: FileText },
    submitted: { label: 'Đã nộp', color: 'info', icon: FileText },
    defended: { label: 'Đã bảo vệ', color: 'success', icon: CheckCircle },
    completed: { label: 'Hoàn thành', color: 'success', icon: CheckCircle },
    rejected: { label: 'Bị từ chối', color: 'danger', icon: XCircle },
};

export function MyTopicPage() {
    const navigate = useNavigate();
    const { data: topic, isLoading, error } = useMyTopic();
    const updateTopic = useUpdateTopic();

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        technologies: '',
    });

    // Start editing
    const handleStartEdit = () => {
        setEditForm({
            title: topic?.title || '',
            description: topic?.description || '',
            technologies: topic?.technologies?.join(', ') || '',
        });
        setIsEditing(true);
    };

    // Submit edit
    const handleSubmitEdit = async (e) => {
        e.preventDefault();

        const technologies = editForm.technologies
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        await updateTopic.mutateAsync({
            topicId: topic.id,
            title: editForm.title,
            description: editForm.description,
            technologies,
        });

        setIsEditing(false);
    };

    // Loading
    if (isLoading) {
        return (
            <div className="my-topic-page">
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    // No topic
    if (!topic) {
        return (
            <div className="my-topic-page">
                <EmptyState
                    icon={BookOpen}
                    title="Bạn chưa đăng ký đề tài"
                    description="Đăng ký đề tài để bắt đầu thực hiện đồ án của bạn"
                    action={
                        <Button onClick={() => navigate('/student/register')}>
                            <BookOpen size={18} />
                            Đăng ký đề tài ngay
                        </Button>
                    }
                />
            </div>
        );
    }

    const status = statusConfig[topic.status] || statusConfig.pending;
    const StatusIcon = status.icon;
    const canEdit = topic.status === 'revision';

    return (
        <div className="my-topic-page">
            {/* Page Header */}
            <div className="page-header">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/student/dashboard')}
                >
                    <ArrowLeft size={18} />
                    Quay lại
                </Button>
                <div className="page-header-content">
                    <h1>Đề tài của tôi</h1>
                </div>
            </div>

            {/* Revision Warning */}
            {topic.status === 'revision' && topic.revision_note && (
                <Card className="revision-warning-card">
                    <CardBody>
                        <div className="revision-warning">
                            <AlertCircle size={24} />
                            <div className="revision-content">
                                <h4>Yêu cầu chỉnh sửa từ giảng viên</h4>
                                <p>{topic.revision_note}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Rejected Warning */}
            {topic.status === 'rejected' && (
                <Card className="rejected-warning-card">
                    <CardBody>
                        <div className="rejected-warning">
                            <XCircle size={24} />
                            <div className="rejected-content">
                                <h4>Đề tài bị từ chối</h4>
                                <p>{topic.rejection_reason || 'Đề tài không được chấp nhận.'}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/student/register')}
                                >
                                    Đăng ký đề tài mới
                                </Button>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Topic Info */}
            <Card className="topic-info-card">
                <CardHeader>
                    <div className="card-header-with-action">
                        <div className="topic-header-left">
                            <Badge variant={status.color}>
                                <StatusIcon size={14} />
                                {status.label}
                            </Badge>
                            {topic.sample_topic && (
                                <Badge variant="default">Đề tài mẫu</Badge>
                            )}
                        </div>
                        {canEdit && !isEditing && (
                            <Button variant="outline" size="sm" onClick={handleStartEdit}>
                                <Edit size={16} />
                                Chỉnh sửa
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardBody>
                    {isEditing ? (
                        <form onSubmit={handleSubmitEdit} className="edit-form">
                            <div className="form-group">
                                <label>Tên đề tài *</label>
                                <Input
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Mô tả</label>
                                <Textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                />
                            </div>
                            <div className="form-group">
                                <label>Công nghệ</label>
                                <Input
                                    value={editForm.technologies}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, technologies: e.target.value }))}
                                    placeholder="React, Node.js, PostgreSQL"
                                />
                            </div>
                            <div className="form-actions">
                                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                                    Hủy
                                </Button>
                                <Button type="submit" loading={updateTopic.isPending}>
                                    Gửi lại
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="topic-details">
                            <h2 className="topic-title">{topic.title}</h2>

                            {topic.description && (
                                <p className="topic-description">{topic.description}</p>
                            )}

                            {topic.technologies?.length > 0 && (
                                <div className="topic-technologies">
                                    <Code size={16} />
                                    <div className="tech-tags">
                                        {topic.technologies.map((tech, i) => (
                                            <span key={i} className="tech-tag">{tech}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="topic-meta">
                                <span className="meta-item">
                                    <Clock size={14} />
                                    Đăng ký: {format(new Date(topic.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                </span>
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Teacher Info - Single Supervisor Card */}
            <Card className="teacher-card supervisor-card">
                <CardHeader>
                    <Badge variant="primary">Giảng viên phụ trách</Badge>
                </CardHeader>
                <CardBody>
                    {(topic.advisor || topic.teacher) ? (
                        <div className="teacher-info">
                            <div className="teacher-avatar">
                                <User size={32} />
                            </div>
                            <div className="teacher-details">
                                <h4>{(topic.advisor || topic.teacher).full_name}</h4>
                                {(topic.advisor || topic.teacher).teacher_code && (
                                    <span className="teacher-code">{(topic.advisor || topic.teacher).teacher_code}</span>
                                )}
                                <p className="teacher-role">Hướng dẫn & Phản biện</p>
                                <div className="teacher-contact">
                                    <a href={`mailto:${(topic.advisor || topic.teacher).email}`}>
                                        <Mail size={14} />
                                        {(topic.advisor || topic.teacher).email}
                                    </a>
                                    {(topic.advisor || topic.teacher).phone && (
                                        <a href={`tel:${(topic.advisor || topic.teacher).phone}`}>
                                            <Phone size={14} />
                                            {(topic.advisor || topic.teacher).phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-teacher">
                            <User size={24} />
                            <span>Chưa phân công giảng viên</span>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
