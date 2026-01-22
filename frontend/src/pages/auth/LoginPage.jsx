import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../components/layout/Logo';
import './auth.css';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { signIn } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    // Check for expired session message
    const isExpired = new URLSearchParams(location.search).get('expired') === 'true';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { role } = await signIn(email, password, rememberMe);
            toast.success('Đăng nhập thành công!');
            
            // Redirect based on role or previous location
            if (from !== '/' && from !== '/login') {
                navigate(from, { replace: true });
            } else {
                const dashboardPath = getDashboardPath(role);
                navigate(dashboardPath, { replace: true });
            }
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <Logo size={64} />
                    </div>
                    <h1>Hệ thống Quản lý Đồ án</h1>
                    <p>Đăng nhập để tiếp tục</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {isExpired && (
                        <div className="info-note">
                            <AlertCircle size={16} />
                            <span>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</span>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={18} />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError('');
                                }}
                                placeholder="21520001@dnc.edu.vn"
                                required
                                autoComplete="email"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                }}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span>Ghi nhớ đăng nhập</span>
                        </label>
                        <Link to="/reset-password" className="forgot-link">
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <button type="submit" className="submit-btn" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Đang đăng nhập...
                            </>
                        ) : (
                            'Đăng nhập'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p style={{ marginBottom: 'var(--space-3)' }}>
                        Chưa có tài khoản?{' '}
                        <Link to="/register">Đăng ký ngay</Link>
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                        © {new Date().getFullYear()} DNC University - Phiên bản 1.0
                    </p>
                </div>
            </div>
        </div>
    );
}

// Helper: Get dashboard path based on role
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

// Helper: Get user-friendly error message
function getErrorMessage(error) {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
        return 'Email hoặc mật khẩu không đúng';
    }
    if (message.includes('email not confirmed')) {
        return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.';
    }
    if (message.includes('user not found')) {
        return 'Tài khoản không tồn tại';
    }
    if (message.includes('too many requests') || message.includes('rate limit')) {
        return 'Quá nhiều lần thử. Vui lòng đợi và thử lại sau.';
    }
    if (message.includes('network') || message.includes('fetch')) {
        return 'Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.';
    }
    
    return error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
}
