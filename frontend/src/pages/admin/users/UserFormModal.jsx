import { useState } from 'react';
import { UserPlus, Mail, User, Phone, GraduationCap, UserCheck, Shield, Building, Key } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { Modal, Button, Input, CustomSelect, Badge } from '../../../components/ui';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
    { value: 'student', label: 'Sinh viên' },
    { value: 'teacher', label: 'Giảng viên' },
    { value: 'admin', label: 'Quản trị viên' },
];

const ROLE_ICONS = {
    admin: Shield,
    teacher: UserCheck,
    student: GraduationCap,
};

// Academic rank options (optional - teacher may not have higher degrees)
const ACADEMIC_RANK_OPTIONS = [
    { value: '', label: 'Chọn học hàm/học vị (không bắt buộc)' },
    { value: 'Cử nhân', label: 'Cử nhân' },
    { value: 'Thạc sĩ', label: 'Thạc sĩ (ThS)' },
    { value: 'Tiến sĩ', label: 'Tiến sĩ (TS)' },
    { value: 'Phó Giáo sư', label: 'Phó Giáo sư (PGS)' },
    { value: 'Giáo sư', label: 'Giáo sư (GS)' },
];

// Common departments in Vietnamese universities
const DEPARTMENT_OPTIONS = [
    { value: '', label: 'Chọn khoa/bộ môn' },
    { value: 'Công nghệ thông tin', label: 'Công nghệ thông tin' },
    { value: 'Điện - Điện tử', label: 'Điện - Điện tử' },
    { value: 'Cơ khí', label: 'Cơ khí' },
    { value: 'Kinh tế', label: 'Kinh tế' },
    { value: 'Ngoại ngữ', label: 'Ngoại ngữ' },
    { value: 'Khoa học cơ bản', label: 'Khoa học cơ bản' },
    { value: 'Khác', label: 'Khác' },
];

// Generate random password
const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const symbols = '!@#$%';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    password += Math.floor(Math.random() * 10);
    return password;
};

export function UserFormModal({ isOpen, onClose, onSuccess }) {
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'student',
        phone: '',
        student_code: '',
        teacher_code: '',
        department: '',
        academic_rank: '',
    });
    const [errors, setErrors] = useState({});

    // Auto-generate teacher code when role changes to teacher
    const handleRoleChange = async (e) => {
        const newRole = e.target.value;
        setFormData(prev => ({ ...prev, role: newRole }));

        if (newRole === 'teacher' && !formData.teacher_code) {
            // Auto-generate teacher code
            try {
                const { count } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'teacher');

                const nextCode = `GV${String((count || 0) + 1).padStart(3, '0')}`;
                setFormData(prev => ({ ...prev, teacher_code: nextCode }));
            } catch (error) {
                console.warn('Could not auto-generate teacher code:', error);
            }
        }
    };

    // Generate and set password
    const handleGeneratePassword = () => {
        const newPassword = generatePassword();
        setFormData(prev => ({ ...prev, password: newPassword }));
        setShowGeneratedPassword(true);
    };

    // Copy password to clipboard
    const handleCopyPassword = () => {
        navigator.clipboard.writeText(formData.password);
        toast.success('Đã sao chép mật khẩu');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        // Hide generated password display when manually editing
        if (name === 'password') {
            setShowGeneratedPassword(false);
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email là bắt buộc';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email không hợp lệ';
        }

        if (!formData.password) {
            newErrors.password = 'Mật khẩu là bắt buộc';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        }

        if (!formData.full_name.trim()) {
            newErrors.full_name = 'Họ tên là bắt buộc';
        }

        if (formData.role === 'student' && !formData.student_code.trim()) {
            newErrors.student_code = 'MSSV là bắt buộc với sinh viên';
        }

        if (formData.role === 'teacher' && !formData.teacher_code.trim()) {
            newErrors.teacher_code = 'Mã GV là bắt buộc với giảng viên';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);

        try {
            // ⚠️ IMPORTANT: Store current admin session before signUp
            // signUp() may replace the current session with the new user's session
            const { data: { session: adminSession } } = await supabase.auth.getSession();

            if (!adminSession) {
                throw new Error('Admin session not found. Please re-login.');
            }

            // 🔒 Set flag to prevent onAuthStateChange from processing signUp events
            useAuthStore.setState({ isCreatingUser: true });

            // Create user via Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                        role: formData.role,
                        student_id: formData.student_code || null,
                        teacher_code: formData.teacher_code || null,
                    },
                    // Don't require email confirmation for admin-created accounts
                    emailRedirectTo: undefined,
                },
            });

            if (error) throw error;

            // ⚠️ CRITICAL: Restore admin session immediately after signUp
            // This prevents admin from being logged out or switched to new user
            const { error: restoreError } = await supabase.auth.setSession({
                access_token: adminSession.access_token,
                refresh_token: adminSession.refresh_token,
            });

            // 🔓 Clear flag after session restored
            useAuthStore.setState({ isCreatingUser: false });

            if (restoreError) {
                console.warn('Session restore warning:', restoreError);
                // Non-fatal, continue with flow
            }

            // Wait for trigger to create profile
            await new Promise(r => setTimeout(r, 500));

            // Update additional profile fields if needed
            if (data.user && (formData.phone || formData.department || formData.academic_rank)) {
                const updateData = {};
                if (formData.phone) updateData.phone = formData.phone;
                if (formData.department) updateData.department = formData.department;
                if (formData.academic_rank) updateData.academic_rank = formData.academic_rank;

                await supabase
                    .from('profiles')
                    .update(updateData)
                    .eq('id', data.user.id);
            }

            toast.success(`Đã tạo tài khoản ${formData.full_name} thành công!`);

            // Invalidate relevant caches based on role
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            if (formData.role === 'teacher') {
                queryClient.invalidateQueries({ queryKey: ['teachers'] });
            }
            if (formData.role === 'student') {
                queryClient.invalidateQueries({ queryKey: ['students'] });
                queryClient.invalidateQueries({ queryKey: ['available-students'] });
            }

            // Reset form
            setFormData({
                email: '',
                password: '',
                full_name: '',
                role: 'student',
                phone: '',
                student_code: '',
                teacher_code: '',
                department: '',
                academic_rank: '',
            });

            onSuccess?.();
            onClose();
        } catch (error) {
            // Clear flag on error too
            useAuthStore.setState({ isCreatingUser: false });

            console.error('Create user error:', error);
            if (error.message.includes('already registered')) {
                setErrors({ email: 'Email này đã được sử dụng' });
            } else {
                toast.error(error.message || 'Không thể tạo tài khoản');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            full_name: '',
            role: 'student',
            phone: '',
            student_code: '',
            teacher_code: '',
            department: '',
            academic_rank: '',
        });
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const RoleIcon = ROLE_ICONS[formData.role] || User;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Thêm người dùng mới"
            size="md"
        >
            <form onSubmit={handleSubmit} className="user-form">
                {/* Role Selection */}
                <div className="form-group">
                    <label>Vai trò *</label>
                    <CustomSelect
                        name="role"
                        options={ROLE_OPTIONS}
                        value={formData.role}
                        onChange={handleRoleChange}
                    />
                    <div className="role-preview">
                        <Badge variant={formData.role === 'admin' ? 'danger' : formData.role === 'teacher' ? 'primary' : 'success'}>
                            <RoleIcon size={12} aria-hidden="true" />
                            {ROLE_OPTIONS.find(r => r.value === formData.role)?.label}
                        </Badge>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="form-row">
                    <div className="form-group">
                        <label>Họ và tên *</label>
                        <Input
                            name="full_name"
                            leftIcon={<User size={16} aria-hidden="true" />}
                            placeholder="Nguyễn Văn A"
                            value={formData.full_name}
                            onChange={handleChange}
                            error={errors.full_name}
                        />
                        {errors.full_name && <span className="error-text">{errors.full_name}</span>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Email *</label>
                        <Input
                            name="email"
                            type="email"
                            leftIcon={<Mail size={16} aria-hidden="true" />}
                            placeholder="email@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label>
                            Mật khẩu *
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleGeneratePassword}
                                style={{ marginLeft: '8px', fontSize: '12px' }}
                            >
                                Tự tạo
                            </Button>
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Input
                                name="password"
                                type={showGeneratedPassword ? 'text' : 'password'}
                                leftIcon={<Key size={16} aria-hidden="true" />}
                                placeholder="Tối thiểu 6 ký tự"
                                value={formData.password}
                                onChange={handleChange}
                                error={errors.password}
                                style={{ flex: 1 }}
                            />
                            {showGeneratedPassword && formData.password && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopyPassword}
                                >
                                    Sao chép
                                </Button>
                            )}
                        </div>
                        {showGeneratedPassword && formData.password && (
                            <span style={{ fontSize: '12px', color: 'var(--success-600)', marginTop: '4px', display: 'block' }}>
                                Mật khẩu: <strong>{formData.password}</strong> (hãy sao chép trước khi tạo!)
                            </span>
                        )}
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Số điện thoại</label>
                        <Input
                            name="phone"
                            leftIcon={<Phone size={16} aria-hidden="true" />}
                            placeholder="0901234567"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Role-specific fields */}
                {formData.role === 'student' && (
                    <div className="form-group">
                        <label>MSSV *</label>
                        <Input
                            name="student_code"
                            leftIcon={<GraduationCap size={16} aria-hidden="true" />}
                            placeholder="VD: 20110001"
                            value={formData.student_code}
                            onChange={handleChange}
                            error={errors.student_code}
                        />
                        {errors.student_code && <span className="error-text">{errors.student_code}</span>}
                    </div>
                )}

                {formData.role === 'teacher' && (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label>
                                    Mã giảng viên *
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                        (Tự tạo)
                                    </span>
                                </label>
                                <Input
                                    name="teacher_code"
                                    leftIcon={<UserCheck size={16} aria-hidden="true" />}
                                    placeholder="VD: GV001"
                                    value={formData.teacher_code}
                                    onChange={handleChange}
                                    error={errors.teacher_code}
                                />
                                {errors.teacher_code && <span className="error-text">{errors.teacher_code}</span>}
                            </div>
                            <div className="form-group">
                                <label>Học hàm/Học vị</label>
                                <CustomSelect
                                    name="academic_rank"
                                    options={ACADEMIC_RANK_OPTIONS}
                                    value={formData.academic_rank}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Khoa/Bộ môn</label>
                            <CustomSelect
                                name="department"
                                options={DEPARTMENT_OPTIONS}
                                value={formData.department}
                                onChange={handleChange}
                            />
                        </div>
                    </>
                )}

                {/* Actions */}
                <div className="form-actions">
                    <Button type="button" variant="ghost" onClick={handleClose}>
                        Hủy
                    </Button>
                    <Button type="submit" loading={isLoading}>
                        <UserPlus size={16} aria-hidden="true" />
                        Tạo tài khoản
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
