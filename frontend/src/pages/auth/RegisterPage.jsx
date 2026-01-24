import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, User, Loader2, Eye, EyeOff, AlertCircle, Check, X, Hash } from 'lucide-react';
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

// Password strength checker - 4 levels
const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', level: 0 };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Yếu', level: 1, color: 'var(--danger-500)' };
    if (score <= 3) return { score, label: 'Trung bình', level: 2, color: 'var(--warning-500)' };
    if (score <= 4) return { score, label: 'Mạnh', level: 3, color: 'var(--success-400)' };
    return { score, label: 'Rất mạnh', level: 4, color: 'var(--success-600)' };
};

// Password requirements - simplified
const passwordRequirements = [
    { key: 'length', label: '8+ ký tự', test: (p) => p.length >= 8 },
    { key: 'mixed', label: 'Chữ hoa + thường', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
    { key: 'number', label: 'Có số', test: (p) => /[0-9]/.test(p) },
];

export function RegisterPage() {
    const [formData, setFormData] = useState({
        fullName: '',
        studentId: '',
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [socialLoading, setSocialLoading] = useState({ google: false, github: false });

    const { signUp, signInWithGoogle, signInWithGithub } = useAuthStore();
    const navigate = useNavigate();

    const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
    const allRequirementsMet = passwordRequirements.every(req => req.test(formData.password));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSocialLogin = async (provider) => {
        setSocialLoading(prev => ({ ...prev, [provider]: true }));
        setError('');
        
        try {
            if (provider === 'google') {
                await signInWithGoogle();
            } else if (provider === 'github') {
                await signInWithGithub();
            }
        } catch (err) {
            const errorMessage = err.message || `Đăng ký với ${provider} thất bại`;
            setError(errorMessage);
            toast.error(errorMessage);
            setSocialLoading(prev => ({ ...prev, [provider]: false }));
        }
    };

    const validateForm = () => {
        if (!formData.fullName.trim()) return 'Vui lòng nhập họ và tên';
        if (!formData.studentId.trim()) return 'Vui lòng nhập mã sinh viên';
        if (!/^\d{6,10}$/.test(formData.studentId)) return 'Mã sinh viên không hợp lệ (6-10 chữ số)';
        if (!formData.email.trim()) return 'Vui lòng nhập email';
        if (!allRequirementsMet) return 'Mật khẩu chưa đáp ứng yêu cầu';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const data = await signUp(
                formData.email,
                formData.password,
                formData.fullName,
                'student',
                formData.studentId
            );

            if (!data.session) {
                setIsSuccess(true);
                toast.success('Đăng ký thành công! Vui lòng kiểm tra email.');
            } else {
                const { role } = useAuthStore.getState();
                toast.success('Đăng ký thành công!');
                navigate(`/${role}/dashboard`);
            }
        } catch (err) {
            const errorMessage = err.message || 'Đăng ký thất bại. Vui lòng thử lại.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const isAnySocialLoading = socialLoading.google || socialLoading.github;

    // Success screen
    if (isSuccess) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo"><Logo size={64} aria-hidden="true" /></div>
                        <h1>Xác nhận Email</h1>
                        <p>Chúng tôi đã gửi link xác nhận đến</p>
                        <p className="email-highlight">{formData.email}</p>
                    </div>
                    <div className="success-message" role="status">
                        <p>Kiểm tra hộp thư (kể cả Spam) và click link xác nhận.</p>
                    </div>
                    <Link to="/login" className="submit-btn" tabIndex={1}>
                        Quay lại Đăng nhập
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card register-card">
                <div className="auth-header auth-header-compact">
                    <div className="auth-logo"><Logo size={48} aria-hidden="true" /></div>
                    <h1>Đăng ký tài khoản</h1>
                </div>

                {error && (
                    <div className="error-message" role="alert">
                        <AlertCircle size={16} aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Social Login - Horizontal on desktop */}
                <div className="social-login-row">
                    <button
                        type="button"
                        className="social-btn social-btn-google"
                        onClick={() => handleSocialLogin('google')}
                        disabled={isAnySocialLoading || isLoading}
                        tabIndex={1}
                        aria-label="Đăng ký với Google"
                    >
                        {socialLoading.google ? (
                            <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                        ) : (
                            <GoogleIcon size={18} aria-hidden="true" />
                        )}
                        <span>Google</span>
                    </button>

                    <button
                        type="button"
                        className="social-btn social-btn-github"
                        onClick={() => handleSocialLogin('github')}
                        disabled={isAnySocialLoading || isLoading}
                        tabIndex={2}
                        aria-label="Đăng ký với GitHub"
                    >
                        {socialLoading.github ? (
                            <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                        ) : (
                            <GithubIcon size={18} aria-hidden="true" />
                        )}
                        <span>GitHub</span>
                    </button>
                </div>

                <div className="auth-divider"><span>hoặc</span></div>

                <form onSubmit={handleSubmit} className="auth-form auth-form-compact">
                    {/* Row: Name + Student ID */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="fullName">Họ tên <span className="required">*</span></label>
                            <div className="input-wrapper">
                                <User className="input-icon" size={16} aria-hidden="true" />
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Nguyễn Văn A"
                                    required
                                    autoComplete="name"
                                    tabIndex={3}
                                />
                            </div>
                        </div>

                        <div className="form-group form-group-small">
                            <label htmlFor="studentId">MSSV <span className="required">*</span></label>
                            <div className="input-wrapper">
                                <Hash className="input-icon" size={16} aria-hidden="true" />
                                <input
                                    id="studentId"
                                    name="studentId"
                                    type="text"
                                    value={formData.studentId}
                                    onChange={handleChange}
                                    placeholder="21520001"
                                    required
                                    pattern="\d{6,10}"
                                    inputMode="numeric"
                                    tabIndex={4}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email">Email <span className="required">*</span></label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={16} aria-hidden="true" />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="email@dnc.edu.vn"
                                required
                                autoComplete="email"
                                tabIndex={5}
                            />
                        </div>
                    </div>

                    {/* Password with inline requirements */}
                    <div className="form-group">
                        <div className="label-row">
                            <label htmlFor="password">Mật khẩu <span className="required">*</span></label>
                            {/* Inline requirements - compact */}
                            {formData.password && !allRequirementsMet && (
                                <div className="inline-requirements">
                                    {passwordRequirements.map(req => (
                                        <span 
                                            key={req.key} 
                                            className={`req-tag ${req.test(formData.password) ? 'met' : ''}`}
                                        >
                                                                                        {req.test(formData.password) ? <Check size={10} aria-hidden="true" /> : <X size={10} aria-hidden="true" />}
                                            {req.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={16} aria-hidden="true" />
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handleChange}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                tabIndex={6}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                                                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            </button>
                        </div>

                        {/* Strength meter - compact */}
                        {formData.password && (
                            <div className="password-strength-compact">
                                <div className="strength-segments">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className={`strength-segment ${passwordStrength.level >= level ? 'active' : ''}`}
                                            style={{
                                                backgroundColor: passwordStrength.level >= level ? passwordStrength.color : undefined
                                            }}
                                        />
                                    ))}
                                </div>
                                <span className="strength-label-sm" style={{ color: passwordStrength.color }}>
                                    {passwordStrength.label}
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isLoading || isAnySocialLoading || !allRequirementsMet}
                        tabIndex={7}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                                Đang đăng ký...
                            </>
                        ) : (
                            'Đăng ký'
                        )}
                    </button>

                    <div className="auth-footer-links">
                        Đã có tài khoản? <Link to="/login" tabIndex={8}>Đăng nhập</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
