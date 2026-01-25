import { useState } from 'react';
import { Save, X, GraduationCap, Briefcase, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store/authStore';
import { profileService } from '../../../services/profile.service';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

const ROLE_CONFIG = {
    student: {
        label: 'Sinh viên',
        icon: GraduationCap,
        variant: 'primary',
        fields: ['student_code', 'class_name'],
    },
    teacher: {
        label: 'Giảng viên',
        icon: Briefcase,
        variant: 'success',
        fields: ['teacher_code', 'department', 'academic_rank'],
    },
    admin: {
        label: 'Quản trị viên',
        icon: Building2,
        variant: 'warning',
        fields: ['department'],
    },
};

export function AcademicInfoTab() {
    const { user, profile, role, setProfile } = useAuthStore();

    const [formData, setFormData] = useState({
        student_code: profile?.student_code || '',
        class_name: profile?.class_name || '',
        teacher_code: profile?.teacher_code || '',
        department: profile?.department || '',
        academic_rank: profile?.academic_rank || '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.student;
    const RoleIcon = roleConfig.icon;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setHasChanges(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Build update object based on role
        const updates = {};
        roleConfig.fields.forEach((field) => {
            updates[field] = formData[field]?.trim() || null;
        });

        setIsLoading(true);
        try {
            const updatedProfile = await profileService.updateProfile(user.id, updates);
            setProfile(updatedProfile);
            setHasChanges(false);
            toast.success('Đã cập nhật thông tin');
        } catch (error) {
            toast.error(error.message || 'Không thể cập nhật thông tin');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            student_code: profile?.student_code || '',
            class_name: profile?.class_name || '',
            teacher_code: profile?.teacher_code || '',
            department: profile?.department || '',
            academic_rank: profile?.academic_rank || '',
        });
        setHasChanges(false);
    };

    return (
        <div>
            {/* Role Badge */}
            <Card className="profile-section-card">
                <div className="profile-section-header">
                    <div>
                        <h2 className="profile-section-title">Vai trò trong hệ thống</h2>
                        <p className="profile-section-description">
                            Vai trò của bạn xác định quyền truy cập và tính năng có thể sử dụng
                        </p>
                    </div>
                </div>

                <div className="role-badge-large">
                    <RoleIcon size={32} aria-hidden="true" />
                    <span>{roleConfig.label}</span>
                </div>
            </Card>

            {/* Role-specific Info Form */}
            <form onSubmit={handleSubmit}>
                <Card className="profile-section-card">
                    <div className="profile-section-header">
                        <div>
                            <h2 className="profile-section-title">
                                {role === 'student' ? 'Thông tin sinh viên' : 
                                 role === 'teacher' ? 'Thông tin giảng viên' : 
                                 'Thông tin công việc'}
                            </h2>
                            <p className="profile-section-description">
                                {role === 'student' 
                                    ? 'Thông tin học vụ của bạn'
                                    : 'Thông tin công tác của bạn'}
                            </p>
                        </div>
                    </div>

                    <div className="profile-form-grid">
                        {/* Student Fields */}
                        {role === 'student' && (
                            <>
                                <Input
                                    label="Mã số sinh viên (MSSV)"
                                    name="student_code"
                                    value={formData.student_code}
                                    onChange={handleInputChange}
                                    placeholder="VD: 21110123…"
                                    hint="Mã số sinh viên của bạn"
                                />

                                <Input
                                    label="Lớp"
                                    name="class_name"
                                    value={formData.class_name}
                                    onChange={handleInputChange}
                                    placeholder="VD: DH21TIN01…"
                                    hint="Lớp sinh hoạt của bạn"
                                />
                            </>
                        )}

                        {/* Teacher Fields */}
                        {role === 'teacher' && (
                            <>
                                <Input
                                    label="Mã giảng viên"
                                    name="teacher_code"
                                    value={formData.teacher_code}
                                    onChange={handleInputChange}
                                    placeholder="VD: GV001…"
                                    hint="Mã nhân viên của bạn"
                                />

                                <Input
                                    label="Khoa / Bộ môn"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    placeholder="VD: Khoa Công nghệ thông tin…"
                                />

                                <Input
                                    label="Học vị / Học hàm"
                                    name="academic_rank"
                                    value={formData.academic_rank}
                                    onChange={handleInputChange}
                                    placeholder="VD: ThS, TS, PGS.TS…"
                                    hint="Học vị cao nhất của bạn"
                                />
                            </>
                        )}

                        {/* Admin Fields */}
                        {role === 'admin' && (
                            <div className="full-width">
                                <Input
                                    label="Phòng ban"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    placeholder="VD: Phòng Đào tạo…"
                                />
                            </div>
                        )}
                    </div>

                    {/* Form Actions */}
                    <div className="profile-form-actions">
                        {hasChanges && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleReset}
                                leftIcon={<X size={16} aria-hidden="true" />}
                            >
                                Hủy thay đổi
                            </Button>
                        )}
                        <Button
                            type="submit"
                            loading={isLoading}
                            disabled={!hasChanges}
                            leftIcon={<Save size={16} aria-hidden="true" />}
                        >
                            Lưu thay đổi
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}

export default AcademicInfoTab;
