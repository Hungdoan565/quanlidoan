import { useState } from 'react';
import { User, Shield, Settings, GraduationCap, Briefcase } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { PersonalInfoTab } from './components/PersonalInfoTab';
import { AcademicInfoTab } from './components/AcademicInfoTab';
import { SecurityTab } from './components/SecurityTab';
import { SettingsTab } from './components/SettingsTab';
import './ProfilePage.css';

const TABS = {
    personal: {
        id: 'personal',
        label: 'Thông tin cá nhân',
        icon: User,
    },
    academic: {
        id: 'academic',
        label: 'Học vấn / Công việc',
        icon: GraduationCap,
        iconTeacher: Briefcase,
    },
    security: {
        id: 'security',
        label: 'Bảo mật',
        icon: Shield,
    },
    settings: {
        id: 'settings',
        label: 'Cài đặt',
        icon: Settings,
    },
};

export function ProfilePage() {
    const [activeTab, setActiveTab] = useState('personal');
    const { profile, role } = useAuthStore();

    const renderTabContent = () => {
        switch (activeTab) {
            case 'personal':
                return <PersonalInfoTab />;
            case 'academic':
                return <AcademicInfoTab />;
            case 'security':
                return <SecurityTab />;
            case 'settings':
                return <SettingsTab />;
            default:
                return <PersonalInfoTab />;
        }
    };

    const getTabIcon = (tab) => {
        if (tab.id === 'academic' && role === 'teacher') {
            return tab.iconTeacher;
        }
        return tab.icon;
    };

    return (
        <div className="profile-page">
            <div className="profile-header">
                <h1 className="profile-title">Hồ sơ cá nhân</h1>
                <p className="profile-subtitle">
                    Quản lý thông tin tài khoản và cài đặt của bạn
                </p>
            </div>

            <div className="profile-content">
                {/* Tabs Navigation */}
                <Card className="profile-tabs-card" padding="none">
                    <nav className="profile-tabs" aria-label="Profile sections">
                        {Object.values(TABS).map((tab) => {
                            const Icon = getTabIcon(tab);
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'profile-tab',
                                        isActive && 'profile-tab-active'
                                    )}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <Icon size={18} aria-hidden="true" />
                                    <span>{tab.label}</span>
                                    {isActive && <div className="profile-tab-indicator" layoutId="activeTab" />}
                                </button>
                            );
                        })}
                    </nav>
                </Card>

                {/* Tab Content */}
                <div className="profile-tab-content-wrapper">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
