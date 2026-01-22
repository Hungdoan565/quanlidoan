import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    FileText, 
    Clock, 
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Star
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTeacherDashboardStats, useTeacherTodoList, useGuidingStudents } from '../../hooks/useTeacher';
import { StatCard, SkeletonStatCard, Card, CardHeader, CardBody, Badge, StatusBadge } from '../../components/ui';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import './DashboardPage.css';

export function TeacherDashboard() {
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    
    const { data: stats, isLoading: statsLoading } = useTeacherDashboardStats();
    const { data: todos = [], isLoading: todosLoading } = useTeacherTodoList();
    const { data: students = [], isLoading: studentsLoading } = useGuidingStudents();

    const isLoading = statsLoading;

    // Get icon component
    const getIcon = (iconName) => {
        const icons = { AlertCircle, FileText, Clock, CheckCircle };
        return icons[iconName] || AlertCircle;
    };

    return (
        <div className="dashboard-page teacher-dashboard">
            {/* Welcome Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1>Xin chào, {profile?.full_name || 'Giảng viên'}</h1>
                    <p>Quản lý đề tài và sinh viên của bạn</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid stats-grid-4">
                {isLoading ? (
                    <>
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                        <SkeletonStatCard />
                    </>
                ) : (
                    <>
                        <StatCard
                            title="SV đang hướng dẫn"
                            value={stats?.guidingStudents || 0}
                            icon={Users}
                            variant="primary"
                            subtitle="Sinh viên được phân công"
                        />
                        <StatCard
                            title="Đề tài chờ duyệt"
                            value={stats?.pendingApproval || 0}
                            icon={Clock}
                            variant="warning"
                            subtitle="Cần xử lý"
                            onClick={() => navigate('/teacher/reviews')}
                        />
                        <StatCard
                            title="Báo cáo cần chấm"
                            value={stats?.pendingGrades || 0}
                            icon={FileText}
                            variant="danger"
                            subtitle="Đang chờ"
                            onClick={() => navigate('/teacher/grading')}
                        />
                        <StatCard
                            title="Hoàn thành"
                            value={stats?.completedTopics || 0}
                            icon={CheckCircle}
                            variant="success"
                            subtitle="Đề tài đã hoàn tất"
                        />
                    </>
                )}
            </div>

            {/* Main Content */}
            <div className="dashboard-main">
                {/* Todo List */}
                <Card className="todo-card">
                    <CardHeader>
                        <div className="card-header-with-action">
                            <h3>Việc cần làm</h3>
                            {todos.length > 0 && (
                                <Badge variant="warning">{todos.length}</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardBody className="todo-body">
                        {todosLoading ? (
                            <div className="loading-placeholder">Đang tải...</div>
                        ) : todos.length > 0 ? (
                            <ul className="todo-list">
                                {todos.map((todo) => {
                                    const Icon = getIcon(todo.icon);
                                    return (
                                        <li 
                                            key={todo.id} 
                                            className={`todo-item todo-priority-${todo.priority}`}
                                            onClick={() => navigate(todo.link)}
                                        >
                                            <div className={`todo-icon todo-icon-${todo.type}`}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="todo-content">
                                                <span className="todo-title">{todo.title}</span>
                                                <span className="todo-description">{todo.description}</span>
                                            </div>
                                            <ChevronRight size={16} className="todo-arrow" />
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="empty-todo">
                                <CheckCircle size={40} className="empty-icon" />
                                <p>Không có việc cần làm</p>
                                <span>Tất cả đã được xử lý!</span>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Students List */}
                <Card className="students-card">
                    <CardHeader>
                        <div className="card-header-with-action">
                            <h3>Sinh viên đang hướng dẫn</h3>
                            <button 
                                className="view-all-btn"
                                onClick={() => navigate('/teacher/students')}
                            >
                                Xem tất cả
                            </button>
                        </div>
                    </CardHeader>
                    <CardBody className="students-body">
                        {studentsLoading ? (
                            <div className="loading-placeholder">Đang tải...</div>
                        ) : students.length > 0 ? (
                            <ul className="students-list">
                                {students.slice(0, 5).map((item) => (
                                    <li 
                                        key={item.id} 
                                        className="student-item"
                                        onClick={() => navigate(`/teacher/topics/${item.id}`)}
                                    >
                                        <div className="student-avatar">
                                            {item.student?.full_name?.[0] || 'S'}
                                        </div>
                                        <div className="student-info">
                                            <span className="student-name">{item.student?.full_name}</span>
                                            <span className="student-topic">{item.title}</span>
                                        </div>
                                        <StatusBadge status={item.status} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="empty-students">
                                <Users size={40} className="empty-icon" />
                                <p>Chưa có sinh viên</p>
                                <span>Bạn chưa được phân công hướng dẫn sinh viên nào</span>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h3>Thao tác nhanh</h3>
                <div className="quick-actions-grid">
                    <button 
                        className="quick-action-btn"
                        onClick={() => navigate('/teacher/topics/new')}
                    >
                        <FileText size={20} />
                        <span>Tạo đề tài mẫu</span>
                    </button>
                    <button 
                        className="quick-action-btn"
                        onClick={() => navigate('/teacher/reviews')}
                    >
                        <Clock size={20} />
                        <span>Duyệt đề tài</span>
                    </button>
                    <button 
                        className="quick-action-btn"
                        onClick={() => navigate('/teacher/grading')}
                    >
                        <Star size={20} />
                        <span>Chấm điểm</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
