import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    FileText, 
    Clock, 
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Star,
    RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTeacherDashboardStats, useTeacherTodoList, useGuidingStudents } from '../../hooks/useTeacher';
import { StatCard, SkeletonStatCard, Card, CardHeader, CardBody, Badge, StatusBadge, Button } from '../../components/ui';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import './DashboardPage.css';

// Icon mapping - moved outside component to prevent recreation on each render
const ICONS = { AlertCircle, FileText, Clock, CheckCircle };
const getIcon = (iconName) => ICONS[iconName] || AlertCircle;

export function TeacherDashboard() {
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    
    const { 
        data: stats, 
        isLoading: statsLoading, 
        isError: statsError,
        refetch: refetchStats 
    } = useTeacherDashboardStats();
    
    const { 
        data: todos = [], 
        isLoading: todosLoading,
        isError: todosError,
        refetch: refetchTodos
    } = useTeacherTodoList();
    
    const { 
        data: students = [], 
        isLoading: studentsLoading,
        isError: studentsError,
        refetch: refetchStudents
    } = useGuidingStudents();

    const isLoading = statsLoading;

    // Keyboard navigation handler for list items
    const handleKeyDown = (e, action) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            action();
        }
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
                {statsError ? (
                    <div className="stats-error-state">
                        <AlertCircle size={24} />
                        <p>Không thể tải thống kê</p>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => refetchStats()}
                            leftIcon={<RefreshCw size={14} />}
                        >
                            Thử lại
                        </Button>
                    </div>
                ) : isLoading ? (
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
                        {todosError ? (
                            <div className="error-state">
                                <AlertCircle size={32} />
                                <p>Không thể tải danh sách</p>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => refetchTodos()}
                                    leftIcon={<RefreshCw size={14} />}
                                >
                                    Thử lại
                                </Button>
                            </div>
                        ) : todosLoading ? (
                            <div className="loading-placeholder">Đang tải...</div>
                        ) : todos.length > 0 ? (
                            <ul className="todo-list">
                                {todos.map((todo) => {
                                    const Icon = getIcon(todo.icon);
                                    return (
                                        <li 
                                            key={todo.id} 
                                            className={`todo-item todo-priority-${todo.priority}`}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => navigate(todo.link)}
                                            onKeyDown={(e) => handleKeyDown(e, () => navigate(todo.link))}
                                            aria-label={`${todo.title}: ${todo.description}`}
                                        >
                                            <div className={`todo-icon todo-icon-${todo.type}`}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="todo-content">
                                                <span className="todo-title">{todo.title}</span>
                                                <span className="todo-description" title={todo.description}>
                                                    {todo.description}
                                                </span>
                                            </div>
                                            <ChevronRight size={16} className="todo-arrow" aria-hidden="true" />
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
                        {studentsError ? (
                            <div className="error-state">
                                <AlertCircle size={32} />
                                <p>Không thể tải danh sách</p>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => refetchStudents()}
                                    leftIcon={<RefreshCw size={14} />}
                                >
                                    Thử lại
                                </Button>
                            </div>
                        ) : studentsLoading ? (
                            <div className="loading-placeholder">Đang tải...</div>
                        ) : students.length > 0 ? (
                            <ul className="students-list">
                                {students.slice(0, 5).map((item) => (
                                    <li 
                                        key={item.id} 
                                        className="student-item"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => navigate(`/teacher/topics/${item.id}`)}
                                        onKeyDown={(e) => handleKeyDown(e, () => navigate(`/teacher/topics/${item.id}`))}
                                        aria-label={`${item.student?.full_name}: ${item.title}`}
                                    >
                                        <div className="student-avatar" aria-hidden="true">
                                            {item.student?.full_name?.[0] || 'S'}
                                        </div>
                                        <div className="student-info">
                                            <span className="student-name">{item.student?.full_name}</span>
                                            <span className="student-topic" title={item.title}>
                                                {item.title}
                                            </span>
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
