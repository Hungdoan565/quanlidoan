import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Lock, Loader2, AlertCircle, Eye, EyeOff, Check, X, CheckCircle } from 'lucide-react';
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

export function SetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [isValidToken, setIsValidToken] = useState(true);

    const { updatePassword } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const passwordStrength = getPasswordStrength(password);
    const passwordsMatch = password === confirmPassword && confirmPassword !== '';
    const allRequirementsMet = passwordRequirements.every(req => req.test(password));

    // Check for valid recovery session
    useEffect(() => {
        // Supabase handles the token verification automatically
        // The session will be set if the user clicked a valid recovery link
        const errorCode = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorCode) {
            setIsValidToken(false);
            setError(errorDescription || 'Link đã hết hạn hoặc không hợp lệ');
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!allRequirementsMet) {
            setError('Mật khẩu chưa đáp ứng đủ yêu cầu');
            return;
        }

        if (!passwordsMatch) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            await updatePassword(password);
            setIsSuccess(true);
            toast.success('Đặt mật khẩu mới thành công!');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            const errorMessage = err.message || 'Không thể đặt mật khẩu mới. Vui lòng thử lại.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Invalid token screen
    if (!isValidToken) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <AlertCircle size={64} color="var(--warning-500)" />
                        </div>
                        <h1>Link không hợp lệ</h1>
                        <p>{error || 'Link đã hết hạn hoặc đã được sử dụng.'}</p>
                    </div>
                    <div className="info-note" style={{ marginBottom: 'var(--space-4)' }}>
                        <AlertCircle size={16} />
                        <span>Vui lòng yêu cầu link mới để đặt lại mật khẩu.</span>
                    </div>
                    <Link to="/reset-password" className="submit-btn">
                        Yêu cầu link mới
                    </Link>
                    <div className="auth-footer-links">
                        <Link to="/login">Quay lại Đăng nhập</Link>
                    </div>
                </div>
            </div>
        );
    }

    // Success screen
    if (isSuccess) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <CheckCircle size={64} color="var(--success-500)" />
                        </div>
                        <h1>Thành công!</h1>
                        <p>Mật khẩu của bạn đã được cập nhật.</p>
                    </div>
                    <div className="success-message">
                        <p>Bạn sẽ được chuyển đến trang đăng nhập trong giây lát...</p>
                    </div>
                    <Link to="/login" className="submit-btn">
                        Đăng nhập ngay
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <Logo size={64} />
                    </div>
                    <h1>Đặt mật khẩu mới</h1>
                    <p>Nhập mật khẩu mới cho tài khoản của bạn</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Mật khẩu mới */}
                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu mới <span className="required">*</span></label>
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
                                autoFocus
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
                        {password && (
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
                        {password && (
                            <ul className="password-requirements">
                                {passwordRequirements.map(req => (
                                    <li key={req.key} className={req.test(password) ? 'met' : ''}>
                                        {req.test(password) ? (
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
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setError('');
                                }}
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
                        {confirmPassword && (
                            <div className={`password-match ${passwordsMatch ? 'match' : 'no-match'}`}>
                                {passwordsMatch ? (
                                    <><Check size={14} /> Mật khẩu khớp</>
                                ) : (
                                    <><X size={14} /> Mật khẩu không khớp</>
                                )}
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        className="submit-btn" 
                        disabled={isLoading || !allRequirementsMet || !passwordsMatch}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Đang cập nhật...
                            </>
                        ) : (
                            'Đặt mật khẩu mới'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
