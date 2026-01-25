import { useState, useEffect } from 'react';
import { Moon, Sun, Bell, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import { profileService } from '../../../services/profile.service';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

function ToggleSwitch({ checked, onChange, disabled, 'aria-label': ariaLabel }) {
    return (
        <button
            type="button"
            className={`toggle-switch ${checked ? 'active' : ''}`}
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            aria-pressed={checked}
            aria-label={ariaLabel}
        >
            <span className="toggle-switch-handle" />
        </button>
    );
}

function SettingsItem({ icon: Icon, label, description, checked, onChange, disabled }) {
    return (
        <div className="settings-item">
            <div className="settings-item-header">
                {Icon && <Icon size={20} className="text-secondary" aria-hidden="true" />}
                <div className="settings-item-info">
                    <span className="settings-item-label">{label}</span>
                    {description && (
                        <span className="settings-item-description">{description}</span>
                    )}
                </div>
            </div>
            <ToggleSwitch 
                checked={checked} 
                onChange={onChange} 
                disabled={disabled}
                aria-label={`Bật/tắt ${label}`}
            />
        </div>
    );
}

export function SettingsTab() {
    const { user } = useAuthStore();
    const { theme, toggleTheme } = useUIStore();

    const [notificationSettings, setNotificationSettings] = useState({
        email_topic_updates: true,
        email_logbook_feedback: true,
        email_grade_published: true,
        email_deadline_reminders: true,
        email_system_announcements: true,
        push_topic_updates: true,
        push_logbook_feedback: true,
        push_grade_published: true,
        push_deadline_reminders: true,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalSettings, setOriginalSettings] = useState(null);

    // Fetch notification settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await profileService.getNotificationSettings(user.id);
                const relevantSettings = {
                    email_topic_updates: settings.email_topic_updates ?? true,
                    email_logbook_feedback: settings.email_logbook_feedback ?? true,
                    email_grade_published: settings.email_grade_published ?? true,
                    email_deadline_reminders: settings.email_deadline_reminders ?? true,
                    email_system_announcements: settings.email_system_announcements ?? true,
                    push_topic_updates: settings.push_topic_updates ?? true,
                    push_logbook_feedback: settings.push_logbook_feedback ?? true,
                    push_grade_published: settings.push_grade_published ?? true,
                    push_deadline_reminders: settings.push_deadline_reminders ?? true,
                };
                setNotificationSettings(relevantSettings);
                setOriginalSettings(relevantSettings);
            } catch (error) {
                console.error('Failed to fetch notification settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [user.id]);

    const handleNotificationChange = (key, value) => {
        setNotificationSettings((prev) => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSaveNotifications = async () => {
        setIsSaving(true);
        try {
            await profileService.updateNotificationSettings(user.id, notificationSettings);
            setOriginalSettings(notificationSettings);
            setHasChanges(false);
            toast.success('Đã lưu cài đặt thông báo');
        } catch (error) {
            toast.error('Không thể lưu cài đặt');
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetNotifications = () => {
        if (originalSettings) {
            setNotificationSettings(originalSettings);
            setHasChanges(false);
        }
    };

    return (
        <div>
            {/* Theme Settings */}
            <Card className="profile-section-card">
                <div className="profile-section-header">
                    <div>
                        <h2 className="profile-section-title">Giao diện</h2>
                        <p className="profile-section-description">
                            Tùy chỉnh giao diện hiển thị của ứng dụng
                        </p>
                    </div>
                </div>

                <div className="settings-group">
                    <SettingsItem
                        icon={theme === 'dark' ? Moon : Sun}
                        label="Chế độ tối"
                        description="Giảm độ sáng màn hình để bảo vệ mắt"
                        checked={theme === 'dark'}
                        onChange={toggleTheme}
                    />
                </div>
            </Card>

            {/* Email Notification Settings */}
            <Card className="profile-section-card">
                <div className="profile-section-header">
                    <div>
                        <h2 className="profile-section-title">Thông báo Email</h2>
                        <p className="profile-section-description">
                            Chọn loại email bạn muốn nhận
                        </p>
                    </div>
                </div>

                <div className="settings-group">
                    <SettingsItem
                        icon={Mail}
                        label="Cập nhật đề tài"
                        description="Nhận email khi đề tài được duyệt, từ chối hoặc có thay đổi"
                        checked={notificationSettings.email_topic_updates}
                        onChange={(v) => handleNotificationChange('email_topic_updates', v)}
                        disabled={isLoading}
                    />

                    <SettingsItem
                        icon={Mail}
                        label="Phản hồi nhật ký"
                        description="Nhận email khi giáo viên phản hồi nhật ký công việc"
                        checked={notificationSettings.email_logbook_feedback}
                        onChange={(v) => handleNotificationChange('email_logbook_feedback', v)}
                        disabled={isLoading}
                    />

                    <SettingsItem
                        icon={Mail}
                        label="Công bố điểm"
                        description="Nhận email khi điểm số được công bố"
                        checked={notificationSettings.email_grade_published}
                        onChange={(v) => handleNotificationChange('email_grade_published', v)}
                        disabled={isLoading}
                    />

                    <SettingsItem
                        icon={Mail}
                        label="Nhắc nhở deadline"
                        description="Nhận email nhắc nhở trước các deadline quan trọng"
                        checked={notificationSettings.email_deadline_reminders}
                        onChange={(v) => handleNotificationChange('email_deadline_reminders', v)}
                        disabled={isLoading}
                    />

                    <SettingsItem
                        icon={Mail}
                        label="Thông báo hệ thống"
                        description="Nhận email về các thông báo quan trọng từ hệ thống"
                        checked={notificationSettings.email_system_announcements}
                        onChange={(v) => handleNotificationChange('email_system_announcements', v)}
                        disabled={isLoading}
                    />
                </div>
            </Card>

            {/* Push Notification Settings */}
            <Card className="profile-section-card">
                <div className="profile-section-header">
                    <div>
                        <h2 className="profile-section-title">Thông báo trong ứng dụng</h2>
                        <p className="profile-section-description">
                            Chọn loại thông báo hiển thị trong ứng dụng
                        </p>
                    </div>
                </div>

                <div className="settings-group">
                    <SettingsItem
                        icon={Bell}
                        label="Cập nhật đề tài"
                        description="Thông báo khi đề tài có thay đổi trạng thái"
                        checked={notificationSettings.push_topic_updates}
                        onChange={(v) => handleNotificationChange('push_topic_updates', v)}
                        disabled={isLoading}
                    />

                    <SettingsItem
                        icon={Bell}
                        label="Phản hồi nhật ký"
                        description="Thông báo khi có phản hồi mới trên nhật ký"
                        checked={notificationSettings.push_logbook_feedback}
                        onChange={(v) => handleNotificationChange('push_logbook_feedback', v)}
                        disabled={isLoading}
                    />

                    <SettingsItem
                        icon={Bell}
                        label="Công bố điểm"
                        description="Thông báo khi điểm số được cập nhật"
                        checked={notificationSettings.push_grade_published}
                        onChange={(v) => handleNotificationChange('push_grade_published', v)}
                        disabled={isLoading}
                    />

                    <SettingsItem
                        icon={Bell}
                        label="Nhắc nhở deadline"
                        description="Thông báo nhắc nhở trước deadline"
                        checked={notificationSettings.push_deadline_reminders}
                        onChange={(v) => handleNotificationChange('push_deadline_reminders', v)}
                        disabled={isLoading}
                    />
                </div>

                {/* Save Button */}
                {hasChanges && (
                    <div className="profile-form-actions">
                        <Button
                            variant="ghost"
                            onClick={handleResetNotifications}
                        >
                            Hủy thay đổi
                        </Button>
                        <Button
                            onClick={handleSaveNotifications}
                            loading={isSaving}
                            leftIcon={<Save size={16} aria-hidden="true" />}
                        >
                            Lưu cài đặt
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default SettingsTab;
