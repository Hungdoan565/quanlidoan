import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, User, Loader2, Eye, EyeOff, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../components/layout/Logo';
import './auth.css';

// Password strength checker
const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Yếu', color: 'var(--danger-500)' };
    if (score <= 4) return { score: 2, label: 'Trung bình', color: 'var(--warning-500)' };
    return { score: 3, label: 'Mạnh', color: 'var(--success-500)' };
};

// Password requirements
const passwordRequirements = [
    { key: 'length', label: 'Ít nhất 8 ký tự', test: (p) => p.length >= 8 },
    { key: 'lowercase', label: 'Có chữ thường (a-z)', test: (p) => /[a-z]/.test(p) },
    { key: 'uppercase', label: 'Có chữ hoa (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { key: 'number', label: 'Có số (0-9)', test: (p) => /[0-9]/.test(p) },
];

export function RegisterPage() {
    const [formData, setFormData] = useState({
        fullName: '',
        studentId: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const { signUp } = useAuthStore();
    const navigate = useNavigate();

    const passwordStrength = getPasswordStrength(formData.password);
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';
    const allRequirementsMet = passwordRequirements.every(req => req.test(formData.password));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.fullName.trim()) {
            return 'Vui lòng nhập họ và tên';
        }
        if (!formData.studentId.trim()) {
            return 'Vui lòng nhập mã sinh viên';
        }
        if (!/^\d{6,10}$/.test(formData.studentId)) {
            return 'Mã sinh viên không hợp lệ (6-10 chữ số)';
        }
        if (!formData.email.trim()) {
            return 'Vui lòng nhập email';
        }
        if (!allRequirementsMet) {
            return 'Mật khẩu chưa đáp ứng đủ yêu cầu';
        }
        if (!passwordsMatch) {
            return 'Mật khẩu xác nhận không khớp';
        }
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
            // Role mặc định là 'student' - không cho user chọn
            const data = await signUp(
                formData.email,
                formData.password,
                formData.fullName,
                'student',
                formData.studentId
            );

            // Nếu không có session tức là cần check email (confirm email is ON)
            if (!data.session) {
                setIsSuccess(true);
                toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.');
            } else {
                // Đã đăng nhập luôn (confirm email is OFF)
                // signUp already calls setUser which fetches profile
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

    // Success screen - email confirmation required
    if (isSuccess) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <Logo size={64} />
                        </div>
                        <h1>Xác nhận Email</h1>
                        <p>Chúng tôi đã gửi link xác nhận đến</p>
                        <p className="email-highlight">{formData.email}</p>
                    </div>
                    <div className="success-message">
                        <p>Vui lòng kiểm tra hộp thư (bao gồm thư mục Spam) và click vào link xác nhận để hoàn tất đăng ký.</p>
                    </div>
                    <Link to="/login" className="submit-btn">
                        Quay lại Đăng nhập
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card register-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <Logo size={56} />
                    </div>
                    <h1>Đăng ký tài khoản</h1>
                    <p>Tạo tài khoản sinh viên để tham gia hệ thống</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Họ và tên */}
                    <div className="form-group">
                        <label htmlFor="fullName">Họ và Tên <span className="required">*</span></label>
                        <div className="input-wrapper">
                            <User className="input-icon" size={18} />
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Nguyễn Văn A"
                                required
                            />
                        </div>
                    </div>

                    {/* Mã sinh viên */}
                    <div className="form-group">
                        <label htmlFor="studentId">Mã sinh viên <span className="required">*</span></label>
                        <div className="input-wrapper">
                            <span className="input-icon text-icon">ID</span>
                            <input
                                id="studentId"
                                name="studentId"
                                type="text"
                                value={formData.studentId}
                                onChange={handleChange}
                                placeholder="21520001"
                                required
                                pattern="\d{6,10}"
                                title="Mã sinh viên gồm 6-10 chữ số"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email">Email <span className="required">*</span></label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={18} />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="21520001@dnc.edu.vn"
                                required
                            />
                        </div>
                    </div>

                    {/* Mật khẩu */}
                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu <span className="required">*</span></label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
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

                        {/* Password strength indicator */}
                        {formData.password && (
                            <div className="password-strength">
                                <div className="strength-bar">
                                    <div
                                        className="strength-fill"
                                        style={{
                                            width: `${(passwordStrength.score / 3) * 100}%`,
                                            backgroundColor: passwordStrength.color
                                        }}
                                    />
                                </div>
                                <span className="strength-label" style={{ color: passwordStrength.color }}>
                                    {passwordStrength.label}
                                </span>
                            </div>
                        )}

                        {/* Password requirements */}
                        {formData.password && (
                            <ul className="password-requirements">
                                {passwordRequirements.map(req => (
                                    <li key={req.key} className={req.test(formData.password) ? 'met' : ''}>
                                        {req.test(formData.password) ? (
                                            <Check size={14} />
                                        ) : (
                                            <X size={14} />
                                        )}
                                        <span>{req.label}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Xác nhận mật khẩu */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Xác nhận mật khẩu <span className="required">*</span></label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {formData.confirmPassword && (
                            <div className={`password-match ${passwordsMatch ? 'match' : 'no-match'}`}>
                                {passwordsMatch ? (
                                    <><Check size={14} /> Mật khẩu khớp</>
                                ) : (
                                    <><X size={14} /> Mật khẩu không khớp</>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Info note */}
                    <div className="info-note">
                        <AlertCircle size={16} />
                        <span>Tài khoản Giảng viên và Admin được cấp bởi Giáo vụ khoa.</span>
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isLoading || !allRequirementsMet || !passwordsMatch}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Đang đăng ký...
                            </>
                        ) : (
                            'Đăng ký tài khoản'
                        )}
                    </button>

                    <div className="auth-footer-links">
                        Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
