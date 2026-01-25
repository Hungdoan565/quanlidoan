import { useState } from 'react';
import { Shield, Eye, EyeOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store/authStore';
import { profileService } from '../../../services/profile.service';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

const PASSWORD_REQUIREMENTS = [
    { id: 'length', label: 'Ít nhất 8 ký tự', test: (p) => p.length >= 8 },
    { id: 'uppercase', label: 'Có chữ hoa', test: (p) => /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'Có chữ thường', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'Có số', test: (p) => /[0-9]/.test(p) },
];

export function SecurityTab() {
    const { user } = useAuthStore();

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Clear error when typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const getPasswordStrength = (password) => {
        if (!password) return { level: 'none', text: '' };
        
        const passedRequirements = PASSWORD_REQUIREMENTS.filter((req) =>
            req.test(password)
        ).length;

        if (passedRequirements <= 1) return { level: 'weak', text: 'Yếu' };
        if (passedRequirements <= 3) return { level: 'medium', text: 'Trung bình' };
        return { level: 'strong', text: 'Mạnh' };
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.currentPassword) {
            newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
        }

        if (!formData.newPassword) {
            newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
        } else if (formData.newPassword.length < 8) {
            newErrors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
        } else if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        }

        if (formData.currentPassword === formData.newPassword && formData.newPassword) {
            newErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            // Verify current password first
            await profileService.verifyCurrentPassword(user.email, formData.currentPassword);

            // Change password
            await profileService.changePassword(formData.newPassword);

            // Reset form
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });

            toast.success('Đã đổi mật khẩu thành công');
        } catch (error) {
            if (error.message.includes('hiện tại')) {
                setErrors({ currentPassword: error.message });
            } else {
                toast.error(error.message || 'Không thể đổi mật khẩu');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const passwordStrength = getPasswordStrength(formData.newPassword);

    return (
        <div>
            <Card className="profile-section-card">
                <div className="profile-section-header">
                    <div>
                        <h2 className="profile-section-title">Đổi mật khẩu</h2>
                        <p className="profile-section-description">
                            Đảm bảo tài khoản của bạn sử dụng mật khẩu mạnh và duy nhất
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="profile-form-grid">
                        {/* Current Password */}
                        <div className="full-width">
                            <Input
                                label="Mật khẩu hiện tại"
                                name="currentPassword"
                                type={showPasswords.current ? 'text' : 'password'}
                                value={formData.currentPassword}
                                onChange={handleInputChange}
                                error={errors.currentPassword}
                                required
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('current')}
                                        className="visibility-toggle-btn"
                                        tabIndex={-1}
                                        aria-label={showPasswords.current ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    >
                                        {showPasswords.current ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                    </button>
                                }
                            />
                        </div>

                        {/* New Password */}
                        <div className="full-width">
                            <Input
                                label="Mật khẩu mới"
                                name="newPassword"
                                type={showPasswords.new ? 'text' : 'password'}
                                value={formData.newPassword}
                                onChange={handleInputChange}
                                error={errors.newPassword}
                                required
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('new')}
                                        className="visibility-toggle-btn"
                                        tabIndex={-1}
                                        aria-label={showPasswords.new ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    >
                                        {showPasswords.new ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                    </button>
                                }
                            />

                            {/* Password Strength Indicator */}
                            {formData.newPassword && (
                                <div className="password-strength">
                                    <div className="password-strength-bar">
                                        <div className={`password-strength-fill ${passwordStrength.level}`} />
                                    </div>
                                    <span className="password-strength-text">
                                        Độ mạnh: {passwordStrength.text}
                                    </span>
                                </div>
                            )}

                            {/* Password Requirements */}
                            {formData.newPassword && (
                                <div className="password-requirements-list">
                                    {PASSWORD_REQUIREMENTS.map((req) => {
                                        const passed = req.test(formData.newPassword);
                                        return (
                                            <div
                                                key={req.id}
                                                className={`password-requirement-item ${passed ? 'valid' : ''}`}
                                            >
                                                {passed ? (
                                                    <Check size={14} aria-hidden="true" />
                                                ) : (
                                                    <X size={14} aria-hidden="true" />
                                                )}
                                                <span>{req.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="full-width">
                            <Input
                                label="Xác nhận mật khẩu mới"
                                name="confirmPassword"
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                error={errors.confirmPassword}
                                required
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('confirm')}
                                        className="visibility-toggle-btn"
                                        tabIndex={-1}
                                        aria-label={showPasswords.confirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    >
                                        {showPasswords.confirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                    </button>
                                }
                            />

                            {/* Match indicator */}
                            {formData.confirmPassword && formData.newPassword && (
                                <div className={`password-match-indicator ${formData.newPassword === formData.confirmPassword ? 'match' : 'mismatch'}`}>
                                    {formData.newPassword === formData.confirmPassword ? (
                                        <>
                                            <Check size={14} aria-hidden="true" />
                                            <span>Mật khẩu khớp</span>
                                        </>
                                    ) : (
                                        <>
                                            <X size={14} aria-hidden="true" />
                                            <span>Mật khẩu không khớp</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="profile-form-actions">
                        <Button
                            type="submit"
                            loading={isLoading}
                            leftIcon={<Shield size={16} aria-hidden="true" />}
                        >
                            Đổi mật khẩu
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

export default SecurityTab;
