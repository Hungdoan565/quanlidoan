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
    User,
    X,
    Check
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

const TECH_STACKS = {
    'Frontend': ['React', 'Vue.js', 'Angular', 'Next.js', 'HTML/CSS', 'Tailwind CSS', 'Bootstrap'],
    'Backend': ['Node.js', 'Express.js', 'NestJS', 'Django', 'Flask', 'Spring Boot', 'Laravel', 'ASP.NET'],
    'Database': ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Firebase'],
    'Mobile': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Ionic'],
    'DevOps': ['Docker', 'Kubernetes', 'AWS', 'Azure', 'Vercel', 'Netlify'],
    'Other': ['GraphQL', 'REST API', 'WebSocket', 'JWT', 'OAuth', 'AI/ML', 'Blockchain']
};

export function TopicRegisterPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('sample'); // 'sample' | 'propose'
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

    // Form state for proposing new topic
    const [proposeForm, setProposeForm] = useState({
        title: '',
        description: '',
        technologies: [], // Changed to array
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

        await proposeTopic.mutateAsync({
            classId: studentClass.id,
            title: proposeForm.title,
            description: proposeForm.description,
            technologies: proposeForm.technologies,
        });

        navigate('/student/topic');
    };

    const toggleTech = (tech) => {
        setProposeForm(prev => {
            const exists = prev.technologies.includes(tech);
            if (exists) {
                return { ...prev, technologies: prev.technologies.filter(t => t !== tech) };
            } else {
                return { ...prev, technologies: [...prev.technologies, tech] };
            }
        });
    };

    const removeTech = (tech) => {
        setProposeForm(prev => ({
            ...prev,
            technologies: prev.technologies.filter(t => t !== tech)
        }));
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
                            <div className="info-value-wrapper">
                                <Users size={18} className="text-primary-600" />
                                <span className="info-value">{studentClass.name}</span>
                            </div>
                        </div>
                        <div className="class-info-item center-border">
                            <span className="info-label">Đợt</span>
                            <div className="info-value-wrapper">
                                <Clock size={18} className="text-primary-600" />
                                <span className="info-value">{studentClass.session?.name}</span>
                            </div>
                        </div>
                        <div className="class-info-item">
                            <span className="info-label">Giảng viên hướng dẫn</span>
                            <div className="info-value-wrapper">
                                <User size={18} className="text-primary-600" />
                                <span className="info-value">
                                    {studentClass.advisor?.full_name || studentClass.teacher?.full_name || 'Chưa phân công'}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <div 
                    className={`tab-card ${activeTab === 'sample' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sample')}
                >
                    <div className="tab-icon-wrapper">
                        <BookOpen size={24} />
                    </div>
                    <div className="tab-content">
                        <h3>Chọn đề tài mẫu</h3>
                        <p>Đăng ký đề tài do giảng viên cung cấp</p>
                    </div>
                    {activeTab === 'sample' && <div className="active-indicator" />}
                </div>
                
                <div 
                    className={`tab-card ${activeTab === 'propose' ? 'active' : ''}`}
                    onClick={() => setActiveTab('propose')}
                >
                    <div className="tab-icon-wrapper">
                        <Sparkles size={24} />
                    </div>
                    <div className="tab-content">
                        <h3>Tự đề xuất</h3>
                        <p>Trình bày ý tưởng đề tài của riêng bạn</p>
                    </div>
                    {activeTab === 'propose' && <div className="active-indicator" />}
                </div>
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
                                            <Badge variant={topic.current_students >= topic.max_students ? "outline" : "primary"}>
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
                                            variant={topic.current_students >= topic.max_students ? "secondary" : "primary"}
                                        >
                                            {topic.current_students >= topic.max_students ? 'Đã đủ số lượng' : 'Chọn đề tài này'}
                                            {topic.current_students < topic.max_students && <ArrowRight size={16} />}
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
                        <h3>Thông tin đề tài</h3>
                        <p className="subtitle">Điền đầy đủ thông tin bên dưới để gửi yêu cầu phê duyệt</p>
                    </CardHeader>
                    <CardBody>
                        <form onSubmit={handleSubmitPropose} className="propose-form">
                            <div className="form-group">
                                <label htmlFor="title">Tên đề tài <span className="text-red-500">*</span></label>
                                <Input
                                    id="title"
                                    placeholder="VD: Xây dựng hệ thống quản lý thư viện trực tuyến"
                                    value={proposeForm.title}
                                    onChange={(e) => setProposeForm(prev => ({ ...prev, title: e.target.value }))}
                                    required
                                    className="clean-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Mô tả chi tiết</label>
                                <Textarea
                                    id="description"
                                    placeholder="Mô tả mục tiêu, phạm vi và các chức năng chính của đề tài..."
                                    value={proposeForm.description}
                                    onChange={(e) => setProposeForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={5}
                                    className="clean-textarea"
                                />
                            </div>

                            <div className="form-group tech-selection-group">
                                <label>Công nghệ sử dụng <span className="text-red-500">*</span></label>
                                
                                {/* Selected techs summary */}
                                {proposeForm.technologies.length > 0 && (
                                    <div className="selected-techs-summary">
                                        <span className="selected-count">
                                            Đã chọn {proposeForm.technologies.length} công nghệ:
                                        </span>
                                        <div className="selected-techs-list">
                                            {proposeForm.technologies.map(tech => (
                                                <span key={tech} className="selected-tech-chip" onClick={() => removeTech(tech)}>
                                                    {tech}
                                                    <X size={12} />
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Inline tech chips by category */}
                                <div className="tech-chips-container">
                                    {Object.entries(TECH_STACKS).map(([category, techs]) => (
                                        <div key={category} className="tech-category">
                                            <div className="category-label">{category}</div>
                                            <div className="category-chips">
                                                {techs.map(tech => (
                                                    <button
                                                        key={tech}
                                                        type="button"
                                                        className={`tech-chip ${proposeForm.technologies.includes(tech) ? 'selected' : ''}`}
                                                        onClick={() => toggleTech(tech)}
                                                    >
                                                        {proposeForm.technologies.includes(tech) && <Check size={12} />}
                                                        {tech}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <span className="form-hint">Click để chọn/bỏ chọn. Chọn ít nhất 1 công nghệ.</span>
                            </div>

                            <div className="form-actions">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => navigate('/student/dashboard')}
                                >
                                    Hủy bỏ
                                </Button>
                                <Button
                                    type="submit"
                                    loading={proposeTopic.isPending}
                                    disabled={!proposeForm.title.trim() || proposeForm.technologies.length === 0}
                                    className="submit-btn"
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

