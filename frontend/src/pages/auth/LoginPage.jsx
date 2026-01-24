import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../components/layout/Logo';
import './auth.css';

// Google Icon Component (following Google branding guidelines - 4 colors)
const GoogleIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

// GitHub Icon Component
const GithubIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
);

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState({ google: false, github: false });

    const { signIn, signInWithGoogle, signInWithGithub } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    // Check for expired session message
    const isExpired = new URLSearchParams(location.search).get('expired') === 'true';

    // Handle social login
    const handleSocialLogin = async (provider) => {
        setSocialLoading(prev => ({ ...prev, [provider]: true }));
        setError('');
        
        try {
            if (provider === 'google') {
                await signInWithGoogle();
            } else if (provider === 'github') {
                await signInWithGithub();
            }
            // OAuth sẽ redirect, không cần xử lý thêm
        } catch (err) {
            const errorMessage = err.message || `Đăng nhập với ${provider} thất bại`;
            setError(errorMessage);
            toast.error(errorMessage);
            setSocialLoading(prev => ({ ...prev, [provider]: false }));
        }
    };

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

    const isAnySocialLoading = socialLoading.google || socialLoading.github;

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

                {/* Social Login Buttons - Primary action (easiest, 1-click) */}
                <div className="social-login-section">
                    <button
                        type="button"
                        className="social-btn social-btn-google"
                        onClick={() => handleSocialLogin('google')}
                        disabled={isAnySocialLoading || isLoading}
                        tabIndex={1}
                        aria-label="Tiếp tục với Google"
                    >
                        {socialLoading.google ? (
                            <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                        ) : (
                            <GoogleIcon size={20} />
                        )}
                        <span>Tiếp tục với Google</span>
                    </button>

                    <button
                        type="button"
                        className="social-btn social-btn-github"
                        onClick={() => handleSocialLogin('github')}
                        disabled={isAnySocialLoading || isLoading}
                        tabIndex={2}
                        aria-label="Tiếp tục với GitHub"
                    >
                        {socialLoading.github ? (
                            <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                        ) : (
                            <GithubIcon size={20} />
                        )}
                        <span>Tiếp tục với GitHub</span>
                    </button>
                </div>

                {/* Divider */}
                <div className="auth-divider">
                    <span>hoặc đăng nhập với email</span>
                </div>

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
                                tabIndex={3}
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
                                tabIndex={4}
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
                        <Link to="/reset-password" className="forgot-link" tabIndex={6}>
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <button 
                        type="submit" 
                        className="submit-btn" 
                        disabled={isLoading || isAnySocialLoading}
                        tabIndex={7}
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
