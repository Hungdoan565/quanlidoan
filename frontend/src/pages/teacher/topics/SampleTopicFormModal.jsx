import { useState, useEffect } from 'react';
import { BookOpen, Code, X, Plus, List, Eye, FileText, AlertTriangle, Zap } from 'lucide-react';
import { useCreateSampleTopic, useUpdateSampleTopic } from '../../../hooks/useSampleTopics';
import { useSessions } from '../../../hooks/useSessions';
import { 
    Modal, 
    Input, 
    Textarea, 
    CustomSelect, 
    Button, 
    Badge,
    DifficultySelector,
    Card,
    CardBody
} from '../../../components/ui';
import './SampleTopicFormModal.css';

// Difficulty badge config for preview
const DIFFICULTY_CONFIG = {
    easy: { label: 'Dễ', variant: 'success' },
    medium: { label: 'Trung bình', variant: 'warning' },
    hard: { label: 'Khó', variant: 'danger' },
};

export function SampleTopicFormModal({ isOpen, onClose, onSuccess, topic = null }) {
    const isEdit = !!topic;

    // Tab state: 'form' | 'preview'
    const [activeTab, setActiveTab] = useState('form');

    // Form state
    const [formData, setFormData] = useState({
        session_id: '',
        title: '',
        description: '',
        requirements: [],
        technologies: [],
        difficulty: null,
        max_students: 1,
        notes: '',
    });
    const [techInput, setTechInput] = useState('');
    const [requirementInput, setRequirementInput] = useState('');
    const [errors, setErrors] = useState({});

    // Queries
    const { data: sessions = [] } = useSessions();
    const createTopic = useCreateSampleTopic();
    const updateTopic = useUpdateSampleTopic();

    // Reset form when modal opens/closes or topic changes
    useEffect(() => {
        if (isOpen) {
            if (topic) {
                setFormData({
                    session_id: topic.session_id || '',
                    title: topic.title || '',
                    description: topic.description || '',
                    requirements: topic.requirements || [],
                    technologies: topic.technologies || [],
                    difficulty: topic.difficulty || null,
                    max_students: topic.max_students || 1,
                    notes: topic.notes || '',
                });
            } else {
                setFormData({
                    session_id: '',
                    title: '',
                    description: '',
                    requirements: [],
                    technologies: [],
                    difficulty: null,
                    max_students: 1,
                    notes: '',
                });
            }
            setErrors({});
            setTechInput('');
            setRequirementInput('');
            setActiveTab('form');
        }
    }, [topic, isOpen]);

    // Session options (only open sessions)
    const sessionOptions = [
        { value: '', label: '-- Chọn đợt đồ án --' },
        ...sessions.filter(s => s.status === 'open').map(s => ({
            value: s.id,
            label: s.name,
        })),
    ];

    // Get selected session name for preview
    const selectedSession = sessions.find(s => s.id === formData.session_id);

    // Handle input change
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    // Add technology tag
    const addTechnology = (e) => {
        if (e.key === 'Enter' && techInput.trim()) {
            e.preventDefault();
            const tech = techInput.trim();
            if (!formData.technologies.includes(tech)) {
                setFormData(prev => ({
                    ...prev,
                    technologies: [...prev.technologies, tech],
                }));
            }
            setTechInput('');
        }
    };

    // Remove technology tag
    const removeTechnology = (tech) => {
        setFormData(prev => ({
            ...prev,
            technologies: prev.technologies.filter(t => t !== tech),
        }));
    };

    // Add requirement
    const addRequirement = () => {
        if (requirementInput.trim()) {
            const req = requirementInput.trim();
            if (!formData.requirements.includes(req)) {
                setFormData(prev => ({
                    ...prev,
                    requirements: [...prev.requirements, req],
                }));
            }
            setRequirementInput('');
        }
    };

    // Handle Enter key for requirement input
    const handleRequirementKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addRequirement();
        }
    };

    // Remove requirement
    const removeRequirement = (index) => {
        setFormData(prev => ({
            ...prev,
            requirements: prev.requirements.filter((_, i) => i !== index),
        }));
    };

    // Validate form
    const validate = () => {
        const newErrors = {};
        if (!formData.session_id) newErrors.session_id = 'Vui lòng chọn đợt đồ án';
        if (!formData.title.trim()) newErrors.title = 'Vui lòng nhập tên đề tài';
        if (!formData.description.trim()) newErrors.description = 'Vui lòng nhập mô tả';
        if (formData.max_students < 1) newErrors.max_students = 'Số SV tối thiểu là 1';
        if (formData.max_students > 5) newErrors.max_students = 'Số SV tối đa là 5';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            setActiveTab('form'); // Switch to form tab if validation fails
            return;
        }

        try {
            if (isEdit) {
                await updateTopic.mutateAsync({ id: topic.id, data: formData });
            } else {
                await createTopic.mutateAsync(formData);
            }
            onSuccess?.();
        } catch (error) {
            // Error handled by mutation
        }
    };

    const isSubmitting = createTopic.isPending || updateTopic.isPending;

    // Render form content
    const renderFormContent = () => (
        <div className="form-content">
            {/* Section: Thông tin cơ bản */}
            <div className="form-section">
                <h4 className="form-section-title">
                    <FileText size={16} aria-hidden="true" />
                    Thông tin cơ bản
                </h4>

                <div className="form-group">
                    <label>Đợt đồ án <span className="required">*</span></label>
                    <CustomSelect
                        options={sessionOptions}
                        value={formData.session_id}
                        onChange={(e) => handleChange('session_id', e.target.value)}
                        error={errors.session_id}
                    />
                    {errors.session_id && <span className="error-text">{errors.session_id}</span>}
                </div>

                <div className="form-group">
                    <label>Tên đề tài <span className="required">*</span></label>
                    <Input
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="VD: Xây dựng hệ thống quản lý bán hàng"
                        error={errors.title}
                        leftIcon={<BookOpen size={18} aria-hidden="true" />}
                    />
                    {errors.title && <span className="error-text">{errors.title}</span>}
                </div>

                <div className="form-group">
                    <label>Mô tả chi tiết <span className="required">*</span></label>
                    <Textarea
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Mô tả về mục đích, phạm vi, và các yêu cầu chính của đề tài..."
                        rows={4}
                        error={errors.description}
                    />
                    {errors.description && <span className="error-text">{errors.description}</span>}
                </div>
            </div>

            {/* Section: Yêu cầu đề tài */}
            <div className="form-section">
                <h4 className="form-section-title">
                    <List size={16} aria-hidden="true" />
                    Yêu cầu đề tài
                </h4>

                <div className="form-group">
                    <label>Yêu cầu chức năng</label>
                    <div className="requirement-input-row">
                        <Input
                            value={requirementInput}
                            onChange={(e) => setRequirementInput(e.target.value)}
                            onKeyDown={handleRequirementKeyDown}
                            placeholder="VD: Quản lý sản phẩm (CRUD)"
                        />
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={addRequirement}
                            aria-label="Thêm yêu cầu"
                        >
                            <Plus size={16} aria-hidden="true" />
                        </Button>
                    </div>
                    {formData.requirements.length > 0 && (
                        <ul className="requirements-list">
                            {formData.requirements.map((req, i) => (
                                <li key={i} className="requirement-item">
                                    <span className="requirement-bullet">{i + 1}</span>
                                    <span className="requirement-text">{req}</span>
                                    <button
                                        type="button"
                                        className="requirement-remove"
                                        onClick={() => removeRequirement(i)}
                                        aria-label={`Xóa yêu cầu: ${req}`}
                                    >
                                        <X size={14} aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="form-hint">Nhập và nhấn Enter hoặc nút + để thêm</p>
                </div>

                <div className="form-group">
                    <label>Công nghệ yêu cầu</label>
                    <Input
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={addTechnology}
                        placeholder="Nhập và nhấn Enter để thêm (VD: React, Node.js)…"
                        leftIcon={<Code size={18} aria-hidden="true" />}
                    />
                    {formData.technologies.length > 0 && (
                        <div className="tech-tags">
                            {formData.technologies.map((tech, i) => (
                                <Badge key={i} variant="secondary">
                                    {tech}
                                    <button
                                        type="button"
                                        className="remove-tag"
                                        onClick={() => removeTechnology(tech)}
                                        aria-label={`Xóa ${tech}`}
                                    >
                                        <X size={12} aria-hidden="true" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Section: Cấu hình */}
            <div className="form-section">
                <h4 className="form-section-title">
                    <Zap size={16} aria-hidden="true" />
                    Cấu hình
                </h4>

                <div className="form-row">
                    <div className="form-group form-group-flex">
                        <DifficultySelector
                            value={formData.difficulty}
                            onChange={(value) => handleChange('difficulty', value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Số sinh viên tối đa</label>
                        <Input
                            type="number"
                            min={1}
                            max={5}
                            value={formData.max_students}
                            onChange={(e) => handleChange('max_students', parseInt(e.target.value) || 1)}
                            error={errors.max_students}
                            style={{ width: 100 }}
                        />
                        {errors.max_students && <span className="error-text">{errors.max_students}</span>}
                    </div>
                </div>
            </div>

            {/* Section: Ghi chú */}
            <div className="form-section">
                <h4 className="form-section-title">
                    <AlertTriangle size={16} aria-hidden="true" />
                    Ghi chú
                </h4>

                <div className="form-group">
                    <Textarea
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Yêu cầu kiến thức nền, lưu ý cho sinh viên... (tùy chọn)"
                        rows={2}
                    />
                </div>
            </div>
        </div>
    );

    // Render preview content
    const renderPreviewContent = () => (
        <div className="preview-content">
            <Card className="preview-card">
                <CardBody>
                    {/* Header */}
                    <div className="preview-header">
                        <h3 className="preview-title">
                            {formData.title || 'Chưa có tên đề tài'}
                        </h3>
                        <div className="preview-meta">
                            {formData.difficulty && (
                                <Badge variant={DIFFICULTY_CONFIG[formData.difficulty]?.variant || 'default'}>
                                    {DIFFICULTY_CONFIG[formData.difficulty]?.label || formData.difficulty}
                                </Badge>
                            )}
                            <span className="preview-session">
                                {selectedSession?.name || 'Chưa chọn đợt'}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="preview-section">
                        <h4>Mô tả</h4>
                        <p className="preview-description">
                            {formData.description || 'Chưa có mô tả'}
                        </p>
                    </div>

                    {/* Requirements */}
                    {formData.requirements.length > 0 && (
                        <div className="preview-section">
                            <h4>Yêu cầu chức năng</h4>
                            <ul className="preview-requirements">
                                {formData.requirements.map((req, i) => (
                                    <li key={i}>{req}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Technologies */}
                    {formData.technologies.length > 0 && (
                        <div className="preview-section">
                            <h4>Công nghệ yêu cầu</h4>
                            <div className="preview-tech-tags">
                                {formData.technologies.map((tech, i) => (
                                    <Badge key={i} variant="secondary" size="sm">
                                        <Code size={12} aria-hidden="true" />
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {formData.notes && (
                        <div className="preview-section preview-notes">
                            <h4>Ghi chú</h4>
                            <p>{formData.notes}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="preview-footer">
                        <span>Số sinh viên tối đa: <strong>{formData.max_students}</strong></span>
                    </div>
                </CardBody>
            </Card>

            <p className="preview-hint">
                Đây là cách sinh viên sẽ nhìn thấy đề tài của bạn
            </p>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Chỉnh sửa đề tài mẫu' : 'Thêm đề tài mẫu'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="sample-topic-form">
                {/* Tabs */}
                <div className="form-tabs">
                    <button
                        type="button"
                        className={`form-tab ${activeTab === 'form' ? 'form-tab-active' : ''}`}
                        onClick={() => setActiveTab('form')}
                    >
                        <FileText size={16} aria-hidden="true" />
                        Nội dung
                    </button>
                    <button
                        type="button"
                        className={`form-tab ${activeTab === 'preview' ? 'form-tab-active' : ''}`}
                        onClick={() => setActiveTab('preview')}
                    >
                        <Eye size={16} aria-hidden="true" />
                        Xem trước
                    </button>
                </div>

                {/* Tab content */}
                <div className="form-tab-content">
                    {activeTab === 'form' ? renderFormContent() : renderPreviewContent()}
                </div>

                {/* Actions */}
                <div className="modal-actions">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" loading={isSubmitting}>
                        {isEdit ? 'Cập nhật' : 'Tạo đề tài'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
