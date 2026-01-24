import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    User,
    Mail,
    Clock,
    Edit,
    CheckCircle,
    AlertCircle,
    XCircle,
    FileText,
    Code,
    ArrowLeft,
    Calendar,
    Users,
    GraduationCap,
    Check
} from 'lucide-react';
import { useMyTopic, useUpdateTopic, useStudentClass } from '../../hooks/useTopics';
import {
    Card,
    CardHeader,
    CardBody,
    Button,
    Input,
    Textarea,
    SkeletonCard,
    EmptyState
} from '../../components/ui';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import './MyTopicPage.css';

const TECH_STACKS = {
    'Frontend': ['React', 'Vue.js', 'Angular', 'Next.js', 'HTML/CSS', 'Tailwind CSS', 'Bootstrap'],
    'Backend': ['Node.js', 'Express.js', 'NestJS', 'Django', 'Flask', 'Spring Boot', 'Laravel', 'ASP.NET'],
    'Database': ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Firebase'],
    'Mobile': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Ionic'],
    'DevOps': ['Docker', 'Kubernetes', 'AWS', 'Azure', 'Vercel', 'Netlify'],
    'Other': ['GraphQL', 'REST API', 'WebSocket', 'JWT', 'OAuth', 'AI/ML', 'Blockchain']
};

const statusConfig = {
    pending: { 
        label: 'Chờ duyệt', 
        color: 'warning', 
        icon: Clock,
        description: 'Đề tài của bạn đang chờ giảng viên xem xét và phê duyệt.',
        bgClass: 'status-pending'
    },
    revision: { 
        label: 'Yêu cầu sửa', 
        color: 'warning', 
        icon: AlertCircle,
        description: 'Giảng viên yêu cầu bạn chỉnh sửa đề tài.',
        bgClass: 'status-revision'
    },
    approved: { 
        label: 'Đã duyệt', 
        color: 'success', 
        icon: CheckCircle,
        description: 'Đề tài đã được phê duyệt. Bạn có thể bắt đầu thực hiện!',
        bgClass: 'status-approved'
    },
    in_progress: { 
        label: 'Đang thực hiện', 
        color: 'info', 
        icon: FileText,
        description: 'Bạn đang trong quá trình thực hiện đồ án.',
        bgClass: 'status-progress'
    },
    completed: { 
        label: 'Hoàn thành', 
        color: 'success', 
        icon: CheckCircle,
        description: 'Đồ án đã hoàn thành. Chúc mừng bạn!',
        bgClass: 'status-completed'
    },
    rejected: { 
        label: 'Bị từ chối', 
        color: 'danger', 
        icon: XCircle,
        description: 'Đề tài không được chấp nhận.',
        bgClass: 'status-rejected'
    },
};

export function MyTopicPage() {
    const navigate = useNavigate();
    const { data: topic, isLoading } = useMyTopic();
    const { data: studentClass } = useStudentClass();
    const updateTopic = useUpdateTopic();

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        technologies: [],
    });

    const handleStartEdit = () => {
        setEditForm({
            title: topic?.title || '',
            description: topic?.description || '',
            technologies: topic?.technologies || [],
        });
        setIsEditing(true);
    };

    const toggleTech = (tech) => {
        setEditForm(prev => {
            const exists = prev.technologies.includes(tech);
            if (exists) {
                return { ...prev, technologies: prev.technologies.filter(t => t !== tech) };
            } else {
                return { ...prev, technologies: [...prev.technologies, tech] };
            }
        });
    };

    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        await updateTopic.mutateAsync({
            topicId: topic.id,
            title: editForm.title,
            description: editForm.description,
            technologies: editForm.technologies,
        });
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <div className="my-topic-page">
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

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
    const teacher = topic.advisor || topic.class?.advisor || topic.teacher;

    return (
        <div className="my-topic-page">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/student/dashboard')}
                className="back-button"
            >
                <ArrowLeft size={18} />
                Quay lại
            </Button>

            <div className={`status-hero ${status.bgClass}`}>
                <div className="status-hero-icon">
                    <StatusIcon size={28} />
                </div>
                <div className="status-hero-content">
                    <h2>{status.label}</h2>
                    <p>{status.description}</p>
                </div>
                {canEdit && !isEditing && (
                    <Button variant="outline" size="sm" onClick={handleStartEdit} className="status-hero-action">
                        <Edit size={16} />
                        Chỉnh sửa đề tài
                    </Button>
                )}
            </div>

            {topic.status === 'revision' && topic.revision_note && (
                <div className="revision-note">
                    <AlertCircle size={18} />
                    <div>
                        <strong>Ghi chú từ giảng viên:</strong>
                        <p>{topic.revision_note}</p>
                    </div>
                </div>
            )}

            {topic.status === 'rejected' && (
                <div className="rejected-note">
                    <XCircle size={18} />
                    <div>
                        <strong>Lý do từ chối:</strong>
                        <p>{topic.rejection_reason || 'Đề tài không phù hợp.'}</p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/student/register')}>
                            Đăng ký đề tài mới
                        </Button>
                    </div>
                </div>
            )}

            <div className="topic-content-grid">
                <div className="topic-main">
                    <Card className="topic-card">
                        <CardBody>
                            {isEditing ? (
                                <form onSubmit={handleSubmitEdit} className="edit-form">
                                    <div className="form-group">
                                        <label>Tên đề tài <span className="required">*</span></label>
                                        <Input
                                            value={editForm.title}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Mô tả chi tiết</label>
                                        <Textarea
                                            value={editForm.description}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                            rows={4}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Công nghệ sử dụng <span className="required">*</span></label>
                                        <div className="tech-chips-container">
                                            {Object.entries(TECH_STACKS).map(([category, techs]) => (
                                                <div key={category} className="tech-category">
                                                    <div className="category-label">{category}</div>
                                                    <div className="category-chips">
                                                        {techs.map(tech => (
                                                            <button
                                                                key={tech}
                                                                type="button"
                                                                className={`tech-chip ${editForm.technologies.includes(tech) ? 'selected' : ''}`}
                                                                onClick={() => toggleTech(tech)}
                                                            >
                                                                {editForm.technologies.includes(tech) && <Check size={12} />}
                                                                {tech}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                                            Hủy
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            loading={updateTopic.isPending}
                                            disabled={!editForm.title.trim() || editForm.technologies.length === 0}
                                        >
                                            Gửi lại
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="topic-details">
                                    <h1 className="topic-title">{topic.title}</h1>
                                    {topic.description && (
                                        <div className="topic-description">
                                            <p>{topic.description}</p>
                                        </div>
                                    )}
                                    {topic.technologies?.length > 0 && (
                                        <div className="topic-technologies">
                                            <div className="tech-label">
                                                <Code size={16} />
                                                <span>Công nghệ:</span>
                                            </div>
                                            <div className="tech-tags">
                                                {topic.technologies.map((tech, i) => (
                                                    <span key={i} className="tech-tag">{tech}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="topic-meta">
                                        <div className="meta-item">
                                            <Calendar size={14} />
                                            <span>Đăng ký: {format(new Date(topic.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                                        </div>
                                        {topic.sample_topic && (
                                            <div className="meta-item sample">
                                                <BookOpen size={14} />
                                                <span>Từ đề tài mẫu</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                <div className="topic-sidebar">
                    <Card className="sidebar-card teacher-card">
                        <CardHeader>
                            <h3>
                                <GraduationCap size={18} />
                                Giảng viên hướng dẫn
                            </h3>
                        </CardHeader>
                        <CardBody>
                            {teacher ? (
                                <div className="teacher-info">
                                    <div className="teacher-avatar">
                                        <User size={28} />
                                    </div>
                                    <div className="teacher-details">
                                        <h4>{teacher.full_name}</h4>
                                        {teacher.teacher_code && (
                                            <span className="teacher-code">{teacher.teacher_code}</span>
                                        )}
                                        <a href={`mailto:${teacher.email}`} className="teacher-email">
                                            <Mail size={14} />
                                            {teacher.email}
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="no-teacher">
                                    <User size={24} />
                                    <span>Chưa phân công</span>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {studentClass && (
                        <Card className="sidebar-card class-card">
                            <CardHeader>
                                <h3>
                                    <Users size={18} />
                                    Thông tin lớp
                                </h3>
                            </CardHeader>
                            <CardBody>
                                <div className="class-info-list">
                                    <div className="info-row">
                                        <span className="info-label">Lớp đồ án</span>
                                        <span className="info-value">{studentClass.name}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Đợt</span>
                                        <span className="info-value">{studentClass.session?.name || '-'}</span>
                                    </div>
                                    {studentClass.session?.submission_deadline && (
                                        <div className="info-row deadline">
                                            <span className="info-label">Hạn nộp báo cáo</span>
                                            <span className="info-value">
                                                {format(new Date(studentClass.session.submission_deadline), 'dd/MM/yyyy')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
