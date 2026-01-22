import { useState, useEffect } from 'react';
import { useCreateClass, useUpdateClass } from '../../../hooks/useClasses';
import { Modal, Input, Select, Button } from '../../../components/ui';

export function ClassFormModal({ isOpen, onClose, cls, sessions = [], onSuccess }) {
    const [formData, setFormData] = useState({
        session_id: '',
        code: '',
        name: '',
        max_students: 30,
    });
    const [errors, setErrors] = useState({});

    const createClass = useCreateClass();
    const updateClass = useUpdateClass();

    const isEditing = !!cls;
    const isLoading = createClass.isPending || updateClass.isPending;

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (cls) {
                setFormData({
                    session_id: cls.session_id || '',
                    code: cls.code || '',
                    name: cls.name || '',
                    max_students: cls.max_students || 30,
                });
            } else {
                setFormData({
                    session_id: sessions[0]?.id || '',
                    code: '',
                    name: '',
                    max_students: 30,
                });
            }
            setErrors({});
        }
    }, [isOpen, cls, sessions]);

    // Session options
    const sessionOptions = sessions.map(s => ({
        value: s.id,
        label: `${s.name} (${s.academic_year})`,
    }));

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Validation
    const validate = () => {
        const newErrors = {};

        if (!formData.session_id) {
            newErrors.session_id = 'Vui lòng chọn đợt đồ án';
        }
        if (!formData.code.trim()) {
            newErrors.code = 'Vui lòng nhập mã lớp';
        } else if (!/^[A-Z0-9_]+$/i.test(formData.code)) {
            newErrors.code = 'Mã lớp chỉ được chứa chữ, số và dấu gạch dưới';
        }
        if (!formData.name.trim()) {
            newErrors.name = 'Vui lòng nhập tên lớp';
        }
        if (!formData.max_students || formData.max_students < 1) {
            newErrors.max_students = 'Sĩ số tối thiểu là 1';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            if (isEditing) {
                await updateClass.mutateAsync({
                    id: cls.id,
                    data: formData
                });
            } else {
                await createClass.mutateAsync(formData);
            }
            onSuccess?.();
        } catch (error) {
            if (error.code === '23505') {
                setErrors({ code: 'Mã lớp đã tồn tại trong đợt này' });
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Chỉnh sửa lớp học' : 'Tạo lớp học mới'}
            size="md"
        >
            <form onSubmit={handleSubmit} className="class-form">
                <div className="form-group">
                    <label htmlFor="session_id">
                        Đợt đồ án <span className="required">*</span>
                    </label>
                    <Select
                        id="session_id"
                        name="session_id"
                        options={sessionOptions}
                        value={formData.session_id}
                        onChange={handleChange}
                        error={errors.session_id}
                        disabled={isEditing}
                    />
                    {errors.session_id && (
                        <span className="error-text">{errors.session_id}</span>
                    )}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="code">
                            Mã lớp <span className="required">*</span>
                        </label>
                        <Input
                            id="code"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="VD: DATN_K11_01"
                            error={errors.code}
                        />
                        {errors.code && (
                            <span className="error-text">{errors.code}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="max_students">
                            Sĩ số tối đa <span className="required">*</span>
                        </label>
                        <Input
                            id="max_students"
                            name="max_students"
                            type="number"
                            min="1"
                            max="100"
                            value={formData.max_students}
                            onChange={handleChange}
                            error={errors.max_students}
                        />
                        {errors.max_students && (
                            <span className="error-text">{errors.max_students}</span>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="name">
                        Tên lớp <span className="required">*</span>
                    </label>
                    <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="VD: Đồ án Tốt nghiệp K11 - Nhóm 1"
                        error={errors.name}
                    />
                    {errors.name && (
                        <span className="error-text">{errors.name}</span>
                    )}
                </div>

                <div className="form-actions">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" loading={isLoading}>
                        {isEditing ? 'Cập nhật' : 'Tạo lớp'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
