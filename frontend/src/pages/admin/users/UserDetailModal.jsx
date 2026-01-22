import { useState } from 'react';
import { Mail, Phone, Calendar, Shield, UserCheck, GraduationCap, Building } from 'lucide-react';
import { useUpdateUser, useChangeUserRole } from '../../../hooks/useUsers';
import { Modal, Button, Input, Select, Badge, Avatar } from '../../../components/ui';
import { formatDate } from '../../../lib/utils';

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'teacher', label: 'Giảng viên' },
    { value: 'student', label: 'Sinh viên' },
];

const ROLE_LABELS = {
    admin: { label: 'Quản trị viên', variant: 'danger', icon: Shield },
    teacher: { label: 'Giảng viên', variant: 'primary', icon: UserCheck },
    student: { label: 'Sinh viên', variant: 'success', icon: GraduationCap },
};

export function UserDetailModal({ isOpen, onClose, user }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        department: user?.department || '',
        academic_rank: user?.academic_rank || '',
    });

    const updateUser = useUpdateUser();
    const changeRole = useChangeUserRole();

    if (!user) return null;

    const roleConfig = ROLE_LABELS[user.role] || { label: user.role, variant: 'default' };
    const RoleIcon = roleConfig.icon || UserCheck;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        await updateUser.mutateAsync({ id: user.id, data: formData });
        setIsEditing(false);
    };

    const handleRoleChange = async (newRole) => {
        if (newRole === user.role) return;

        const confirmed = window.confirm(
            `Bạn có chắc muốn đổi vai trò của "${user.full_name}" từ ${ROLE_LABELS[user.role]?.label} sang ${ROLE_LABELS[newRole]?.label}?`
        );

        if (confirmed) {
            await changeRole.mutateAsync({ id: user.id, role: newRole });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Thông tin người dùng"
            size="md"
        >
            <div className="user-detail-modal">
                {/* User Header */}
                <div className="user-header">
                    <Avatar name={user.full_name} size="lg" />
                    <div className="user-header-info">
                        <h3>{user.full_name}</h3>
                        <div className="user-badges">
                            <Badge variant={roleConfig.variant}>
                                <RoleIcon size={12} />
                                {roleConfig.label}
                            </Badge>
                            <Badge variant={user.is_active ? 'success' : 'default'}>
                                {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* User Info */}
                {isEditing ? (
                    <div className="user-edit-form">
                        <div className="form-group">
                            <label>Họ và tên</label>
                            <Input
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <Input
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="0901234567"
                            />
                        </div>
                        {user.role === 'teacher' && (
                            <>
                                <div className="form-group">
                                    <label>Khoa / Bộ môn</label>
                                    <Input
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        placeholder="Công nghệ thông tin"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Học hàm / Học vị</label>
                                    <Input
                                        name="academic_rank"
                                        value={formData.academic_rank}
                                        onChange={handleChange}
                                        placeholder="Thạc sĩ"
                                    />
                                </div>
                            </>
                        )}
                        <div className="form-actions">
                            <Button variant="ghost" onClick={() => setIsEditing(false)}>
                                Hủy
                            </Button>
                            <Button onClick={handleSave} loading={updateUser.isPending}>
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="user-info-list">
                        <div className="info-row">
                            <Mail size={16} />
                            <span className="info-label">Email</span>
                            <span className="info-value">{user.email}</span>
                        </div>
                        <div className="info-row">
                            <Phone size={16} />
                            <span className="info-label">Điện thoại</span>
                            <span className="info-value">{user.phone || '-'}</span>
                        </div>
                        {user.role === 'student' && (
                            <div className="info-row">
                                <GraduationCap size={16} />
                                <span className="info-label">MSSV</span>
                                <span className="info-value code">{user.student_code || '-'}</span>
                            </div>
                        )}
                        {user.role === 'teacher' && (
                            <>
                                <div className="info-row">
                                    <UserCheck size={16} />
                                    <span className="info-label">Mã GV</span>
                                    <span className="info-value code">{user.teacher_code || '-'}</span>
                                </div>
                                <div className="info-row">
                                    <Building size={16} />
                                    <span className="info-label">Khoa</span>
                                    <span className="info-value">{user.department || '-'}</span>
                                </div>
                            </>
                        )}
                        <div className="info-row">
                            <Calendar size={16} />
                            <span className="info-label">Ngày tạo</span>
                            <span className="info-value">{formatDate(user.created_at)}</span>
                        </div>

                        {/* Role Change (Admin only for teachers/students) */}
                        {user.role !== 'admin' && (
                            <div className="role-change-section">
                                <label>Thay đổi vai trò</label>
                                <Select
                                    options={ROLE_OPTIONS.filter(r => r.value !== 'admin')}
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(e.target.value)}
                                    disabled={changeRole.isPending}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                {!isEditing && (
                    <div className="modal-footer">
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                            Chỉnh sửa
                        </Button>
                        <Button variant="ghost" onClick={onClose}>
                            Đóng
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
