import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../components/layout/Logo';
import './auth.css';

export function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const { resetPassword } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email.trim()) {
            setError('Vui lòng nhập email');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            await resetPassword(email);
            setIsSuccess(true);
            toast.success('Đã gửi email khôi phục mật khẩu!');
        } catch (err) {
            const errorMessage = err.message || 'Không thể gửi email. Vui lòng thử lại.';
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
                        <div className="auth-logo">
                            <CheckCircle size={64} color="var(--success-500)" />
                        </div>
                        <h1>Kiểm tra Email</h1>
                        <p>Chúng tôi đã gửi link khôi phục mật khẩu đến</p>
                        <p className="email-highlight">{email}</p>
                    </div>
                    <div className="success-message">
                        <p>Vui lòng kiểm tra hộp thư (bao gồm thư mục Spam) và click vào link để đặt lại mật khẩu mới.</p>
                        <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                            Link sẽ hết hạn sau 1 giờ.
                        </p>
                    </div>
                    <Link to="/login" className="submit-btn">
                        <ArrowLeft size={18} />
                        Quay lại Đăng nhập
                    </Link>
                    <div className="auth-footer-links">
                        Không nhận được email?{' '}
                        <button 
                            type="button"
                            onClick={() => setIsSuccess(false)}
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--primary-600)',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Gửi lại
                        </button>
                    </div>
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
                    <h1>Quên mật khẩu?</h1>
                    <p>Nhập email của bạn để nhận link khôi phục mật khẩu</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
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
                                autoFocus
                            />
                        </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Đang gửi...
                            </>
                        ) : (
                            'Gửi link khôi phục'
                        )}
                    </button>

                    <div className="auth-footer-links">
                        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ArrowLeft size={14} />
                            Quay lại Đăng nhập
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
