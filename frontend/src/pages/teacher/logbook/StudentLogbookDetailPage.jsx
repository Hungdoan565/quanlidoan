import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    BookOpen, ArrowLeft, Calendar, CheckCircle, Clock,
    MessageSquare, Send, User, AlertCircle, XCircle
} from 'lucide-react';
import {
    Button,
    Card,
    CardBody,
    Badge,
    Input,
    Textarea,
    Modal,
    SkeletonText,
    NoDataState,
    ErrorState,
} from '../../../components/ui';
import {
    useTopicLogbookDetail,
    useAddTeacherNote,
    useConfirmMeeting,
    useUnconfirmMeeting,
} from '../../../hooks/useLogbook';
import './StudentLogbookDetailPage.css';

export function StudentLogbookDetailPage() {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const [noteModal, setNoteModal] = useState({ open: false, entryId: null, currentNote: '' });
    const [confirmModal, setConfirmModal] = useState({ open: false, entryId: null });
    const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
    const [noteText, setNoteText] = useState('');

    // Queries
    const { data: topic, isLoading, error, refetch } = useTopicLogbookDetail(topicId);
    const addNote = useAddTeacherNote();
    const confirmMeeting = useConfirmMeeting();
    const unconfirmMeeting = useUnconfirmMeeting();

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

    // Handle add note
    const handleOpenNoteModal = (entry) => {
        setNoteText(entry.teacher_note || '');
        setNoteModal({ open: true, entryId: entry.id, currentNote: entry.teacher_note || '' });
    };

    const handleSubmitNote = async () => {
        await addNote.mutateAsync({
            entryId: noteModal.entryId,
            note: noteText,
            topicId,
        });
        setNoteModal({ open: false, entryId: null, currentNote: '' });
    };

    // Handle confirm meeting
    const handleOpenConfirmModal = (entry) => {
        setMeetingDate(entry.meeting_date
            ? new Date(entry.meeting_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setConfirmModal({ open: true, entryId: entry.id });
    };

    const handleConfirmMeeting = async () => {
        await confirmMeeting.mutateAsync({
            entryId: confirmModal.entryId,
            meetingDate: meetingDate,
            topicId,
        });
        setConfirmModal({ open: false, entryId: null });
    };

    // Handle unconfirm
    const handleUnconfirm = async (entryId) => {
        if (window.confirm('Bạn có chắc muốn hủy xác nhận buổi gặp này?')) {
            await unconfirmMeeting.mutateAsync({ entryId, topicId });
        }
    };

    if (isLoading) {
        return (
            <div className="logbook-detail-page">
                <div className="page-header">
                    <SkeletonText lines={2} />
                </div>
                <Card><CardBody><SkeletonText lines={6} /></CardBody></Card>
            </div>
        );
    }

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    if (!topic) {
        return (
            <div className="logbook-detail-page">
                <NoDataState
                    icon={AlertCircle}
                    title="Không tìm thấy đề tài"
                    description="Đề tài không tồn tại hoặc bạn không có quyền xem"
                    action={
                        <Button onClick={() => navigate('/teacher/logbook')}>
                            Quay lại
                        </Button>
                    }
                />
            </div>
        );
    }

    const entries = topic.logbook_entries || [];

    return (
        <div className="logbook-detail-page">
            {/* Header */}
            <div className="page-header">
                <Button
                    variant="ghost"
                    leftIcon={<ArrowLeft size={18} />}
                    onClick={() => navigate('/teacher/logbook')}
                >
                    Quay lại
                </Button>
            </div>

            {/* Student Info */}
            <Card className="student-info-card">
                <CardBody>
                    <div className="student-header">
                        <div className="student-avatar large">
                            {topic.student?.full_name?.charAt(0) || 'S'}
                        </div>
                        <div className="student-details">
                            <h1 className="student-name">{topic.student?.full_name}</h1>
                            <p className="student-code">{topic.student?.student_code}</p>
                            <p className="student-email">{topic.student?.email}</p>
                        </div>
                    </div>
                    <div className="topic-info">
                        <div className="topic-title-row">
                            <BookOpen size={18} />
                            <span>{topic.title}</span>
                        </div>
                        <div className="topic-meta">
                            <span>Lớp: {topic.class?.name}</span>
                            <span>•</span>
                            <span>Duyệt: {formatDate(topic.approved_at)}</span>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Entries List */}
            <div className="entries-section">
                <h2 className="section-title">
                    Nhật ký ({entries.length} entries)
                </h2>

                {entries.length === 0 ? (
                    <Card>
                        <CardBody>
                            <NoDataState
                                icon={BookOpen}
                                title="Chưa có nhật ký"
                                description="Sinh viên chưa thêm nhật ký nào"
                            />
                        </CardBody>
                    </Card>
                ) : (
                    <div className="entries-list">
                        {entries.map((entry) => (
                            <Card key={entry.id} className={`entry-card ${entry.teacher_confirmed ? 'confirmed' : ''}`}>
                                <CardBody>
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
                                        <p className="content-text">
                                            {entry.content}
                                        </p>
                                    </div>

                                    <div className="entry-meta">
                                        <div className="meta-item">
                                            <Calendar size={14} />
                                            <span>SV báo gặp: {formatDate(entry.meeting_date)}</span>
                                        </div>
                                        <div className="meta-item">
                                            <Clock size={14} />
                                            <span>Tạo: {formatDate(entry.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Teacher Note Section */}
                                    <div className="teacher-section">
                                        <label className="section-label">Ghi chú của GV:</label>
                                        {entry.teacher_note ? (
                                            <div className="teacher-note">
                                                <MessageSquare size={14} />
                                                <span>{entry.teacher_note}</span>
                                            </div>
                                        ) : (
                                            <p className="no-note">Chưa có ghi chú</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="entry-actions">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            leftIcon={<MessageSquare size={14} />}
                                            onClick={() => handleOpenNoteModal(entry)}
                                        >
                                            {entry.teacher_note ? 'Sửa ghi chú' : 'Thêm ghi chú'}
                                        </Button>

                                        {entry.teacher_confirmed ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                leftIcon={<XCircle size={14} />}
                                                onClick={() => handleUnconfirm(entry.id)}
                                            >
                                                Hủy xác nhận
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                leftIcon={<CheckCircle size={14} />}
                                                onClick={() => handleOpenConfirmModal(entry)}
                                            >
                                                Xác nhận gặp
                                            </Button>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Note Modal */}
            <Modal
                isOpen={noteModal.open}
                onClose={() => setNoteModal({ open: false, entryId: null, currentNote: '' })}
                title="Ghi chú cho Sinh viên"
                size="md"
            >
                <div className="note-form">
                    <Textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Nhập ghi chú, phản hồi cho sinh viên về tiến độ tuần này…"
                        rows={5}
                    />
                    <p className="form-hint">
                        Ghi chú sẽ hiển thị cho sinh viên xem.
                    </p>
                    <div className="form-actions">
                        <Button
                            variant="ghost"
                            onClick={() => setNoteModal({ open: false, entryId: null, currentNote: '' })}
                        >
                            Hủy
                        </Button>
                        <Button
                            leftIcon={<Send size={16} />}
                            onClick={handleSubmitNote}
                            loading={addNote.isPending}
                        >
                            Lưu ghi chú
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Meeting Modal */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, entryId: null })}
                title="Xác nhận buổi gặp"
                size="sm"
            >
                <div className="confirm-form">
                    <p>Xác nhận bạn đã gặp và trao đổi với sinh viên.</p>
                    <div className="form-group">
                        <label>Ngày gặp thực tế:</label>
                        <Input
                            type="date"
                            leftIcon={<Calendar size={16} />}
                            value={meetingDate}
                            onChange={(e) => setMeetingDate(e.target.value)}
                        />
                    </div>
                    <div className="form-actions">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmModal({ open: false, entryId: null })}
                        >
                            Hủy
                        </Button>
                        <Button
                            leftIcon={<CheckCircle size={16} />}
                            onClick={handleConfirmMeeting}
                            loading={confirmMeeting.isPending}
                        >
                            Xác nhận
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default StudentLogbookDetailPage;
