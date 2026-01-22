import { useState, useEffect } from 'react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { Calendar, Zap, ChevronRight } from 'lucide-react';
import { useCreateSession, useUpdateSession } from '../../../hooks/useSessions';
import { Modal, Button, Input, Select, Badge } from '../../../components/ui';
import './SessionFormModal.css';

const SESSION_TYPE_OPTIONS = [
    { value: 'do_an_co_so', label: 'Đồ án cơ sở' },
    { value: 'do_an_tot_nghiep', label: 'Đồ án tốt nghiệp' },
];

const SEMESTER_OPTIONS = [
    { value: 1, label: 'Học kỳ 1' },
    { value: 2, label: 'Học kỳ 2' },
    { value: 3, label: 'Học kỳ hè' },
];

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Nháp' },
    { value: 'open', label: 'Đang mở' },
    { value: 'closed', label: 'Đã đóng' },
];

// Template presets với các khoảng cách ngày mặc định
const DATE_TEMPLATES = [
    {
        value: 'standard_4_months',
        label: '📅 Đợt chuẩn (4 tháng)',
        offsets: {
            registration_end: 14,      // +14 ngày từ start
            report1_deadline: 45,      // +45 ngày
            report2_deadline: 75,      // +75 ngày
            final_deadline: 100,       // +100 ngày
            defense_start: 110,        // +110 ngày
            defense_end: 120,          // +120 ngày
        }
    },
    {
        value: 'short_2_months',
        label: '⚡ Đợt rút gọn (2 tháng)',
        offsets: {
            registration_end: 7,
            report1_deadline: 21,
            report2_deadline: 35,
            final_deadline: 50,
            defense_start: 55,
            defense_end: 60,
        }
    },
    {
        value: 'extended_6_months',
        label: '📚 Đợt mở rộng (6 tháng)',
        offsets: {
            registration_end: 21,
            report1_deadline: 60,
            report2_deadline: 120,
            final_deadline: 150,
            defense_start: 165,
            defense_end: 180,
        }
    },
    { value: 'custom', label: '🛠️ Tuỳ chỉnh' },
];

// Generate academic year options
const getAcademicYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = -1; i <= 2; i++) {
        const year = currentYear + i;
        options.push({
            value: `${year}-${year + 1}`,
            label: `${year}-${year + 1}`,
        });
    }
    return options;
};

const initialFormState = {
    name: '',
    academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    semester: 1,
    session_type: 'do_an_tot_nghiep',
    status: 'draft',
    registration_start: '',
    registration_end: '',
    report1_deadline: '',
    report2_deadline: '',
    final_deadline: '',
    defense_start: '',
    defense_end: '',
};

export function SessionFormModal({ isOpen, onClose, session, onSuccess }) {
    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});
    const [selectedTemplate, setSelectedTemplate] = useState('custom');

    const createSession = useCreateSession();
    const updateSession = useUpdateSession();

    const isEditing = !!session;
    const isLoading = createSession.isPending || updateSession.isPending;

    // Populate form when editing
    useEffect(() => {
        if (session) {
            setFormData({
                name: session.name || '',
                academic_year: session.academic_year || initialFormState.academic_year,
                semester: session.semester || 1,
                session_type: session.session_type || 'do_an_tot_nghiep',
                status: session.status || 'draft',
                registration_start: formatDateForInput(session.registration_start),
                registration_end: formatDateForInput(session.registration_end),
                report1_deadline: formatDateForInput(session.report1_deadline),
                report2_deadline: formatDateForInput(session.report2_deadline),
                final_deadline: formatDateForInput(session.final_deadline),
                defense_start: formatDateForInput(session.defense_start),
                defense_end: formatDateForInput(session.defense_end),
            });
            setSelectedTemplate('custom');
        } else {
            setFormData(initialFormState);
            setSelectedTemplate('standard_4_months');
        }
        setErrors({});
    }, [session, isOpen]);

    // Handle input change
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
        // Auto switch to custom when manually editing dates
        if (field.includes('registration') || field.includes('report') || field.includes('deadline') || field.includes('defense')) {
            setSelectedTemplate('custom');
        }
    };

    // Apply template when registration_start changes or template selected
    const applyTemplate = (startDate, templateValue) => {
        const template = DATE_TEMPLATES.find(t => t.value === templateValue);
        if (!template || templateValue === 'custom' || !startDate) return;

        const start = new Date(startDate);
        if (isNaN(start.getTime())) return;

        setFormData(prev => ({
            ...prev,
            registration_end: formatDateForInput(addDays(start, template.offsets.registration_end)),
            report1_deadline: formatDateForInput(addDays(start, template.offsets.report1_deadline)),
            report2_deadline: formatDateForInput(addDays(start, template.offsets.report2_deadline)),
            final_deadline: formatDateForInput(addDays(start, template.offsets.final_deadline)),
            defense_start: formatDateForInput(addDays(start, template.offsets.defense_start)),
            defense_end: formatDateForInput(addDays(start, template.offsets.defense_end)),
        }));
    };

    // Handle template change
    const handleTemplateChange = (templateValue) => {
        setSelectedTemplate(templateValue);
        if (formData.registration_start) {
            applyTemplate(formData.registration_start, templateValue);
        }
    };

    // Handle registration start change - auto apply template
    const handleRegistrationStartChange = (value) => {
        setFormData(prev => ({ ...prev, registration_start: value }));
        if (selectedTemplate !== 'custom') {
            applyTemplate(value, selectedTemplate);
        }
    };

    // Quick add buttons for individual fields
    const addToDate = (field, days) => {
        const currentValue = formData[field];
        if (!currentValue) {
            // If empty, use registration_start as base
            if (formData.registration_start) {
                const newDate = addDays(new Date(formData.registration_start), days);
                handleChange(field, formatDateForInput(newDate));
            }
            return;
        }
        const newDate = addDays(new Date(currentValue), days);
        handleChange(field, formatDateForInput(newDate));
    };

    // Validate form
    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Vui lòng nhập tên đợt đồ án';
        }
        if (!formData.academic_year) {
            newErrors.academic_year = 'Vui lòng chọn năm học';
        }
        if (!formData.registration_start) {
            newErrors.registration_start = 'Vui lòng chọn ngày bắt đầu đăng ký';
        }
        if (!formData.registration_end) {
            newErrors.registration_end = 'Vui lòng chọn ngày kết thúc đăng ký';
        }
        if (formData.registration_start && formData.registration_end) {
            if (new Date(formData.registration_start) >= new Date(formData.registration_end)) {
                newErrors.registration_end = 'Ngày kết thúc phải sau ngày bắt đầu';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        const submitData = {
            ...formData,
            semester: parseInt(formData.semester),
            registration_start: formData.registration_start ? new Date(formData.registration_start).toISOString() : null,
            registration_end: formData.registration_end ? new Date(formData.registration_end).toISOString() : null,
            report1_deadline: formData.report1_deadline ? new Date(formData.report1_deadline).toISOString() : null,
            report2_deadline: formData.report2_deadline ? new Date(formData.report2_deadline).toISOString() : null,
            final_deadline: formData.final_deadline ? new Date(formData.final_deadline).toISOString() : null,
            defense_start: formData.defense_start ? new Date(formData.defense_start).toISOString() : null,
            defense_end: formData.defense_end ? new Date(formData.defense_end).toISOString() : null,
        };

        try {
            if (isEditing) {
                await updateSession.mutateAsync({ id: session.id, data: submitData });
            } else {
                await createSession.mutateAsync(submitData);
            }
            onSuccess?.();
        } catch (error) {
            // Error is handled by the hook
        }
    };

    // Calculate days between dates helper
    const getDaysBetween = (startField, endField) => {
        if (!formData[startField] || !formData[endField]) return null;
        const start = new Date(formData[startField]);
        const end = new Date(formData[endField]);
        const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
        return diff;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Chỉnh sửa đợt đồ án' : 'Tạo đợt đồ án mới'}
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} loading={isLoading}>
                        {isEditing ? 'Cập nhật' : 'Tạo đợt đồ án'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="session-form">
                {/* Basic Info Section */}
                <div className="form-section">
                    <h3 className="form-section-title">Thông tin cơ bản</h3>

                    <Input
                        label="Tên đợt đồ án"
                        required
                        placeholder="VD: Đồ án tốt nghiệp K11 - HK1"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        error={errors.name}
                    />

                    <div className="form-row">
                        <Select
                            label="Năm học"
                            required
                            options={getAcademicYearOptions()}
                            value={formData.academic_year}
                            onChange={(e) => handleChange('academic_year', e.target.value)}
                            error={errors.academic_year}
                        />
                        <Select
                            label="Học kỳ"
                            required
                            options={SEMESTER_OPTIONS}
                            value={formData.semester}
                            onChange={(e) => handleChange('semester', e.target.value)}
                        />
                    </div>

                    <div className="form-row">
                        <Select
                            label="Loại đồ án"
                            required
                            options={SESSION_TYPE_OPTIONS}
                            value={formData.session_type}
                            onChange={(e) => handleChange('session_type', e.target.value)}
                        />
                        <Select
                            label="Trạng thái"
                            options={STATUS_OPTIONS}
                            value={formData.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                        />
                    </div>
                </div>

                {/* Deadlines Section */}
                <div className="form-section">
                    <div className="form-section-header">
                        <h3 className="form-section-title">Các mốc thời gian</h3>
                        <Select
                            options={DATE_TEMPLATES}
                            value={selectedTemplate}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className="template-select"
                        />
                    </div>

                    {selectedTemplate !== 'custom' && (
                        <div className="template-hint">
                            <Zap size={14} />
                            <span>Chọn ngày bắt đầu, các mốc còn lại sẽ tự động điền theo template</span>
                        </div>
                    )}

                    {/* Registration dates */}
                    <div className="date-group">
                        <div className="date-group-label">📋 Đăng ký đề tài</div>
                        <div className="form-row date-row">
                            <DateInputWithButtons
                                label="Bắt đầu"
                                required
                                value={formData.registration_start}
                                onChange={handleRegistrationStartChange}
                                error={errors.registration_start}
                            />
                            <span className="date-arrow">
                                <ChevronRight size={16} />
                                {getDaysBetween('registration_start', 'registration_end') !== null && (
                                    <Badge variant="secondary" size="sm">
                                        {getDaysBetween('registration_start', 'registration_end')} ngày
                                    </Badge>
                                )}
                            </span>
                            <DateInputWithButtons
                                label="Kết thúc"
                                required
                                value={formData.registration_end}
                                onChange={(v) => handleChange('registration_end', v)}
                                onQuickAdd={(days) => addToDate('registration_end', days)}
                                error={errors.registration_end}
                            />
                        </div>
                    </div>

                    {/* Report deadlines */}
                    <div className="date-group">
                        <div className="date-group-label">📄 Báo cáo tiến độ</div>
                        <div className="form-row date-row">
                            <DateInputWithButtons
                                label="BC tiến độ 1"
                                value={formData.report1_deadline}
                                onChange={(v) => handleChange('report1_deadline', v)}
                                onQuickAdd={(days) => addToDate('report1_deadline', days)}
                            />
                            <span className="date-arrow">
                                <ChevronRight size={16} />
                            </span>
                            <DateInputWithButtons
                                label="BC tiến độ 2"
                                value={formData.report2_deadline}
                                onChange={(v) => handleChange('report2_deadline', v)}
                                onQuickAdd={(days) => addToDate('report2_deadline', days)}
                            />
                        </div>
                    </div>

                    {/* Final & Defense */}
                    <div className="date-group">
                        <div className="date-group-label">🎓 Nộp BC cuối & Bảo vệ</div>
                        <div className="form-row date-row">
                            <DateInputWithButtons
                                label="Nộp BC cuối"
                                value={formData.final_deadline}
                                onChange={(v) => handleChange('final_deadline', v)}
                                onQuickAdd={(days) => addToDate('final_deadline', days)}
                            />
                            <span className="date-arrow">
                                <ChevronRight size={16} />
                            </span>
                            <DateInputWithButtons
                                label="Bảo vệ"
                                value={formData.defense_start}
                                onChange={(v) => handleChange('defense_start', v)}
                                onQuickAdd={(days) => addToDate('defense_start', days)}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

// Custom date input with quick add buttons
function DateInputWithButtons({ label, value, onChange, onQuickAdd, error, required }) {
    return (
        <div className="date-input-wrapper">
            <Input
                label={label}
                required={required}
                type="datetime-local"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={error}
            />
            {onQuickAdd && (
                <div className="quick-buttons">
                    <button type="button" onClick={() => onQuickAdd(7)} title="+1 tuần">+1w</button>
                    <button type="button" onClick={() => onQuickAdd(14)} title="+2 tuần">+2w</button>
                    <button type="button" onClick={() => onQuickAdd(30)} title="+1 tháng">+1m</button>
                </div>
            )}
        </div>
    );
}

// Helper function
function formatDateForInput(dateString) {
    if (!dateString) return '';
    try {
        return format(new Date(dateString), "yyyy-MM-dd'T'HH:mm");
    } catch {
        return '';
    }
}
