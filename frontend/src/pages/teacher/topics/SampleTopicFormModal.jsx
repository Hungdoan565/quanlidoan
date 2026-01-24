import { useState, useEffect } from 'react';
import { BookOpen, Code, X } from 'lucide-react';
import { useCreateSampleTopic, useUpdateSampleTopic } from '../../../hooks/useSampleTopics';
import { useSessions } from '../../../hooks/useSessions';
import { Modal, Input, Textarea, CustomSelect, Button, Badge } from '../../../components/ui';

export function SampleTopicFormModal({ isOpen, onClose, onSuccess, topic = null }) {
    const isEdit = !!topic;

    // Form state
    const [formData, setFormData] = useState({
        session_id: '',
        title: '',
        description: '',
        technologies: [],
        max_students: 1,
    });
    const [techInput, setTechInput] = useState('');
    const [errors, setErrors] = useState({});

    // Queries
    const { data: sessions = [] } = useSessions();
    const createTopic = useCreateSampleTopic();
    const updateTopic = useUpdateSampleTopic();

    // Populate form when editing
    useEffect(() => {
        if (topic) {
            setFormData({
                session_id: topic.session_id || '',
                title: topic.title || '',
                description: topic.description || '',
                technologies: topic.technologies || [],
                max_students: topic.max_students || 1,
            });
        } else {
            setFormData({
                session_id: '',
                title: '',
                description: '',
                technologies: [],
                max_students: 1,
            });
        }
        setErrors({});
    }, [topic, isOpen]);

    // Session options (only open sessions)
    const sessionOptions = [
        { value: '', label: '-- Chọn đợt đồ án --' },
        ...sessions.filter(s => s.status === 'open').map(s => ({
            value: s.id,
            label: s.name,
        })),
    ];

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
            if (!formData.technologies.includes(techInput.trim())) {
                setFormData(prev => ({
                    ...prev,
                    technologies: [...prev.technologies, techInput.trim()],
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

    // Validate form
    const validate = () => {
        const newErrors = {};
        if (!formData.session_id) newErrors.session_id = 'Vui lòng chọn đợt đồ án';
        if (!formData.title.trim()) newErrors.title = 'Vui lòng nhập tên đề tài';
        if (!formData.description.trim()) newErrors.description = 'Vui lòng nhập mô tả';
        if (formData.max_students < 1) newErrors.max_students = 'Số SV tối thiểu là 1';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Chỉnh sửa đề tài mẫu' : 'Thêm đề tài mẫu'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="sample-topic-form">
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
                        leftIcon={<BookOpen size={18} />}
                    />
                    {errors.title && <span className="error-text">{errors.title}</span>}
                </div>

                <div className="form-group">
                    <label>Mô tả <span className="required">*</span></label>
                    <Textarea
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Mô tả chi tiết về đề tài, yêu cầu, mục tiêu..."
                        rows={4}
                        error={errors.description}
                    />
                    {errors.description && <span className="error-text">{errors.description}</span>}
                </div>

                <div className="form-group">
                    <label>Công nghệ yêu cầu</label>
                    <Input
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={addTechnology}
                        placeholder="Nhập và nhấn Enter để thêm (VD: React, Node.js)"
                        leftIcon={<Code size={18} />}
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
                                    >
                                        <X size={12} />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
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
                    />
                    {errors.max_students && <span className="error-text">{errors.max_students}</span>}
                </div>

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
