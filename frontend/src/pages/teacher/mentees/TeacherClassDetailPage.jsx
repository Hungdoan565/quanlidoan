import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  BookOpen,
  AlertCircle,
  Mail,
  Clock,
  Copy,
} from 'lucide-react';
import {
  Card,
  CardBody,
  Badge,
  Button,
  SkeletonCard,
  NoDataState,
  ErrorState,
  StatusBadge
} from '../../../components/ui';
import { useMyClassStudents } from '../../../hooks/useTeacher';
import { StudentTopicDetailModal } from './StudentTopicDetailModal';
import './TeacherClassDetailPage.css';

export default function TeacherClassDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { data: classData, isLoading, error, refetch } = useMyClassStudents(classId);

  // Modal state
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Stats calculation
  const stats = useMemo(() => {
    if (!classData?.students) return { total: 0, registered: 0, noTopic: 0 };
    
    const students = classData.students;
    const total = students.length;
    const registered = students.filter(s => s.topic).length;
    const noTopic = total - registered;

    return { total, registered, noTopic };
  }, [classData]);

  if (isLoading) {
    return (
      <div className="teacher-class-detail">
        <header className="detail-header">
          <div className="back-link" style={{ width: 100, height: 24, background: '#f1f5f9', borderRadius: 4 }}></div>
          <div className="header-info" style={{ marginTop: 16 }}>
            <div style={{ width: 300, height: 40, background: '#e2e8f0', borderRadius: 8 }}></div>
          </div>
        </header>
        <div className="stats-section">
          {[1, 2, 3].map(i => (
            <div key={i} className="stat-box" style={{ height: 120 }}>
              <div style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: '50%' }}></div>
            </div>
          ))}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-class-detail">
        <header className="detail-header">
          <Link to="/teacher/mentees" className="back-link">
            <ArrowLeft size={20} /> Quay lại
          </Link>
        </header>
        <ErrorState 
          title="Không thể tải thông tin lớp học"
          message={error.message || "Đã có lỗi xảy ra vui lòng thử lại sau"}
          onRetry={refetch} 
        />
      </div>
    );
  }

  // If no class data found (edge case)
  if (!classData) {
    return (
      <div className="teacher-class-detail">
        <header className="detail-header">
          <Link to="/teacher/mentees" className="back-link">
            <ArrowLeft size={20} /> Quay lại
          </Link>
        </header>
        <NoDataState title="Không tìm thấy lớp học" />
      </div>
    );
  }

  const students = classData.students || [];

  return (
    <div className="teacher-class-detail">
      {/* Header with back link */}
      <header className="detail-header">
        <Link to="/teacher/mentees" className="back-link">
          <ArrowLeft size={20} /> Quay lại danh sách
        </Link>
        <div className="header-info">
          <Badge variant="primary">{classData.code}</Badge>
          <h1>{classData.name}</h1>
          {classData.session && (
            <span className="session-info">
              <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
              {classData.session.name}
            </span>
          )}
        </div>
      </header>

      {/* Stats Row */}
      <div className="stats-section">
        <div className="stat-box">
          <span className="stat-value">{stats.total}/{classData.max_students}</span>
          <span className="stat-label">Sinh viên</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{stats.registered}</span>
          <span className="stat-label">Đề tài đã ĐK</span>
        </div>
        <div className={`stat-box ${stats.noTopic > 0 ? 'warning' : ''}`}>
          <span className="stat-value">{stats.noTopic}</span>
          <span className="stat-label">Chưa ĐK đề tài</span>
        </div>
      </div>

      {/* Students Table */}
      <Card className="students-card">
        <CardBody className="p-0">
          {students.length === 0 ? (
            <div className="p-8">
              <NoDataState 
                icon={Users}
                title="Lớp chưa có sinh viên nào"
                description="Hiện tại chưa có sinh viên nào đăng ký vào lớp học phần này."
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sinh viên</th>
                    <th>Đề tài</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={student.id} className={!student.topic ? 'no-topic-row' : ''}>
                      <td>{idx + 1}</td>
                      <td>
                        <div className="student-cell">
                          <span className="student-name">{student.full_name}</span>
                          <span className="student-code">{student.student_code}</span>
                        </div>
                      </td>
                      <td>
                        {student.topic ? (
                          <div className="topic-info">
                            <button 
                              className="topic-title-btn"
                              onClick={() => {
                                setSelectedTopicId(student.topic.id);
                                setSelectedStudent(student);
                              }}
                              title="Xem chi tiết đề tài"
                            >
                              {student.topic.title}
                            </button>
                          </div>
                        ) : (
                          <span className="no-topic">
                            <AlertCircle size={14} /> Chưa đăng ký đề tài
                          </span>
                        )}
                      </td>
                      <td>
                        {student.topic ? (
                          <StatusBadge status={student.topic.status} />
                        ) : (
                          <Badge variant="default" className="text-muted">Chưa ĐK</Badge>
                        )}
                      </td>
                      <td className="actions-cell">
                        {student.topic && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/teacher/logbook/${student.topic.id}`)}
                            title="Xem nhật ký"
                          >
                            <BookOpen size={16} />
                          </Button>
                        )}
                        {student.email && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={async () => {
                              await navigator.clipboard.writeText(student.email);
                              toast.success(`Đã copy: ${student.email}`);
                            }}
                            title="Copy email"
                          >
                            <Copy size={16} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Topic Detail Modal */}
      <StudentTopicDetailModal
        isOpen={!!selectedTopicId}
        onClose={() => {
          setSelectedTopicId(null);
          setSelectedStudent(null);
        }}
        topicId={selectedTopicId}
        studentInfo={selectedStudent}
      />
    </div>
  );
}
