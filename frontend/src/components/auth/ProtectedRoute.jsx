import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * ProtectedRoute - Bảo vệ routes yêu cầu đăng nhập
 * @param {string[]} allowedRoles - Danh sách roles được phép truy cập
 */
export function ProtectedRoute({ children, allowedRoles = [] }) {
    const { isAuthenticated, isLoading, role } = useAuthStore();
    const location = useLocation();

    // Đang load auth state
    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p>Đang tải...</p>
            </div>
        );
    }

    // Chưa đăng nhập -> redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Kiểm tra role (nếu có yêu cầu)
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return <Navigate to="/403" replace />;
    }

    return children;
}

/**
 * PublicRoute - Routes chỉ dành cho người chưa đăng nhập
 */
export function PublicRoute({ children }) {
    const { isAuthenticated, isLoading, role } = useAuthStore();

    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    // Đã đăng nhập -> redirect to dashboard theo role
    if (isAuthenticated) {
        const dashboardPath = getDashboardPath(role);
        return <Navigate to={dashboardPath} replace />;
    }

    return children;
}

/**
 * Lấy đường dẫn dashboard theo role
 */
function getDashboardPath(role) {
    switch (role) {
        case 'admin':
            return '/admin/dashboard';
        case 'teacher':
            return '/teacher/dashboard';
        case 'student':
        default:
            return '/student/dashboard';
    }
}
