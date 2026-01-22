/**
 * CriteriaFormModal - Form to create/edit grading criteria
 */

import { useState, useEffect } from 'react';
import { useCreateCriteria, useUpdateCriteria, useCopyCriteria } from '../../../hooks/useGrading';
import {
    Modal,
    Button,
    Input,
    Select
} from '../../../components/ui';
import { GRADER_TYPES, GRADER_TYPE_LABELS } from '../../../lib/constants';
import './GradingConfigPage.css';

export function CriteriaFormModal({ open, onClose, criteria, sessionId }) {
    const isEdit = !!criteria;

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        weight: '',
        max_score: '10',
        grader_type: 'advisor',
    });
    const [errors, setErrors] = useState({});

    // Mutations
    const createMutation = useCreateCriteria();
    const updateMutation = useUpdateCriteria();

    // Initialize form with criteria data when editing
    useEffect(() => {
        if (criteria) {
            setFormData({
                name: criteria.name || '',
                weight: criteria.weight ? (criteria.weight * 100).toString() : '',
                max_score: criteria.max_score?.toString() || '10',
                grader_type: criteria.grader_type || 'advisor',
            });
        } else {
            setFormData({
                name: '',
                weight: '',
                max_score: '10',
                grader_type: 'advisor',
            });
        }
        setErrors({});
    }, [criteria, open]);

    // Handle input change
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    // Validate form
    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Vui lòng nhập tên tiêu chí';
        }

        const weight = parseFloat(formData.weight);
        if (!formData.weight || isNaN(weight)) {
            newErrors.weight = 'Vui lòng nhập trọng số';
        } else if (weight <= 0 || weight > 100) {
            newErrors.weight = 'Trọng số phải từ 1-100%';
        }

        const maxScore = parseFloat(formData.max_score);
        if (!formData.max_score || isNaN(maxScore)) {
            newErrors.max_score = 'Vui lòng nhập điểm tối đa';
        } else if (maxScore <= 0) {
            newErrors.max_score = 'Điểm tối đa phải > 0';
        }

        if (!sessionId && !isEdit) {
            newErrors.session = 'Vui lòng chọn đợt đồ án trước';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            if (isEdit) {
                // Update uses sessionId, graderType, index
                await updateMutation.mutateAsync({
                    sessionId: criteria.session_id || sessionId,
                    graderType: criteria.grader_type,
                    index: criteria.criterionIndex,
                    data: {
                        name: formData.name.trim(),
                        weight: parseFloat(formData.weight) / 100,
                        max_score: parseFloat(formData.max_score),
                    },
                });
            } else {
                // Create uses sessionId, graderType + criterion data
                await createMutation.mutateAsync({
                    sessionId: sessionId,
                    graderType: formData.grader_type,
                    name: formData.name.trim(),
                    weight: parseFloat(formData.weight) / 100,
                    max_score: parseFloat(formData.max_score),
                });
            }
            onClose();
        } catch (error) {
            // Error is handled by mutation
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title={isEdit ? 'Sửa tiêu chí' : 'Thêm tiêu chí mới'}
            size="md"
        >
            <form onSubmit={handleSubmit} className="criteria-form">
                <div className="form-group">
                    <label htmlFor="name">Tên tiêu chí *</label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="VD: Nội dung báo cáo"
                        error={errors.name}
                    />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="weight">Trọng số (%) *</label>
                        <Input
                            id="weight"
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={formData.weight}
                            onChange={(e) => handleChange('weight', e.target.value)}
                            placeholder="30"
                            error={errors.weight}
                        />
                        {errors.weight && <span className="form-error">{errors.weight}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="max_score">Điểm tối đa *</label>
                        <Input
                            id="max_score"
                            type="number"
                            min="1"
                            step="1"
                            value={formData.max_score}
                            onChange={(e) => handleChange('max_score', e.target.value)}
                            placeholder="10"
                            error={errors.max_score}
                        />
                        {errors.max_score && <span className="form-error">{errors.max_score}</span>}
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="grader_type">Người chấm *</label>
                    <Select
                        id="grader_type"
                        value={formData.grader_type}
                        onChange={(e) => handleChange('grader_type', e.target.value)}
                    >
                        {Object.entries(GRADER_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </div>

                {errors.session && (
                    <div className="form-error-global">{errors.session}</div>
                )}

                <div className="form-actions">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" loading={isLoading}>
                        {isEdit ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

/**
 * CopyCriteriaModal - Modal to copy criteria from another session
 */
export function CopyCriteriaModal({ open, onClose, targetSessionId, sessions }) {
    const [sourceSessionId, setSourceSessionId] = useState('');
    const copyMutation = useCopyCriteria();

    // Reset on close
    useEffect(() => {
        if (!open) {
            setSourceSessionId('');
        }
    }, [open]);

    const handleCopy = async () => {
        if (!sourceSessionId || !targetSessionId) return;

        await copyMutation.mutateAsync({
            fromSessionId: sourceSessionId,
            toSessionId: targetSessionId,
        });
        onClose();
    };

    // Filter out current session from options
    const availableSessions = sessions.filter(s => s.id !== targetSessionId);

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title="Copy tiêu chí từ đợt khác"
            size="sm"
        >
            <div className="copy-criteria-form">
                <p className="copy-description">
                    Chọn đợt đồ án nguồn để copy tất cả tiêu chí sang đợt hiện tại.
                </p>

                <div className="form-group">
                    <label>Đợt nguồn</label>
                    <Select
                        value={sourceSessionId}
                        onChange={(e) => setSourceSessionId(e.target.value)}
                    >
                        <option value="">-- Chọn đợt --</option>
                        {availableSessions.map(session => (
                            <option key={session.id} value={session.id}>
                                {session.name} ({session.academic_year})
                            </option>
                        ))}
                    </Select>
                </div>

                {!targetSessionId && (
                    <p className="warning-text">
                        Vui lòng chọn đợt đích trước khi copy.
                    </p>
                )}

                <div className="form-actions">
                    <Button variant="outline" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleCopy}
                        loading={copyMutation.isPending}
                        disabled={!sourceSessionId || !targetSessionId}
                    >
                        Copy tiêu chí
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
