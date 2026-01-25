import { useState, useMemo, useCallback } from 'react';
import {
    BookOpen, Plus, Calendar, CheckCircle, Clock, Users,
    Edit2, MessageSquare, AlertCircle, Send, Save, ChevronRight,
    ListChecks, Loader, Target, AlertTriangle, Paperclip, Mail, GraduationCap
} from 'lucide-react';
import {
    Button,
    Card,
    CardBody,
    Badge,
    StatusBadge,
    Modal,
    Input,
    Textarea,
    SkeletonText,
    NoDataState,
    ErrorState,
    RadioGroup,
    ProgressBar,
    AccordionItem,
    TaskList,
    ProgressTaskList,
    FileUpload,
    StatCard,
} from '../../../components/ui';
import {
    useMyTopicWithLogbook,
    useLogbookEntries,
    useCreateLogbookEntry,
    useUpdateLogbookEntry,
    useUploadAttachment,
} from '../../../hooks/useLogbook';
import { logbookService } from '../../../services/logbook.service';
import './LogbookPage.css';

// Meeting type options for RadioGroup
const MEETING_TYPE_OPTIONS = [
    { value: 'offline', label: 'Trực tiếp', icon: <Users size={14} /> },
    { value: 'online', label: 'Online', icon: <Loader size={14} /> },
];

// Status badge config
const LOGBOOK_STATUS_CONFIG = {
    draft: { variant: 'default', label: 'Bản nháp', icon: Save },
    pending: { variant: 'warning', label: 'Chờ duyệt', icon: Clock },
    approved: { variant: 'success', label: 'Đã duyệt', icon: CheckCircle },
    needs_revision: { variant: 'danger', label: 'Cần sửa', icon: AlertTriangle },
};

export function LogbookPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formData, setFormData] = useState(getEmptyFormData());
    const [openSections, setOpenSections] = useState(new Set(['completed', 'in_progress', 'planned']));

    // Queries
    const { data: topic, isLoading: topicLoading, error: topicError, refetch } = useMyTopicWithLogbook();
    const { data: entries, isLoading: entriesLoading } = useLogbookEntries(topic?.id);
    const createEntry = useCreateLogbookEntry();
    const updateEntry = useUpdateLogbookEntry();
    const uploadAttachment = useUploadAttachment();

    // Calculate current week
    const currentWeek = topic?.approved_at
        ? logbookService.calculateWeekNumber(topic.approved_at)
        : 1;

    // Get existing week numbers
    const existingWeeks = entries?.map(e => e.week_number) || [];

    // Generate week options
    const weekOptions = useMemo(() => {
        const options = [];
        // Always show at least current week + some buffer
        const maxWeek = Math.max(currentWeek, 16); // At least 16 weeks for semester
        for (let i = maxWeek; i >= 1; i--) {
            // Show if: not existing OR is the entry being edited
            if (!existingWeeks.includes(i) || editingEntry?.week_number === i) {
                const { startDate, endDate } = logbookService.getWeekDateRange(topic?.approved_at, i);
                options.push({
                    value: i,
                    label: `Tuần ${i} (${formatDate(startDate)} - ${formatDate(endDate)})`,
                    startDate,
                    endDate,
                });
            }
        }
        // If no options (all weeks taken), at least show current week for new entry
        if (options.length === 0 && !editingEntry) {
            const { startDate, endDate } = logbookService.getWeekDateRange(topic?.approved_at, currentWeek);
            options.push({
                value: currentWeek,
                label: `Tuần ${currentWeek} (${formatDate(startDate)} - ${formatDate(endDate)})`,
                startDate,
                endDate,
            });
        }
        return options;
    }, [currentWeek, existingWeeks, topic?.approved_at, editingEntry]);

    // Summary stats from form data
    const summaryStats = useMemo(() => ({
        completed: formData.completedTasks.length,
        inProgress: formData.inProgressTasks.length,
        planned: formData.plannedTasks.length,
        totalProgress: formData.inProgressTasks.length > 0
            ? Math.round(formData.inProgressTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / formData.inProgressTasks.length)
            : 0,
    }), [formData.completedTasks, formData.inProgressTasks, formData.plannedTasks]);

    // Stable callbacks for task list changes (prevents jittering from re-renders)
    const handleCompletedTasksChange = useCallback((items) => {
        setFormData(prev => ({ ...prev, completedTasks: items }));
    }, []);

    const handleInProgressTasksChange = useCallback((items) => {
        setFormData(prev => ({ ...prev, inProgressTasks: items }));
    }, []);

    const handlePlannedTasksChange = useCallback((items) => {
        setFormData(prev => ({ ...prev, plannedTasks: items }));
    }, []);

    function getEmptyFormData() {
        return {
            weekNumber: 1,
            startDate: '',
            endDate: '',
            meetingDate: new Date().toISOString().split('T')[0],
            meetingType: 'offline',
            completedTasks: [],
            inProgressTasks: [],
            plannedTasks: [],
            issues: '',
            attachments: [],
        };
    }

    // Open modal for new entry
    const handleAddNew = () => {
        // Find next available week
        let nextWeek = currentWeek;
        while (existingWeeks.includes(nextWeek) && nextWeek > 0) {
            nextWeek--;
        }
        if (nextWeek <= 0) nextWeek = currentWeek;

        const { startDate, endDate } = logbookService.getWeekDateRange(topic?.approved_at, nextWeek);

        setFormData({
            ...getEmptyFormData(),
            weekNumber: nextWeek,
            startDate,
            endDate,
            meetingDate: new Date().toISOString().split('T')[0],
        });
        setEditingEntry(null);
        setOpenSections(new Set(['completed', 'in_progress', 'planned']));
        setIsModalOpen(true);
    };

    // Open modal for editing
    const handleEdit = (entry) => {
        setFormData({
            weekNumber: entry.week_number,
            startDate: entry.start_date || '',
            endDate: entry.end_date || '',
            meetingDate: entry.meeting_date ? entry.meeting_date.split('T')[0] : '',
            meetingType: entry.meeting_type || 'offline',
            completedTasks: entry.completed_tasks || [],
            inProgressTasks: entry.in_progress_tasks || [],
            plannedTasks: entry.planned_tasks || [],
            issues: entry.issues || '',
            attachments: entry.attachments || [],
        });
        setEditingEntry(entry);
        setOpenSections(new Set(['completed', 'in_progress', 'planned']));
        setIsModalOpen(true);
    };

    // Toggle accordion section
    const toggleSection = (sectionId) => {
        setOpenSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    // Handle file upload
    const handleFileChange = async (files) => {
        // Filter out files that need upload (have isLocal flag)
        const newLocalFiles = files.filter(f => f.isLocal && f.file);
        const existingFiles = files.filter(f => !f.isLocal || !f.file);

        // Upload new files
        for (const fileObj of newLocalFiles) {
            try {
                const uploaded = await uploadAttachment.mutateAsync({
                    topicId: topic.id,
                    file: fileObj.file,
                });
                existingFiles.push(uploaded);
            } catch (error) {
                console.error('Upload failed:', error);
            }
        }

        setFormData(prev => ({ ...prev, attachments: existingFiles }));
    };

    // Submit form
    const handleSubmit = async (status = 'pending') => {
        // Validation
        if (!formData.meetingDate) {
            return;
        }
        if (formData.completedTasks.length === 0) {
            return;
        }
        if (formData.plannedTasks.length === 0) {
            return;
        }

        const data = {
            weekNumber: formData.weekNumber,
            startDate: formData.startDate,
            endDate: formData.endDate,
            meetingDate: formData.meetingDate,
            meetingType: formData.meetingType,
            completedTasks: formData.completedTasks,
            inProgressTasks: formData.inProgressTasks,
            plannedTasks: formData.plannedTasks,
            issues: formData.issues,
            attachments: formData.attachments,
            status,
        };

        if (editingEntry) {
            await updateEntry.mutateAsync({
                entryId: editingEntry.id,
                topicId: topic.id,
                updates: data,
            });
        } else {
            await createEntry.mutateAsync({
                topicId: topic.id,
                data,
            });
        }

        setIsModalOpen(false);
        setEditingEntry(null);
    };

    // Format date helper
    function formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    // Get status config
    const getStatusConfig = (entry) => {
        const status = entry.status || (entry.teacher_confirmed ? 'approved' : 'pending');
        return LOGBOOK_STATUS_CONFIG[status] || LOGBOOK_STATUS_CONFIG.pending;
    };

    // Check if entry is editable
    const isEditable = (entry) => {
        return entry.status === 'draft' || entry.status === 'needs_revision';
    };

    // Calculate week date range for display
    const getWeekDateRange = (weekNumber) => {
        const { startDate, endDate } = logbookService.getWeekDateRange(topic?.approved_at, weekNumber);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    };

    if (topicLoading) {
        return (
            <div className="logbook-page">
                <div className="page-header">
                    <SkeletonText lines={2} />
                </div>
                <Card><CardBody><SkeletonText lines={5} /></CardBody></Card>
            </div>
        );
    }

    if (topicError) {
        return <ErrorState onRetry={refetch} />;
    }

    if (!topic) {
        return (
            <div className="logbook-page">
                <NoDataState
                    icon={BookOpen}
                    title="Chưa có đề tài được duyệt"
                    description="Bạn cần có đề tài được duyệt để sử dụng nhật ký đồ án"
                />
            </div>
        );
    }

    const isSubmitting = createEntry.isPending || updateEntry.isPending;
    const canEdit = !editingEntry || isEditable(editingEntry);

    return (
        <div className="logbook-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">
                        <BookOpen size={28} aria-hidden="true" />
                        Nhật ký Đồ án
                    </h1>
                    <p className="page-subtitle">{topic.title}</p>
                </div>
                <Button leftIcon={<Plus size={18} />} onClick={handleAddNew}>
                    Thêm nhật ký
                </Button>
            </div>

            {/* Topic & Advisor Info Section */}
            <div className="logbook-info-section">
                {/* Advisor Card */}
                <Card className="advisor-card" padding="none">
                    <div className="advisor-card-body">
                        <div className="advisor-header-label">
                            <GraduationCap size={18} />
                            <span>Giảng viên hướng dẫn</span>
                        </div>
                        
                        <div className="advisor-profile">
                            <div className="advisor-avatar-wrapper">
                                <div className="advisor-avatar">
                                    {topic.advisor?.full_name?.charAt(0) || 'G'}
                                </div>
                                <div className="advisor-status-dot"></div>
                            </div>
                            
                            <div className="advisor-info">
                                <h3 className="advisor-name">{topic.advisor?.full_name || 'Chưa phân công'}</h3>
                                {topic.advisor?.teacher_code && (
                                    <span className="advisor-code">{topic.advisor.teacher_code}</span>
                                )}
                            </div>
                            
                            {topic.advisor?.email && (
                                <div className="advisor-email">
                                    <Mail size={14} />
                                    <span>{topic.advisor.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Class & Topic Info Card */}
                <Card className="class-info-card" padding="none">
                    <div className="class-info-body">
                        <div className="info-section">
                            <div className="info-header">
                                <div className="info-icon-wrapper text-primary-bg">
                                    <Users size={18} className="text-primary" />
                                </div>
                                <span className="info-title">Thông tin lớp</span>
                            </div>
                            <div className="info-content">
                                <div className="info-row">
                                    <span className="info-label">Lớp đồ án</span>
                                    <span className="info-value highlight">{topic.class?.name}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Đợt thực hiện</span>
                                    <span className="info-value">{topic.class?.session?.name}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="info-divider"></div>
                        
                        <div className="info-section">
                            <div className="info-header">
                                <div className="info-icon-wrapper text-success-bg">
                                    <Target size={18} className="text-success" />
                                </div>
                                <span className="info-title">Trạng thái</span>
                            </div>
                            <div className="stats-grid">
                                <div className="mini-stat">
                                    <span className="mini-stat-label">Tuần hiện tại</span>
                                    <span className="mini-stat-value highlight">Tuần {currentWeek}</span>
                                </div>
                                <div className="mini-stat">
                                    <span className="mini-stat-label">Đã nộp báo cáo</span>
                                    <span className="mini-stat-value">
                                        {entries?.length || 0} <span className="text-muted">/ {currentWeek}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Entries List */}
            <div className="entries-section">
                <h2 className="section-title">Lịch sử Nhật ký</h2>

                {entriesLoading ? (
                    <Card><CardBody><SkeletonText lines={4} /></CardBody></Card>
                ) : entries?.length === 0 ? (
                    <Card className="empty-entries">
                        <CardBody>
                            <NoDataState
                                icon={BookOpen}
                                title="Chưa có nhật ký nào"
                                description="Bắt đầu bằng cách thêm nhật ký tuần đầu tiên"
                                action={
                                    <Button leftIcon={<Plus size={16} />} onClick={handleAddNew}>
                                        Thêm nhật ký đầu tiên
                                    </Button>
                                }
                            />
                        </CardBody>
                    </Card>
                ) : (
                    <div className="entries-timeline">
                        {entries?.map((entry) => {
                            const statusConfig = getStatusConfig(entry);
                            const StatusIcon = statusConfig.icon;

                            return (
                                <div key={entry.id} className={`entry-card entry-status-${entry.status || 'pending'}`}>
                                    <div className="entry-header">
                                        <div className="entry-week">
                                            <span className="week-number">Tuần {entry.week_number}</span>
                                            <span className="week-range">{getWeekDateRange(entry.week_number)}</span>
                                        </div>
                                        <div className="entry-status">
                                            <Badge variant={statusConfig.variant}>
                                                <StatusIcon size={12} aria-hidden="true" />
                                                {statusConfig.label}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Summary Stats */}
                                    <div className="entry-summary">
                                        <div className="summary-item summary-completed">
                                            <CheckCircle size={14} />
                                            <span>{entry.completed_tasks?.length || 0} hoàn thành</span>
                                        </div>
                                        <div className="summary-item summary-progress">
                                            <Loader size={14} />
                                            <span>{entry.in_progress_tasks?.length || 0} đang làm</span>
                                        </div>
                                        <div className="summary-item summary-planned">
                                            <Target size={14} />
                                            <span>{entry.planned_tasks?.length || 0} kế hoạch</span>
                                        </div>
                                    </div>

                                    <div className="entry-meta">
                                        <div className="meta-item">
                                            <Calendar size={14} aria-hidden="true" />
                                            <span>Ngày gặp: {formatDate(entry.meeting_date)}</span>
                                            <Badge variant="default" size="sm">
                                                {entry.meeting_type === 'online' ? 'Online' : 'Trực tiếp'}
                                            </Badge>
                                        </div>
                                        {entry.attachments?.length > 0 && (
                                            <div className="meta-item">
                                                <Paperclip size={14} />
                                                <span>{entry.attachments.length} tệp đính kèm</span>
                                            </div>
                                        )}
                                        {(entry.feedback_comment || entry.teacher_note) && (
                                            <div className="teacher-note">
                                                <MessageSquare size={14} aria-hidden="true" />
                                                <span>
                                                    <strong>GV:</strong> {entry.feedback_comment || entry.teacher_note}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {isEditable(entry) && (
                                        <div className="entry-actions">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                leftIcon={<Edit2 size={14} />}
                                                onClick={() => handleEdit(entry)}
                                            >
                                                Chỉnh sửa
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={
                    editingEntry 
                        ? `Chỉnh sửa Nhật ký Tuần ${editingEntry.week_number}` 
                        : `Thêm Nhật ký Tuần ${formData.weekNumber}`
                }
                size="lg"
            >
                <div className="logbook-modal-content">
                    {/* Basic Info Section */}
                    <div className="modal-section">
                        <h3 className="modal-section-title">Thông tin cơ bản</h3>
                        
                        <div className="form-row">
                            {!editingEntry && (
                                <div className="form-group">
                                    <label>Tuần *</label>
                                    <select
                                        value={formData.weekNumber}
                                        onChange={(e) => {
                                            const weekNum = parseInt(e.target.value);
                                            const { startDate, endDate } = logbookService.getWeekDateRange(topic?.approved_at, weekNum);
                                            setFormData(prev => ({
                                                ...prev,
                                                weekNumber: weekNum,
                                                startDate,
                                                endDate,
                                            }));
                                        }}
                                        className="week-select"
                                        disabled={!canEdit}
                                    >
                                        {weekOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            <div className="form-group">
                                <label>Ngày gặp GV *</label>
                                <Input
                                    type="date"
                                    leftIcon={<Calendar size={16} />}
                                    value={formData.meetingDate}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        meetingDate: e.target.value
                                    }))}
                                    required
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <RadioGroup
                                name="meetingType"
                                label="Hình thức gặp"
                                options={MEETING_TYPE_OPTIONS}
                                value={formData.meetingType}
                                onChange={(value) => setFormData(prev => ({
                                    ...prev,
                                    meetingType: value
                                }))}
                                required
                                disabled={!canEdit}
                            />
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="modal-section summary-section">
                        <div className="summary-cards">
                            <div className="summary-card summary-card-success">
                                <CheckCircle size={20} />
                                <div className="summary-card-content">
                                    <span className="summary-card-value">{summaryStats.completed}</span>
                                    <span className="summary-card-label">Đã hoàn thành</span>
                                </div>
                            </div>
                            <div className="summary-card summary-card-primary">
                                <Loader size={20} />
                                <div className="summary-card-content">
                                    <span className="summary-card-value">{summaryStats.inProgress}</span>
                                    <span className="summary-card-label">Đang làm</span>
                                </div>
                            </div>
                            <div className="summary-card summary-card-warning">
                                <Target size={20} />
                                <div className="summary-card-content">
                                    <span className="summary-card-value">{summaryStats.planned}</span>
                                    <span className="summary-card-label">Tuần sau</span>
                                </div>
                            </div>
                        </div>
                        {summaryStats.inProgress > 0 && (
                            <div className="overall-progress">
                                <span className="progress-label">Tiến độ trung bình:</span>
                                <ProgressBar 
                                    value={summaryStats.totalProgress} 
                                    max={100} 
                                    variant="primary" 
                                    showLabel 
                                />
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="modal-divider" />

                    {/* Task Sections */}
                    <div className="modal-section tasks-section">
                        {/* Completed Tasks */}
                        <AccordionItem
                            id="completed"
                            title="Đã hoàn thành trong tuần"
                            icon={<ListChecks size={16} />}
                            badge={summaryStats.completed}
                            badgeVariant="success"
                            isOpen={openSections.has('completed')}
                            onToggle={toggleSection}
                        >
                            <TaskList
                                items={formData.completedTasks}
                                onChange={handleCompletedTasksChange}
                                placeholder="Mô tả công việc đã hoàn thành..."
                                emptyMessage="Thêm các công việc đã hoàn thành trong tuần"
                                disabled={!canEdit}
                            />
                        </AccordionItem>

                        {/* In Progress Tasks */}
                        <AccordionItem
                            id="in_progress"
                            title="Đang thực hiện"
                            icon={<Loader size={16} />}
                            badge={summaryStats.inProgress}
                            badgeVariant="primary"
                            isOpen={openSections.has('in_progress')}
                            onToggle={toggleSection}
                        >
                            <ProgressTaskList
                                items={formData.inProgressTasks}
                                onChange={handleInProgressTasksChange}
                                placeholder="Mô tả công việc đang làm..."
                                emptyMessage="Thêm các công việc đang thực hiện"
                                disabled={!canEdit}
                            />
                        </AccordionItem>

                        {/* Planned Tasks */}
                        <AccordionItem
                            id="planned"
                            title="Kế hoạch tuần sau"
                            icon={<Target size={16} />}
                            badge={summaryStats.planned}
                            badgeVariant="warning"
                            isOpen={openSections.has('planned')}
                            onToggle={toggleSection}
                        >
                            <TaskList
                                items={formData.plannedTasks}
                                onChange={handlePlannedTasksChange}
                                placeholder="Mô tả kế hoạch tuần sau..."
                                emptyMessage="Thêm các công việc dự định làm tuần sau"
                                disabled={!canEdit}
                            />
                        </AccordionItem>
                    </div>

                    {/* Divider */}
                    <div className="modal-divider" />

                    {/* Issues Section */}
                    <div className="modal-section">
                        <div className="form-group">
                            <label className="form-label-with-icon">
                                <AlertTriangle size={16} />
                                Vấn đề & Khó khăn
                            </label>
                            <Textarea
                                value={formData.issues}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    issues: e.target.value
                                }))}
                                placeholder="Mô tả các vấn đề, khó khăn gặp phải trong tuần (nếu có)..."
                                rows={3}
                                disabled={!canEdit}
                            />
                            <p className="form-hint">Có thể để trống nếu không có vấn đề gì</p>
                        </div>
                    </div>

                    {/* File Attachments */}
                    <div className="modal-section">
                        <FileUpload
                            files={formData.attachments}
                            onChange={handleFileChange}
                            maxFiles={10}
                            maxSizeMB={5}
                            accept={['image/*', '.pdf', '.doc', '.docx', '.zip']}
                            disabled={!canEdit}
                            label="Đính kèm tệp"
                            hint="Tối đa 10 tệp, mỗi tệp 5MB (ảnh, PDF, Word, ZIP)"
                        />
                    </div>

                    {/* Teacher Feedback (read-only) */}
                    {editingEntry && (editingEntry.feedback_comment || editingEntry.teacher_note) && (
                        <>
                            <div className="modal-divider" />
                            <div className="modal-section feedback-section">
                                <h3 className="modal-section-title">
                                    <MessageSquare size={16} />
                                    Phản hồi từ Giảng viên
                                </h3>
                                <div className="feedback-content">
                                    <p>{editingEntry.feedback_comment || editingEntry.teacher_note}</p>
                                    {editingEntry.feedback_at && (
                                        <span className="feedback-time">
                                            {new Date(editingEntry.feedback_at).toLocaleString('vi-VN')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* No feedback yet */}
                    {editingEntry && !editingEntry.feedback_comment && !editingEntry.teacher_note && (
                        <>
                            <div className="modal-divider" />
                            <div className="modal-section feedback-section">
                                <h3 className="modal-section-title">
                                    <MessageSquare size={16} />
                                    Phản hồi từ Giảng viên
                                </h3>
                                <p className="no-feedback">[Chưa có phản hồi]</p>
                            </div>
                        </>
                    )}

                    {/* Validation hints */}
                    {formData.completedTasks.length === 0 && (
                        <div className="validation-hint">
                            <AlertCircle size={14} />
                            <span>Cần ít nhất 1 công việc đã hoàn thành</span>
                        </div>
                    )}
                    {formData.plannedTasks.length === 0 && (
                        <div className="validation-hint">
                            <AlertCircle size={14} />
                            <span>Cần ít nhất 1 kế hoạch tuần sau</span>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="logbook-modal-footer">
                    <div className="footer-info">
                        {editingEntry && (
                            <span className="last-updated">
                                Cập nhật: {new Date(editingEntry.updated_at).toLocaleString('vi-VN')}
                            </span>
                        )}
                        {editingEntry && (
                            <StatusBadge status={editingEntry.status || 'pending'} />
                        )}
                    </div>
                    <div className="footer-actions">
                        <Button
                            variant="ghost"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        {canEdit && (
                            <>
                                <Button
                                    variant="secondary"
                                    leftIcon={<Save size={16} />}
                                    onClick={() => handleSubmit('draft')}
                                    loading={isSubmitting}
                                    disabled={!formData.meetingDate}
                                >
                                    Lưu nháp
                                </Button>
                                <Button
                                    leftIcon={<Send size={16} />}
                                    onClick={() => handleSubmit('pending')}
                                    loading={isSubmitting}
                                    disabled={
                                        !formData.meetingDate ||
                                        formData.completedTasks.length === 0 ||
                                        formData.plannedTasks.length === 0
                                    }
                                >
                                    Gửi báo cáo
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default LogbookPage;
