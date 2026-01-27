import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    User,
    ChevronDown,
    Moon,
    Sun,
    Shield
} from 'lucide-react';
import {
    Avatar,
    Dropdown,
    DropdownTrigger,
    DropdownContent,
    DropdownItem,
    DropdownSeparator,
    DropdownLabel,
} from '../ui';
import { Logo } from './Logo';
import { NotificationDropdown } from './NotificationDropdown';
import './DashboardLayout.css';

// Navigation items per role
const navItems = {
    admin: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: BookOpen, label: 'Đợt đồ án', path: '/admin/sessions' },
        { icon: Users, label: 'Lớp học', path: '/admin/classes' },
        { icon: Users, label: 'Người dùng', path: '/admin/users' },
        { icon: Settings, label: 'Tiêu chí chấm', path: '/admin/grading-config' },
        { icon: Shield, label: 'Auth Logs', path: '/admin/auth-logs' },
        { icon: User, label: 'Hồ sơ', path: '/profile' },
    ],
    teacher: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
        { icon: Users, label: 'Sinh viên', path: '/teacher/mentees' },
        { icon: BookOpen, label: 'Đề tài mẫu', path: '/teacher/topics' },
        { icon: FileText, label: 'Duyệt đề tài', path: '/teacher/reviews' },
        { icon: BookOpen, label: 'Nhật ký SV', path: '/teacher/logbook' },
        { icon: FileText, label: 'Chấm điểm', path: '/teacher/grading' },
        { icon: User, label: 'Hồ sơ', path: '/profile' },
    ],
    student: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
        { icon: BookOpen, label: 'Đăng ký đề tài', path: '/student/register' },
        { icon: FileText, label: 'Đề tài của tôi', path: '/student/topic' },
        { icon: BookOpen, label: 'Nhật ký', path: '/student/logbook' },
        { icon: FileText, label: 'Nộp báo cáo', path: '/student/reports' },
        { icon: User, label: 'Hồ sơ', path: '/profile' },
    ],
};

// Role labels in Vietnamese
const roleLabels = {
    admin: 'Quản trị viên',
    teacher: 'Giảng viên',
    student: 'Sinh viên',
};

export function DashboardLayout({ role }) {
    const { profile, signOut, role: storeRole } = useAuthStore();
    const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore();
    const navigate = useNavigate();
    const resolvedRole = role || storeRole || profile?.role;
    const items = navItems[resolvedRole] || [];
    const roleLabel = roleLabels[resolvedRole] || roleLabels[profile?.role] || resolvedRole || profile?.role;

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="dashboard-layout">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={toggleSidebar} />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <Logo size={32} />
                        <span className="logo-text">QL Đồ án</span>
                    </div>
                    <button
                        className="close-btn"
                        onClick={toggleSidebar}
                        aria-label="Đóng thanh bên"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {items.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'active' : ''}`
                            }
                            onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item logout" onClick={handleSignOut}>
                        <LogOut size={20} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-wrapper">
                {/* Header */}
                <header className="header">
                    <div className="header-left">
                        <button
                            className="menu-btn"
                            onClick={toggleSidebar}
                            aria-label={sidebarOpen ? 'Đóng thanh bên' : 'Mở thanh bên'}
                        >
                            <Menu size={24} />
                        </button>
                    </div>

                    <div className="header-right">
                        {/* Theme Toggle */}
                        <button
                            className="header-icon-btn"
                            onClick={toggleTheme}
                            title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
                            aria-label={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'}
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>

                        {/* Notifications */}
                        <NotificationDropdown />

                        {/* User Menu */}
                        <Dropdown align="end">
                            <DropdownTrigger>
                                <div className="user-menu-trigger">
                                    <Avatar
                                        src={profile?.avatar_url}
                                        name={profile?.full_name}
                                        size="sm"
                                    />
                                    <div className="user-info">
                                        <span className="user-name">{profile?.full_name || 'User'}</span>
                                        <span className="user-role">
                                            {roleLabel}
                                            {profile?.student_code && ` • ${profile.student_code}`}
                                            {profile?.teacher_code && ` • ${profile.teacher_code}`}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} className="user-chevron" />
                                </div>
                            </DropdownTrigger>
                            <DropdownContent minWidth={220}>
                                <DropdownLabel>Tài khoản</DropdownLabel>
                                <DropdownItem
                                    icon={User}
                                    onClick={() => navigate('/profile')}
                                >
                                    Thông tin cá nhân
                                </DropdownItem>
                                <DropdownItem
                                    icon={Settings}
                                    onClick={() => navigate('/settings')}
                                >
                                    Cài đặt
                                </DropdownItem>
                                <DropdownSeparator />
                                <DropdownItem
                                    icon={LogOut}
                                    variant="danger"
                                    onClick={handleSignOut}
                                >
                                    Đăng xuất
                                </DropdownItem>
                            </DropdownContent>
                        </Dropdown>
                    </div>
                </header>

                {/* Page Content */}
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
