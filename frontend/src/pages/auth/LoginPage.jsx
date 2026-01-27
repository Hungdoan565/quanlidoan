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
                        <Logo size={64} aria-hidden="true" />
                    </div>
                    <h1>Hệ thống Quản lý Đồ án</h1>
                    <p>Đăng nhập để tiếp tục</p>
                </div>

                {/* Session expired notice */}
                {isExpired && (
                    <div className="info-note" role="alert">
                        <AlertCircle size={16} aria-hidden="true" />
                        <span>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</span>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="error-message" role="alert">
                        <AlertCircle size={16} aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={18} aria-hidden="true" />
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
                                tabIndex={1}
                                aria-describedby={error ? 'login-error' : undefined}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={18} aria-hidden="true" />
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
                                tabIndex={2}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                tabIndex={5}
                            />
                            <span>Ghi nhớ đăng nhập</span>
                        </label>
                        <Link to="/reset-password" className="forgot-link" tabIndex={4}>
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <button 
                        type="submit" 
                        className="submit-btn" 
                        disabled={isLoading}
                        tabIndex={5}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                                Đang đăng nhập...
                            </>
                        ) : (
                            'Đăng nhập'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Chưa có tài khoản?{' '}
                        <Link to="/register" tabIndex={8}>Đăng ký ngay</Link>
                    </p>
                    <p className="auth-copyright">
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
