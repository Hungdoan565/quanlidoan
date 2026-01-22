import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    FileText,
    Users,
    Code,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Sparkles,
    User
} from 'lucide-react';
import {
    useStudentClass,
    useSampleTopics,
    useRegisterFromSample,
    useProposeTopic,
    useHasRegisteredTopic
} from '../../hooks/useTopics';
import { topicsService } from '../../services/topics.service';
import {
    Card,
    CardHeader,
    CardBody,
    Button,
    Input,
    Textarea,
    Badge,
    ConfirmModal,
    SkeletonCard,
    EmptyState,
    ErrorState
} from '../../components/ui';
import './TopicRegisterPage.css';

export function TopicRegisterPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('sample'); // 'sample' | 'propose'
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

    // Form state for proposing new topic
    const [proposeForm, setProposeForm] = useState({
        title: '',
        description: '',
        technologies: '',
    });

    // Queries
    const { data: studentClass, isLoading: classLoading, error: classError } = useStudentClass();
    const { data: sampleTopics = [], isLoading: topicsLoading } = useSampleTopics(studentClass?.session_id);
    const { data: hasRegistered, isLoading: checkingRegistration } = useHasRegisteredTopic();

    // Mutations
    const registerFromSample = useRegisterFromSample();
    const proposeTopic = useProposeTopic();

    // Check registration status
    const isRegistrationOpen = studentClass?.session
        ? topicsService.isRegistrationOpen(studentClass.session)
        : false;

    // Redirect if already registered
    useEffect(() => {
        if (hasRegistered === true) {
            navigate('/student/topic');
        }
    }, [hasRegistered, navigate]);

    // Handle select sample topic
    const handleSelectTopic = (topic) => {
        setSelectedTopic(topic);
        setConfirmModalOpen(true);
    };

    // Handle confirm registration from sample
    const handleConfirmRegister = async () => {
        if (!selectedTopic || !studentClass) return;

        await registerFromSample.mutateAsync({
            classId: studentClass.id,
            sampleTopicId: selectedTopic.id,
        });

        setConfirmModalOpen(false);
        navigate('/student/topic');
    };

    // Handle submit propose form
    const handleSubmitPropose = async (e) => {
        e.preventDefault();
        if (!studentClass) return;

        // Parse technologies from comma-separated string
        const technologies = proposeForm.technologies
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        await proposeTopic.mutateAsync({
            classId: studentClass.id,
            title: proposeForm.title,
            description: proposeForm.description,
            technologies,
        });

        navigate('/student/topic');
    };

    // Loading state
    if (classLoading || checkingRegistration) {
        return (
            <div className="topic-register-page">
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    // Error: Not in any class
    if (classError || !studentClass) {
        return (
            <div className="topic-register-page">
                <EmptyState
                    icon={AlertCircle}
                    title="Chưa được phân vào lớp"
                    description="Bạn cần được Admin phân vào một lớp đồ án trước khi có thể đăng ký đề tài."
                    action={
                        <Button variant="outline" onClick={() => navigate('/student/dashboard')}>
                            Quay lại Dashboard
                        </Button>
                    }
                />
            </div>
        );
    }

    // Check registration deadline
    if (!isRegistrationOpen) {
        return (
            <div className="topic-register-page">
                <EmptyState
                    icon={Clock}
                    title="Chưa đến hoặc đã hết hạn đăng ký"
                    description={`Thời gian đăng ký đề tài cho đợt "${studentClass.session?.name}" chưa mở hoặc đã kết thúc.`}
                    action={
                        <Button variant="outline" onClick={() => navigate('/student/dashboard')}>
                            Quay lại Dashboard
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className="topic-register-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Đăng ký Đề tài</h1>
                    <p>Chọn đề tài mẫu từ giảng viên hoặc tự đề xuất đề tài của bạn</p>
                </div>
            </div>

            {/* Class Info Card */}
            <Card className="class-info-card">
                <CardBody>
                    <div className="class-info-grid">
                        <div className="class-info-item">
                            <span className="info-label">Lớp đồ án</span>
                            <span className="info-value">{studentClass.name}</span>
                        </div>
                        <div className="class-info-item">
                            <span className="info-label">Đợt</span>
                            <span className="info-value">{studentClass.session?.name}</span>
                        </div>
                        <div className="class-info-item">
                            <span className="info-label">Giảng viên</span>
                            <span className="info-value">
                                {studentClass.advisor?.full_name || studentClass.teacher?.full_name || 'Chưa phân công'}
                            </span>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-button ${activeTab === 'sample' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sample')}
                >
                    <BookOpen size={18} />
                    Chọn đề tài mẫu
                </button>
                <button
                    className={`tab-button ${activeTab === 'propose' ? 'active' : ''}`}
                    onClick={() => setActiveTab('propose')}
                >
                    <Sparkles size={18} />
                    Tự đề xuất
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'sample' ? (
                <div className="sample-topics-section">
                    {topicsLoading ? (
                        <div className="topics-grid">
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </div>
                    ) : sampleTopics.length > 0 ? (
                        <div className="topics-grid">
                            {sampleTopics.map((topic) => (
                                <Card key={topic.id} className="topic-card" hover>
                                    <CardBody>
                                        <div className="topic-card-header">
                                            <h3 className="topic-title">{topic.title}</h3>
                                            <Badge variant="primary">
                                                {topic.current_students}/{topic.max_students} slot
                                            </Badge>
                                        </div>

                                        <p className="topic-description">
                                            {topic.description || 'Không có mô tả'}
                                        </p>

                                        {topic.technologies?.length > 0 && (
                                            <div className="topic-technologies">
                                                <Code size={14} />
                                                <div className="tech-tags">
                                                    {topic.technologies.map((tech, i) => (
                                                        <span key={i} className="tech-tag">{tech}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="topic-teacher">
                                            <User size={14} />
                                            <span>{topic.teacher?.full_name}</span>
                                        </div>

                                        <Button
                                            className="select-topic-btn"
                                            onClick={() => handleSelectTopic(topic)}
                                            disabled={topic.current_students >= topic.max_students}
                                        >
                                            Chọn đề tài này
                                            <ArrowRight size={16} />
                                        </Button>
                                    </CardBody>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={BookOpen}
                            title="Chưa có đề tài mẫu"
                            description="Giảng viên chưa đăng đề tài mẫu cho đợt này. Bạn có thể tự đề xuất đề tài."
                            action={
                                <Button onClick={() => setActiveTab('propose')}>
                                    <Sparkles size={18} />
                                    Tự đề xuất đề tài
                                </Button>
                            }
                        />
                    )}
                </div>
            ) : (
                <Card className="propose-section">
                    <CardHeader>
                        <h3>Đề xuất đề tài mới</h3>
                        <p className="subtitle">Điền thông tin đề tài bạn muốn thực hiện</p>
                    </CardHeader>
                    <CardBody>
                        <form onSubmit={handleSubmitPropose} className="propose-form">
                            <div className="form-group">
                                <label htmlFor="title">Tên đề tài *</label>
                                <Input
                                    id="title"
                                    placeholder="VD: Xây dựng hệ thống quản lý thư viện"
                                    value={proposeForm.title}
                                    onChange={(e) => setProposeForm(prev => ({ ...prev, title: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Mô tả đề tài</label>
                                <Textarea
                                    id="description"
                                    placeholder="Mô tả chi tiết về đề tài, mục tiêu, phạm vi..."
                                    value={proposeForm.description}
                                    onChange={(e) => setProposeForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="technologies">Công nghệ sử dụng</label>
                                <Input
                                    id="technologies"
                                    placeholder="VD: React, Node.js, PostgreSQL (phân cách bằng dấu phẩy)"
                                    value={proposeForm.technologies}
                                    onChange={(e) => setProposeForm(prev => ({ ...prev, technologies: e.target.value }))}
                                />
                                <span className="form-hint">Nhập các công nghệ, phân cách bằng dấu phẩy</span>
                            </div>

                            <div className="form-actions">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => navigate('/student/dashboard')}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    loading={proposeTopic.isPending}
                                    disabled={!proposeForm.title.trim()}
                                >
                                    <FileText size={18} />
                                    Gửi đề xuất
                                </Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleConfirmRegister}
                title="Xác nhận đăng ký đề tài"
                message={
                    <div className="confirm-topic-content">
                        <p>Bạn có chắc muốn đăng ký đề tài:</p>
                        <strong>"{selectedTopic?.title}"</strong>
                        <p className="confirm-warning">
                            Sau khi đăng ký, bạn sẽ không thể thay đổi đề tài trừ khi được giảng viên yêu cầu chỉnh sửa.
                        </p>
                    </div>
                }
                confirmText="Xác nhận đăng ký"
                loading={registerFromSample.isPending}
            />
        </div>
    );
}
