import { useState, useEffect, useMemo } from 'react';
import { format, addDays, differenceInDays, isValid, parseISO, startOfDay, endOfDay } from 'date-fns';
import { 
    CalendarDays, 
    Zap, 
    ChevronRight, 
    BookOpen, 
    SlidersHorizontal,
    ClipboardList,
    FileText,
    Flag,
    Users
} from 'lucide-react';
import { useCreateSession, useUpdateSession } from '../../../hooks/useSessions';
import { Modal, Button, Input, CustomSelect, Badge } from '../../../components/ui';
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

// Template presets với các khoảng cách ngày mặc định (theo tuần)
const DATE_TEMPLATES = [
    {
        value: 'standard_4_months',
        label: 'Đợt chuẩn (4 tháng)',
        icon: CalendarDays,
        offsets: {
            registration_end: 14,      // 2 weeks
            report1_deadline: 42,      // 6 weeks  
            report2_deadline: 70,      // 10 weeks
            final_deadline: 98,        // 14 weeks
            defense_start: 105,        // 15 weeks
            defense_end: 112,          // 16 weeks
        }
    },
    {
        value: 'short_2_months',
        label: 'Đợt rút gọn (2 tháng)',
        icon: Zap,
        offsets: {
            registration_end: 7,       // 1 week
            report1_deadline: 21,      // 3 weeks
            report2_deadline: 35,      // 5 weeks
            final_deadline: 49,        // 7 weeks
            defense_start: 52,         // 7.5 weeks approx (52 days)
            defense_end: 56,           // 8 weeks
        }
    },
    {
        value: 'extended_6_months',
        label: 'Đợt mở rộng (6 tháng)',
        icon: BookOpen,
        offsets: {
            registration_end: 21,      // 3 weeks
            report1_deadline: 56,      // 8 weeks
            report2_deadline: 98,      // 14 weeks
            final_deadline: 147,       // 21 weeks
            defense_start: 154,        // 22 weeks
            defense_end: 168,          // 24 weeks
        }
    },
    { 
        value: 'custom', 
        label: 'Tuỳ chỉnh',
        icon: SlidersHorizontal,
    },
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
    const [selectedTemplate, setSelectedTemplate] = useState('standard_4_months');

    const createSession = useCreateSession();
    const updateSession = useUpdateSession();

    const isEditing = !!session;
    const isLoading = createSession.isPending || updateSession.isPending;
    const isTemplateMode = selectedTemplate !== 'custom';

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
        
        // If in template mode and changing start date, re-apply template
        if (field === 'registration_start' && isTemplateMode) {
            applyTemplate(value, selectedTemplate);
        }
    };

    // Apply template when registration_start changes or template selected
    const applyTemplate = (startDate, templateValue) => {
        const template = DATE_TEMPLATES.find(t => t.value === templateValue);
        if (!template || templateValue === 'custom' || !startDate) return;

        const start = new Date(startDate);
        if (!isValid(start)) return;

        setFormData(prev => ({
            ...prev,
            registration_start: startDate,
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
        if (templateValue !== 'custom' && formData.registration_start) {
            applyTemplate(formData.registration_start, templateValue);
        }
    };

    // Quick add buttons for individual fields
    const addToDate = (field, days) => {
        const currentValue = formData[field];
        let baseDate;

        if (currentValue) {
            baseDate = new Date(currentValue);
        } else if (formData.registration_start) {
            baseDate = new Date(formData.registration_start);
        }

        if (baseDate && isValid(baseDate)) {
            const newDate = addDays(baseDate, days);
            handleChange(field, formatDateForInput(newDate));
        }
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

        // Sequence validation
        const milestones = [
            { field: 'registration_start', label: 'Bắt đầu đăng ký', date: formData.registration_start },
            { field: 'registration_end', label: 'Kết thúc đăng ký', date: formData.registration_end },
            { field: 'report1_deadline', label: 'BC tiến độ 1', date: formData.report1_deadline },
            { field: 'report2_deadline', label: 'BC tiến độ 2', date: formData.report2_deadline },
            { field: 'final_deadline', label: 'Nộp BC cuối', date: formData.final_deadline },
            { field: 'defense_start', label: 'Bắt đầu bảo vệ', date: formData.defense_start },
            { field: 'defense_end', label: 'Kết thúc bảo vệ', date: formData.defense_end },
        ];

        // Check sequence: each milestone must be after the previous one
        for (let i = 1; i < milestones.length; i++) {
            const current = milestones[i];
            const prev = milestones[i-1];
            
            if (current.date && prev.date) {
                if (new Date(current.date) < new Date(prev.date)) {
                    newErrors[current.field] = `Phải sau ${prev.label}`;
                }
            }
        }
        
        // Required fields validation
        if (!formData.registration_end) {
            newErrors.registration_end = 'Vui lòng chọn ngày kết thúc đăng ký';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        // Helper to convert date string to ISO string with correct time
        // Start dates -> 00:00:00 (Local) -> UTC
        // End/Deadline dates -> 23:59:59 (Local) -> UTC
        const toISO = (dateStr, isEndOfDay = false) => {
            if (!dateStr) return null;
            // Append time to ensure local interpretation
            const date = new Date(`${dateStr}T00:00`);
            if (!isValid(date)) return null;
            
            const adjustedDate = isEndOfDay ? endOfDay(date) : startOfDay(date);
            return adjustedDate.toISOString();
        };

        const submitData = {
            ...formData,
            semester: parseInt(formData.semester),
            registration_start: toISO(formData.registration_start, false),
            registration_end: toISO(formData.registration_end, true),
            report1_deadline: toISO(formData.report1_deadline, true),
            report2_deadline: toISO(formData.report2_deadline, true),
            final_deadline: toISO(formData.final_deadline, true),
            defense_start: toISO(formData.defense_start, false),
            defense_end: toISO(formData.defense_end, true),
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
        if (!isValid(start) || !isValid(end)) return null;
        return differenceInDays(end, start);
    };

    // Prepare template options for CustomSelect
    const templateOptions = useMemo(() => DATE_TEMPLATES.map(t => ({
        value: t.value,
        label: (
            <div className="flex items-center gap-2">
                <t.icon size={16} className="text-muted-foreground" />
                <span>{t.label}</span>
            </div>
        )
    })), []);

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
                        <CustomSelect
                            label="Năm học"
                            required
                            options={getAcademicYearOptions()}
                            value={formData.academic_year}
                            onChange={(e) => handleChange('academic_year', e.target.value)}
                            error={errors.academic_year}
                        />
                        <CustomSelect
                            label="Học kỳ"
                            required
                            options={SEMESTER_OPTIONS}
                            value={formData.semester}
                            onChange={(e) => handleChange('semester', e.target.value)}
                        />
                    </div>

                    <div className="form-row">
                        <CustomSelect
                            label="Loại đồ án"
                            required
                            options={SESSION_TYPE_OPTIONS}
                            value={formData.session_type}
                            onChange={(e) => handleChange('session_type', e.target.value)}
                        />
                        <CustomSelect
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
                        <CustomSelect
                            options={templateOptions}
                            value={selectedTemplate}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className="template-select"
                        />
                    </div>

                    {isTemplateMode && (
                        <div className="template-hint">
                            <Zap size={14} aria-hidden="true" />
                            <span>Chọn <b>Ngày bắt đầu đăng ký</b>, các mốc còn lại sẽ tự động tính toán. Chuyển sang "Tuỳ chỉnh" để sửa từng mốc.</span>
                        </div>
                    )}

                    {/* Timeline Preview - Horizontal Steps */}
                    {formData.registration_start && isValid(new Date(formData.registration_start)) && (
                        <div className="schedule-preview">
                            <div className="preview-title">Lịch trình dự kiến</div>
                            <div className="timeline-steps">
                                {[
                                    { field: 'registration_start', label: 'Bắt đầu ĐK', color: 'var(--primary-500)' },
                                    { field: 'registration_end', label: 'Kết thúc ĐK', color: 'var(--primary-400)' },
                                    { field: 'report1_deadline', label: 'BC tiến độ 1', color: 'var(--warning-500)' },
                                    { field: 'report2_deadline', label: 'BC tiến độ 2', color: 'var(--warning-600)' },
                                    { field: 'final_deadline', label: 'Nộp BC cuối', color: 'var(--danger-500)' },
                                    { field: 'defense_start', label: 'Bảo vệ', color: 'var(--success-500)' },
                                    { field: 'defense_end', label: 'Kết thúc', color: 'var(--success-600)' },
                                ].map((step, index, arr) => {
                                    const date = formData[step.field];
                                    if (!date || !isValid(new Date(date))) return null;
                                    
                                    const currentDate = new Date(date);
                                    const isLast = index === arr.length - 1;
                                    
                                    return (
                                        <div key={step.field} className="timeline-step">
                                            <div className="step-content">
                                                <div 
                                                    className="step-dot" 
                                                    style={{ backgroundColor: step.color }}
                                                />
                                                <div className="step-info">
                                                    <span className="step-label">{step.label}</span>
                                                    <span className="step-date">{format(currentDate, 'dd/MM/yyyy')}</span>
                                                </div>
                                            </div>
                                            {!isLast && <div className="step-connector" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Registration dates */}
                    <div className="date-group">
                        <div className="date-group-label">
                            <ClipboardList size={14} />
                            <span>Đăng ký đề tài</span>
                        </div>
                        <div className="form-row date-row">
                            <DateInputWithButtons
                                label="Bắt đầu"
                                required
                                value={formData.registration_start}
                                onChange={(v) => handleChange('registration_start', v)}
                                error={errors.registration_start}
                            />
                            <span className="date-arrow">
                                <ChevronRight size={16} aria-hidden="true" />
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
                                onQuickAdd={!isTemplateMode ? (days) => addToDate('registration_end', days) : undefined}
                                error={errors.registration_end}
                                disabled={isTemplateMode}
                            />
                        </div>
                    </div>

                    {/* Report deadlines */}
                    <div className="date-group">
                        <div className="date-group-label">
                            <FileText size={14} />
                            <span>Báo cáo tiến độ</span>
                        </div>
                        <div className="form-row date-row">
                            <DateInputWithButtons
                                label="BC tiến độ 1"
                                value={formData.report1_deadline}
                                onChange={(v) => handleChange('report1_deadline', v)}
                                onQuickAdd={!isTemplateMode ? (days) => addToDate('report1_deadline', days) : undefined}
                                error={errors.report1_deadline}
                                disabled={isTemplateMode}
                            />
                            <span className="date-arrow">
                                <ChevronRight size={16} aria-hidden="true" />
                            </span>
                            <DateInputWithButtons
                                label="BC tiến độ 2"
                                value={formData.report2_deadline}
                                onChange={(v) => handleChange('report2_deadline', v)}
                                onQuickAdd={!isTemplateMode ? (days) => addToDate('report2_deadline', days) : undefined}
                                error={errors.report2_deadline}
                                disabled={isTemplateMode}
                            />
                        </div>
                    </div>

                    {/* Final & Defense */}
                    <div className="date-group">
                        <div className="date-group-label">
                            <Flag size={14} />
                            <span>Nộp BC cuối</span>
                        </div>
                        <div className="form-row">
                            <DateInputWithButtons
                                label="Hạn nộp báo cáo cuối kỳ"
                                value={formData.final_deadline}
                                onChange={(v) => handleChange('final_deadline', v)}
                                onQuickAdd={!isTemplateMode ? (days) => addToDate('final_deadline', days) : undefined}
                                error={errors.final_deadline}
                                disabled={isTemplateMode}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="date-group">
                        <div className="date-group-label">
                            <Users size={14} />
                            <span>Bảo vệ</span>
                        </div>
                        <div className="form-row date-row">
                            <DateInputWithButtons
                                label="Bắt đầu"
                                value={formData.defense_start}
                                onChange={(v) => handleChange('defense_start', v)}
                                onQuickAdd={!isTemplateMode ? (days) => addToDate('defense_start', days) : undefined}
                                error={errors.defense_start}
                                disabled={isTemplateMode}
                            />
                            <span className="date-arrow">
                                <ChevronRight size={16} aria-hidden="true" />
                                {getDaysBetween('defense_start', 'defense_end') !== null && (
                                    <Badge variant="secondary" size="sm">
                                        {getDaysBetween('defense_start', 'defense_end')} ngày
                                    </Badge>
                                )}
                            </span>
                            <DateInputWithButtons
                                label="Kết thúc"
                                value={formData.defense_end}
                                onChange={(v) => handleChange('defense_end', v)}
                                onQuickAdd={!isTemplateMode ? (days) => addToDate('defense_end', days) : undefined}
                                error={errors.defense_end}
                                disabled={isTemplateMode}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

// Custom date input with quick add buttons
function DateInputWithButtons({ label, value, onChange, onQuickAdd, error, required, disabled, className }) {
    return (
        <div className={`date-input-wrapper ${className || ''}`}>
            <Input
                label={label}
                required={required}
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={error}
                disabled={disabled}
                className={disabled ? 'bg-muted' : ''}
            />
            {onQuickAdd && !disabled && (
                <div className="quick-buttons">
                    <button type="button" onClick={() => onQuickAdd(7)} title="+1 tuần">+1w</button>
                    <button type="button" onClick={() => onQuickAdd(14)} title="+2 tuần">+2w</button>
                    <button type="button" onClick={() => onQuickAdd(28)} title="+4 tuần">+4w</button>
                </div>
            )}
        </div>
    );
}

// Helper function
function formatDateForInput(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (!isValid(date)) return '';
        return format(date, "yyyy-MM-dd");
    } catch {
        return '';
    }
}
