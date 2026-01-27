import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, User, Loader2, Eye, EyeOff, AlertCircle, Check, X, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../components/layout/Logo';
import './auth.css';

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

    const { signUp } = useAuthStore();
    const navigate = useNavigate();

    const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);
    const allRequirementsMet = passwordRequirements.every(req => req.test(formData.password));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
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
                                    tabIndex={1}
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
                                    tabIndex={2}
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
                                tabIndex={3}
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
                                tabIndex={4}
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
                        disabled={isLoading || !allRequirementsMet}
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
