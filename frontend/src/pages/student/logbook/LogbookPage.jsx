import { useState } from 'react';
import {
    BookOpen, Plus, Calendar, CheckCircle, Clock,
    Edit2, MessageSquare, AlertCircle
} from 'lucide-react';
import {
    Button,
    Card,
    CardBody,
    Badge,
    Modal,
    Input,
    Textarea,
    SkeletonText,
    NoDataState,
    ErrorState,
} from '../../../components/ui';
import {
    useMyTopicWithLogbook,
    useLogbookEntries,
    useCreateLogbookEntry,
    useUpdateLogbookEntry,
} from '../../../hooks/useLogbook';
import { logbookService } from '../../../services/logbook.service';
import './LogbookPage.css';

export function LogbookPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formData, setFormData] = useState({
        weekNumber: 1,
        content: '',
        meetingDate: '',
    });

    // Queries
    const { data: topic, isLoading: topicLoading, error: topicError, refetch } = useMyTopicWithLogbook();
    const { data: entries, isLoading: entriesLoading } = useLogbookEntries(topic?.id);
    const createEntry = useCreateLogbookEntry();
    const updateEntry = useUpdateLogbookEntry();

    // Calculate current week
    const currentWeek = topic?.approved_at
        ? logbookService.calculateWeekNumber(topic.approved_at)
        : 1;

    // Get existing week numbers
    const existingWeeks = entries?.map(e => e.week_number) || [];

    // Open modal for new entry
    const handleAddNew = () => {
        // Find next available week
        let nextWeek = currentWeek;
        while (existingWeeks.includes(nextWeek) && nextWeek > 0) {
            nextWeek--;
        }
        if (nextWeek <= 0) nextWeek = currentWeek;

        setFormData({
            weekNumber: nextWeek,
            content: '',
            meetingDate: new Date().toISOString().split('T')[0],
        });
        setEditingEntry(null);
        setIsModalOpen(true);
    };

    // Open modal for editing
    const handleEdit = (entry) => {
        setFormData({
            weekNumber: entry.week_number,
            content: entry.content,
            meetingDate: entry.meeting_date ? entry.meeting_date.split('T')[0] : '',
        });
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.content.trim()) {
            return;
        }

        if (editingEntry) {
            await updateEntry.mutateAsync({
                entryId: editingEntry.id,
                topicId: topic.id,
                updates: {
                    content: formData.content,
                    meetingDate: formData.meetingDate || null,
                },
            });
        } else {
            await createEntry.mutateAsync({
                topicId: topic.id,
                data: {
                    weekNumber: formData.weekNumber,
                    content: formData.content,
                    meetingDate: formData.meetingDate || null,
                },
            });
        }

        setIsModalOpen(false);
        setEditingEntry(null);
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return 'Chưa có';
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    // Calculate week date range
    const getWeekDateRange = (weekNumber) => {
        if (!topic?.approved_at) return '';
        const start = new Date(topic.approved_at);
        start.setDate(start.getDate() + (weekNumber - 1) * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${formatDate(start)} - ${formatDate(end)}`;
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

    return (
        <div className="logbook-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">
                        <BookOpen size={28} />
                        Nhật ký Đồ án
                    </h1>
                    <p className="page-subtitle">{topic.title}</p>
                </div>
                <Button leftIcon={<Plus size={18} />} onClick={handleAddNew}>
                    Thêm nhật ký
                </Button>
            </div>

            {/* Topic Info Card */}
            <Card className="topic-info-card">
                <CardBody>
                    <div className="topic-info-grid">
                        <div className="info-item">
                            <span className="info-label">Đợt / Lớp</span>
                            <span className="info-value">
                                {topic.class?.session?.name} / {topic.class?.name}
                            </span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">GV Hướng dẫn</span>
                            <span className="info-value">{topic.advisor?.full_name || 'Chưa phân công'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Tuần hiện tại</span>
                            <span className="info-value highlight">Tuần {currentWeek}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Số entries</span>
                            <span className="info-value">
                                {entries?.length || 0} / {currentWeek} tuần
                            </span>
                        </div>
                    </div>
                </CardBody>
            </Card>

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
                        {entries?.map((entry) => (
                            <div key={entry.id} className={`entry-card ${entry.teacher_confirmed ? 'confirmed' : ''}`}>
                                <div className="entry-header">
                                    <div className="entry-week">
                                        <span className="week-number">Tuần {entry.week_number}</span>
                                        <span className="week-range">{getWeekDateRange(entry.week_number)}</span>
                                    </div>
                                    <div className="entry-status">
                                        {entry.teacher_confirmed ? (
                                            <Badge variant="success">
                                                <CheckCircle size={12} />
                                                Đã xác nhận
                                            </Badge>
                                        ) : (
                                            <Badge variant="warning">
                                                <Clock size={12} />
                                                Chờ xác nhận
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="entry-content">
                                    <div
                                        className="content-text"
                                        dangerouslySetInnerHTML={{ __html: entry.content.replace(/\n/g, '<br/>') }}
                                    />
                                </div>

                                <div className="entry-meta">
                                    <div className="meta-item">
                                        <Calendar size={14} />
                                        <span>Ngày gặp: {formatDate(entry.meeting_date)}</span>
                                    </div>
                                    {entry.teacher_note && (
                                        <div className="teacher-note">
                                            <MessageSquare size={14} />
                                            <span><strong>GV:</strong> {entry.teacher_note}</span>
                                        </div>
                                    )}
                                </div>

                                {!entry.teacher_confirmed && (
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
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingEntry ? 'Chỉnh sửa Nhật ký' : 'Thêm Nhật ký mới'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="logbook-form">
                    {!editingEntry && (
                        <div className="form-group">
                            <label>Tuần *</label>
                            <select
                                value={formData.weekNumber}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    weekNumber: parseInt(e.target.value)
                                }))}
                                className="week-select"
                            >
                                {Array.from({ length: currentWeek }, (_, i) => i + 1)
                                    .filter(w => !existingWeeks.includes(w))
                                    .map(week => (
                                        <option key={week} value={week}>
                                            Tuần {week} ({getWeekDateRange(week)})
                                        </option>
                                    ))
                                }
                            </select>
                            {existingWeeks.length === currentWeek && (
                                <p className="form-hint warning">
                                    <AlertCircle size={14} />
                                    Đã có đủ nhật ký cho các tuần. Hãy chỉnh sửa entry cũ.
                                </p>
                            )}
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
                        />
                    </div>

                    <div className="form-group">
                        <label>Nội dung công việc tuần này *</label>
                        <Textarea
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: e.target.value
                            }))}
                            placeholder="Mô tả chi tiết công việc đã thực hiện trong tuần này...

• Đã hoàn thành:
• Đang thực hiện:
• Kế hoạch tuần sau:
• Khó khăn gặp phải:"
                            rows={8}
                            required
                        />
                        <p className="form-hint">
                            Hỗ trợ xuống dòng. Nội dung sẽ không thể sửa sau khi GV xác nhận.
                        </p>
                    </div>

                    <div className="form-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            loading={createEntry.isPending || updateEntry.isPending}
                            disabled={!formData.content.trim() || !formData.meetingDate}
                        >
                            {editingEntry ? 'Lưu thay đổi' : 'Thêm nhật ký'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default LogbookPage;
