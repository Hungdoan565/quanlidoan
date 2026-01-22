import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import './auth.css';

/**
 * AuthCallback - Xử lý các callback từ Supabase Auth
 * 
 * Các trường hợp:
 * 1. Email confirmation sau đăng ký
 * 2. Password recovery link
 * 3. OAuth callback (nếu có)
 */
export function AuthCallback() {
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setUser } = useAuthStore();

    useEffect(() => {
        handleAuthCallback();
    }, []);

    const handleAuthCallback = async () => {
        try {
            // Get the hash fragment from URL (Supabase puts tokens there)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');
            const error = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            // Handle error from Supabase
            if (error) {
                setStatus('error');
                setMessage(errorDescription || 'Đã xảy ra lỗi. Vui lòng thử lại.');
                toast.error(errorDescription || 'Đã xảy ra lỗi');
                return;
            }

            // Handle password recovery
            if (type === 'recovery') {
                // Redirect to set password page
                navigate('/set-password', { replace: true });
                return;
            }

            // Handle email confirmation
            if (type === 'signup' || type === 'email_change' || type === 'magiclink') {
                if (accessToken && refreshToken) {
                    // Set the session
                    const { data, error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) throw sessionError;

                    if (data.user) {
                        // Wait for profile to be loaded (setUser fetches profile)
                        await setUser(data.user);

                        // Get role from store (which now has the profile role)
                        const { role } = useAuthStore.getState();

                        setStatus('success');
                        setMessage('Email đã được xác nhận thành công!');
                        toast.success('Email đã được xác nhận thành công!');

                        // Redirect based on role from profile
                        setTimeout(() => {
                            navigate(`/${role}/dashboard`, { replace: true });
                        }, 2000);
                        return;
                    }
                }
            }

            // If we have tokens but no specific type, try to set session
            if (accessToken && refreshToken) {
                const { data, error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (sessionError) throw sessionError;

                if (data.user) {
                    // Wait for profile to be loaded
                    await setUser(data.user);

                    // Get role from store
                    const { role } = useAuthStore.getState();

                    setStatus('success');
                    setMessage('Đăng nhập thành công!');

                    setTimeout(() => {
                        navigate(`/${role}/dashboard`, { replace: true });
                    }, 1500);
                    return;
                }
            }

            // No tokens found, might be a regular page visit
            // Check if user is already logged in
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Set user and wait for profile load
                await setUser(session.user);
                const { role } = useAuthStore.getState();
                navigate(`/${role}/dashboard`, { replace: true });
                return;
            }

            // No session, redirect to login
            navigate('/login', { replace: true });

        } catch (err) {
            console.error('Auth callback error:', err);
            setStatus('error');
            setMessage(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
            toast.error('Đã xảy ra lỗi xác thực');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ textAlign: 'center' }}>
                {status === 'loading' && (
                    <>
                        <Loader2
                            size={48}
                            className="animate-spin"
                            style={{ margin: '0 auto var(--space-4)', color: 'var(--primary-600)' }}
                        />
                        <h1 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
                            Đang xử lý...
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Vui lòng đợi trong giây lát
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle
                            size={64}
                            style={{ margin: '0 auto var(--space-4)', color: 'var(--success-500)' }}
                        />
                        <h1 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
                            Thành công!
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {message}
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-4)' }}>
                            Đang chuyển hướng...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle
                            size={64}
                            style={{ margin: '0 auto var(--space-4)', color: 'var(--danger-500)' }}
                        />
                        <h1 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
                            Đã xảy ra lỗi
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                            {message}
                        </p>
                        <button
                            className="submit-btn"
                            onClick={() => navigate('/login')}
                        >
                            Quay lại Đăng nhập
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
