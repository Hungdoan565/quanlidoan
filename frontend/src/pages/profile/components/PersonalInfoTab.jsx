import { useState, useRef } from 'react';
import { Camera, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store/authStore';
import { profileService } from '../../../services/profile.service';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';

const GENDER_OPTIONS = [
    { value: '', label: 'Chọn giới tính' },
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' },
];

export function PersonalInfoTab() {
    const { user, profile, setProfile } = useAuthStore();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        gender: profile?.gender || '',
        birth_date: profile?.birth_date || '',
        bio: profile?.bio || '',
        interests: Array.isArray(profile?.interests) ? profile.interests.join(', ') : (profile?.interests || ''),
        bio_public: profile?.bio_public ?? false,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const handleInputChange = (e) => {
        const { name, type, value, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        setHasChanges(true);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingAvatar(true);
        try {
            const avatarUrl = await profileService.uploadAvatar(user.id, file);
            setProfile({ ...profile, avatar_url: avatarUrl });
            toast.success('Đã cập nhật ảnh đại diện');
        } catch (error) {
            toast.error(error.message || 'Không thể tải ảnh lên');
        } finally {
            setIsUploadingAvatar(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveAvatar = async () => {
        if (!profile?.avatar_url) return;

        setIsUploadingAvatar(true);
        try {
            await profileService.removeAvatar(user.id);
            setProfile({ ...profile, avatar_url: null });
            toast.success('Đã xóa ảnh đại diện');
        } catch (error) {
            toast.error('Không thể xóa ảnh đại diện');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.full_name.trim()) {
            toast.error('Vui lòng nhập họ và tên');
            return;
        }

        setIsLoading(true);
        try {
            const interests = formData.interests
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);

            const updatedProfile = await profileService.updateProfile(user.id, {
                full_name: formData.full_name.trim(),
                phone: formData.phone.trim() || null,
                gender: formData.gender || null,
                birth_date: formData.birth_date || null,
                bio: formData.bio.trim() || null,
                interests: interests.length > 0 ? interests : null,
                bio_public: !!formData.bio_public,
            });

            setProfile(updatedProfile);
            setHasChanges(false);
            toast.success('Đã cập nhật thông tin cá nhân');
        } catch (error) {
            toast.error(error.message || 'Không thể cập nhật thông tin');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            full_name: profile?.full_name || '',
            phone: profile?.phone || '',
            gender: profile?.gender || '',
            birth_date: profile?.birth_date || '',
            bio: profile?.bio || '',
            interests: Array.isArray(profile?.interests) ? profile.interests.join(', ') : (profile?.interests || ''),
            bio_public: profile?.bio_public ?? false,
        });
        setHasChanges(false);
    };

    return (
        <div>
            {/* Avatar Section */}
            <Card className="profile-section-card">
                <div className="profile-section-header">
                    <div>
                        <h2 className="profile-section-title">Ảnh đại diện</h2>
                        <p className="profile-section-description">
                            Ảnh này sẽ hiển thị trên hồ sơ của bạn
                        </p>
                    </div>
                </div>

                <div className="avatar-section-centered">
                    <div className="avatar-wrapper">
                        <Avatar
                            src={profile?.avatar_url}
                            name={profile?.full_name}
                            size="xl"
                            className="avatar-image"
                        />
                        <button
                            type="button"
                            className="avatar-upload-overlay"
                            onClick={handleAvatarClick}
                            aria-label="Tải ảnh mới"
                        >
                            <Camera size={24} aria-hidden="true" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                            aria-hidden="true"
                            tabIndex="-1"
                        />
                    </div>

                    <div className="avatar-actions-centered">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAvatarClick}
                            loading={isUploadingAvatar}
                            leftIcon={<Camera size={16} />}
                        >
                            Tải ảnh mới
                        </Button>
                        {profile?.avatar_url && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRemoveAvatar}
                                disabled={isUploadingAvatar}
                                leftIcon={<Trash2 size={16} />}
                                className="text-danger"
                            >
                                Xóa ảnh
                            </Button>
                        )}
                        <p className="avatar-help-text">JPG, PNG, GIF hoặc WebP. Tối đa 2MB.</p>
                    </div>
                </div>
            </Card>

            {/* Personal Info Form */}
            <form onSubmit={handleSubmit} className="profile-form-wrapper">
                <Card className="profile-section-card">
                    <div className="profile-section-header">
                        <div>
                            <h2 className="profile-section-title">Thông tin cơ bản</h2>
                            <p className="profile-section-description">
                                Cập nhật thông tin cá nhân của bạn
                            </p>
                        </div>
                    </div>

                    <div className="profile-form-grid">
                        <div className="full-width">
                            <Input
                                label="Họ và tên"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleInputChange}
                                required
                                placeholder="Nhập họ và tên..."
                                autoComplete="name"
                            />
                        </div>

                        <Input
                            label="Email"
                            type="email"
                            value={user?.email || ''}
                            disabled
                            hint="Email không thể thay đổi"
                            autoComplete="email"
                        />

                        <Input
                            label="Số điện thoại"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="Nhập số điện thoại..."
                            autoComplete="tel"
                        />

                        <Select
                            label="Giới tính"
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            options={GENDER_OPTIONS}
                        />

                        <Input
                            label="Ngày sinh"
                            name="birth_date"
                            type="date"
                            value={formData.birth_date}
                            onChange={handleInputChange}
                            autoComplete="bday"
                        />
                    </div>

                    </Card>

                <Card className="profile-section-card">
                    <div className="profile-section-header">
                        <div>
                            <h2 className="profile-section-title">Giới thiệu</h2>
                            <p className="profile-section-description">
                                Giúp sinh viên hiểu rõ hướng nghiên cứu / kinh nghiệm của bạn
                            </p>
                        </div>
                    </div>

                    <div className="profile-form-grid">
                        <div className="full-width">
                            <div className="input-group">
                                <label htmlFor="profile-bio" className="input-label">Giới thiệu ngắn</label>
                                <div className="input-wrapper">
                                    <Textarea
                                        id="profile-bio"
                                        name="bio"
                                        rows={4}
                                        maxLength={400}
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        placeholder="VD: Giảng viên CNTT, quan tâm đến AI, dữ liệu lớn và hệ thống phân tán..."
                                    />
                                </div>
                                <div className="profile-bio-meta">
                                    <span className="input-hint">Tối đa 400 ký tự</span>
                                    <span className="profile-bio-count">{formData.bio.length}/400</span>
                                </div>
                            </div>
                        </div>

                        <div className="full-width">
                            <Input
                                label="Lĩnh vực quan tâm (cách nhau bằng dấu phẩy)"
                                name="interests"
                                value={formData.interests}
                                onChange={handleInputChange}
                                placeholder="VD: AI, Machine Learning, Web, IoT"
                                hint="Dùng để gợi ý & lọc khi phân công đề tài"
                            />
                        </div>

                        <div className="full-width">
                            <label className="profile-checkbox">
                                <input
                                    type="checkbox"
                                    name="bio_public"
                                    checked={!!formData.bio_public}
                                    onChange={handleInputChange}
                                />
                                <span>Cho phép hiển thị giới thiệu công khai</span>
                            </label>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="profile-form-actions">
                        {hasChanges && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleReset}
                                leftIcon={<X size={16} />}
                            >
                                Hủy thay đổi
                            </Button>
                        )}
                        <Button
                            type="submit"
                            loading={isLoading}
                            disabled={!hasChanges}
                            leftIcon={<Save size={16} />}
                        >
                            Lưu thay đổi
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}

export default PersonalInfoTab;
