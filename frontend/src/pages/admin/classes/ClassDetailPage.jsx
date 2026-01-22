import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Users,
    UserPlus,
    Trash2,
    BookOpen,
    User,
    Calendar,
    ChevronRight,
    MoreHorizontal,
    Edit,
    Mail,
    GraduationCap,
    CheckCircle,
    Clock,
    AlertCircle,
    FileSpreadsheet
} from 'lucide-react';
import { useClass, useAssignTeacherPair, useRemoveStudentFromClass } from '../../../hooks/useClasses';
import { useTeachers } from '../../../hooks/useUsers';
import { useSessions } from '../../../hooks/useSessions';
import {
    Button,
    Card,
    Badge,
    StatusBadge,
    Select,
    ConfirmModal,
    SkeletonCard,
    ErrorState,
    ProgressBar,
    Tooltip,
} from '../../../components/ui';
import { AddStudentModal } from './AddStudentModal';
import { ImportStudentsModal } from './ImportStudentsModal';
import { ClassFormModal } from './ClassFormModal';
import './ClassDetailPage.css';

export function ClassDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: cls, isLoading, error, refetch } = useClass(id);
    const { data: teachers = [] } = useTeachers();
    const { data: sessions = [] } = useSessions({});
    const assignTeacherPair = useAssignTeacherPair();
    const removeStudent = useRemoveStudentFromClass();

    // Modal states
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [removeStudentConfirm, setRemoveStudentConfirm] = useState({ open: false, student: null });
    const [teacherForm, setTeacherForm] = useState({ editing: false, teacherId: '' });

    // Calculate stats
    const studentCount = cls?.students?.length || 0;
    const maxStudents = cls?.max_students || 30;
    const capacityPercent = Math.round((studentCount / maxStudents) * 100);
    const topicsRegistered = cls?.students?.filter(s => s.topic)?.length || 0;
    const topicsApproved = cls?.students?.filter(s => s.topic?.status === 'approved')?.length || 0;

    // Handle teacher assignment (single teacher)
    const handleSaveTeacher = async () => {
        if (!teacherForm.teacherId) return;

        try {
            await assignTeacherPair.mutateAsync({
                classId: id,
                advisorId: teacherForm.teacherId,
            });
            setTeacherForm({ editing: false, teacherId: '' });
            // Manually refetch to ensure UI updates
            await refetch();
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleEditTeacher = () => {
        setTeacherForm({
            editing: true,
            teacherId: cls?.advisor?.id || '',
        });
    };

    const handleRemoveStudent = async () => {
        if (removeStudentConfirm.student) {
            await removeStudent.mutateAsync({
                classId: id,
                studentId: removeStudentConfirm.student.id,
            });
            setRemoveStudentConfirm({ open: false, student: null });
        }
    };

    // Teacher options for select
    const teacherOptions = teachers.map(t => ({
        value: t.id,
        label: `${t.full_name} (${t.teacher_code || 'N/A'})`,
    }));

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    if (isLoading) {
        return (
            <div className="class-detail-page">
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    return (
        <div className="class-detail-page">
            {/* Header */}
            <header className="detail-header">
                <div className="header-left">
                    <Link to="/admin/classes" className="back-link">
                        <ArrowLeft size={16} />
                        Quay lại
                    </Link>
                    <div className="header-title">
                        <h1>{cls?.name}</h1>
                        <div className="header-meta">
                            <span className="meta-badge code">{cls?.code}</span>
                            <span className="meta-divider">•</span>
                            <span className="meta-text">{cls?.session?.academic_year}</span>
                            <span className="meta-text">HK{cls?.session?.semester}</span>
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<FileSpreadsheet size={16} />}
                        onClick={() => {
                            import('../../../utils/excel').then(({ exportStudentsToExcel }) => {
                                exportStudentsToExcel(cls);
                            });
                        }}
                    >
                        Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<FileSpreadsheet size={16} />}
                        onClick={() => {
                            import('../../../utils/pdf').then(({ generatePDF }) => {
                                generatePDF('studentList', cls);
                            });
                        }}
                    >
                        PDF
                    </Button>
                    <Button variant="outline" size="sm" leftIcon={<Edit size={16} />} onClick={() => setIsEditModalOpen(true)}>
                        Chỉnh sửa
                    </Button>
                </div>
            </header>

            {/* Stats Overview */}
            <section className="stats-section">
                <div className="stat-card">
                    <div className="stat-icon students">
                        <Users size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{studentCount}/{maxStudents}</span>
                        <span className="stat-label">Sinh viên</span>
                    </div>
                    <div className="stat-progress">
                        <ProgressBar value={capacityPercent} size="sm" />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon topics">
                        <BookOpen size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{topicsRegistered}</span>
                        <span className="stat-label">Đề tài đã đăng ký</span>
                    </div>
                    {topicsRegistered > 0 && (
                        <div className="stat-mini">
                            <CheckCircle size={12} />
                            <span>{topicsApproved} đã duyệt</span>
                        </div>
                    )}
                </div>

                <div className="stat-card">
                    <div className="stat-icon teachers">
                        <GraduationCap size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{cls?.advisor ? '1/1' : '0/1'}</span>
                        <span className="stat-label">Giảng viên</span>
                    </div>
                    {!cls?.advisor && (
                        <div className="stat-warning">
                            <AlertCircle size={12} />
                            <span>Chưa phân công</span>
                        </div>
                    )}
                </div>
            </section>

            {/* Teacher Assignment Section */}
            <section className="teachers-section">
                <div className="section-header">
                            <h2>Giảng viên hướng dẫn</h2>
                    {!teacherForm.editing && (
                        <Button variant="ghost" size="sm" onClick={handleEditTeacher}>
                            <Edit size={14} />
                                    {cls?.advisor ? 'Thay đổi' : 'Phân công'}
                        </Button>
                    )}
                </div>

                {teacherForm.editing ? (
                    <Card className="teacher-form-card">
                        <div className="teacher-form">
                            <div className="form-group">
                                <label>Giảng viên hướng dẫn</label>
                                <Select
                                    options={[{ value: '', label: '-- Chọn giảng viên --' }, ...teacherOptions]}
                                    value={teacherForm.teacherId}
                                    onChange={(e) => setTeacherForm(prev => ({
                                        ...prev,
                                        teacherId: e.target.value
                                    }))}
                                />
                            </div>
                            <div className="form-actions">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setTeacherForm({ editing: false, teacherId: '' })}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveTeacher}
                                    loading={assignTeacherPair.isPending}
                                    disabled={!teacherForm.teacherId}
                                >
                                    Lưu phân công
                                </Button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="teacher-cards single">
                        <TeacherCard
                            role="GVHD"
                            roleLabel="Giảng viên hướng dẫn"
                            teacher={cls?.advisor}
                            variant="primary"
                        />
                    </div>
                )}
            </section>

            {/* Students List Section */}
            <section className="students-section">
                <div className="section-header">
                    <h2>Danh sách sinh viên ({studentCount})</h2>
                    <div className="section-actions">
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<FileSpreadsheet size={16} />}
                            onClick={() => setIsImportOpen(true)}
                        >
                            Import Excel
                        </Button>
                        <Button
                            size="sm"
                            leftIcon={<UserPlus size={16} />}
                            onClick={() => setIsAddStudentOpen(true)}
                        >
                            Thêm SV
                        </Button>
                    </div>
                </div>

                {studentCount > 0 ? (
                    <Card className="students-table-card">
                        <table className="students-table">
                            <thead>
                                <tr>
                                    <th className="col-stt">#</th>
                                    <th className="col-student">Sinh viên</th>
                                    <th className="col-topic">Đề tài</th>
                                    <th className="col-status">Trạng thái</th>
                                    <th className="col-actions"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cls.students.map((student, index) => (
                                    <tr key={student.id} className="student-row">
                                        <td className="col-stt">
                                            <span className="stt-number">{index + 1}</span>
                                        </td>
                                        <td className="col-student">
                                            <div className="student-info">
                                                <div className="student-avatar">
                                                    <User size={16} />
                                                </div>
                                                <div className="student-details">
                                                    <span className="student-name">{student.full_name}</span>
                                                    <span className="student-code">{student.student_code}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="col-topic">
                                            {student.topic ? (
                                                <div className="topic-info">
                                                    <Tooltip content={student.topic.title} position="top">
                                                        <span className="topic-title">
                                                            {student.topic.title}
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                            ) : (
                                                <span className="no-topic">Chưa đăng ký đề tài</span>
                                            )}
                                        </td>
                                        <td className="col-status">
                                            {student.topic ? (
                                                <StatusBadge status={student.topic.status} />
                                            ) : (
                                                <Badge variant="default" size="sm">Chưa ĐK</Badge>
                                            )}
                                        </td>
                                        <td className="col-actions">
                                            <button
                                                className="action-btn danger"
                                                onClick={() => setRemoveStudentConfirm({ open: true, student })}
                                                title="Xóa khỏi lớp"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                ) : (
                    <Card className="empty-state-card">
                        <div className="empty-state">
                            <div className="empty-icon">
                                <GraduationCap size={48} />
                            </div>
                            <h3>Chưa có sinh viên trong lớp</h3>
                            <p>Thêm sinh viên vào lớp để bắt đầu quản lý đề tài</p>
                            <Button
                                leftIcon={<UserPlus size={16} />}
                                onClick={() => setIsAddStudentOpen(true)}
                            >
                                Thêm sinh viên đầu tiên
                            </Button>
                        </div>
                    </Card>
                )}
            </section>

            {/* Add Student Modal */}
            <AddStudentModal
                isOpen={isAddStudentOpen}
                onClose={() => setIsAddStudentOpen(false)}
                classId={id}
                sessionId={cls?.session_id}
                existingStudentIds={cls?.students?.map(s => s.id) || []}
            />

            {/* Import Students Excel Modal */}
            <ImportStudentsModal
                isOpen={isImportOpen}
                onClose={() => { setIsImportOpen(false); refetch(); }}
                classId={id}
                existingStudentIds={cls?.students?.map(s => s.id) || []}
            />

            {/* Remove Student Confirmation */}
            <ConfirmModal
                isOpen={removeStudentConfirm.open}
                onClose={() => setRemoveStudentConfirm({ open: false, student: null })}
                onConfirm={handleRemoveStudent}
                title="Xóa sinh viên khỏi lớp"
                message={`Bạn có chắc muốn xóa "${removeStudentConfirm.student?.full_name}" khỏi lớp này?`}
                confirmText="Xóa"
                variant="danger"
                loading={removeStudent.isPending}
            />

            {/* Edit Class Modal */}
            <ClassFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                cls={cls}
                sessions={sessions}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    refetch();
                }}
            />
        </div>
    );
}

// Teacher Card Component
function TeacherCard({ role, roleLabel, teacher, variant }) {
    return (
        <div className={`teacher-card ${variant} ${!teacher ? 'empty' : ''}`}>
            <div className="teacher-role">
                <Badge variant={variant} size="sm">{role}</Badge>
                <span className="role-label">{roleLabel}</span>
            </div>
            {teacher ? (
                <div className="teacher-profile">
                    <div className="teacher-avatar">
                        <User size={20} />
                    </div>
                    <div className="teacher-info">
                        <span className="teacher-name">{teacher.full_name}</span>
                        <span className="teacher-code">{teacher.teacher_code || teacher.email}</span>
                    </div>
                </div>
            ) : (
                <div className="teacher-empty">
                    <span className="empty-text">Chưa phân công</span>
                    <span className="empty-hint">Nhấn "Phân công" để chọn giảng viên</span>
                </div>
            )}
        </div>
    );
}
