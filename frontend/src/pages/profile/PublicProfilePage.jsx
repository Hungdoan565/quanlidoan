import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, GraduationCap, Mail, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { profileService } from '../../services/profile.service';
import {
    Card,
    CardHeader,
    CardBody,
    Avatar,
    Badge,
    Button,
    SkeletonText,
    EmptyState,
} from '../../components/ui';
import './PublicProfilePage.css';

const ROLE_LABELS = {
    admin: 'Quản trị viên',
    teacher: 'Giảng viên',
    student: 'Sinh viên',
};

const ROLE_ICONS = {
    admin: User,
    teacher: Briefcase,
    student: GraduationCap,
};

export function PublicProfilePage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, role } = useAuthStore();

    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['public-profile', id],
        queryFn: () => profileService.getProfileById(id),
        enabled: !!id,
        staleTime: 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="public-profile-page">
                <SkeletonText lines={3} />
                <Card className="public-profile-card">
                    <CardBody>
                        <SkeletonText lines={6} />
                    </CardBody>
                </Card>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="public-profile-page">
                <EmptyState
                    icon={User}
                    title="Không tìm thấy hồ sơ"
                    description="Hồ sơ không tồn tại hoặc bạn không có quyền truy cập."
                    action={
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            Quay lại
                        </Button>
                    }
                />
            </div>
        );
    }

    const isSelf = user?.id === profile.id;
    const canViewBio = profile.bio_public || role === 'admin' || isSelf;
    const interests = Array.isArray(profile.interests)
        ? profile.interests
        : (profile.interests ? String(profile.interests).split(',').map((i) => i.trim()).filter(Boolean) : []);

    const RoleIcon = ROLE_ICONS[profile.role] || User;

    return (
        <div className="public-profile-page">
            <div className="public-profile-header">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} aria-hidden="true" />
                    Quay lại
                </Button>
                <span className="page-context">Hồ sơ công khai</span>
            </div>

            <Card className="public-profile-card">
                <CardHeader>
                    <div className="public-profile-hero">
                        <Avatar
                            src={profile.avatar_url}
                            name={profile.full_name}
                            size="xl"
                            className="public-profile-avatar"
                        />
                        <div className="public-profile-main">
                            <div className="public-profile-name">
                                <h2>{profile.full_name}</h2>
                                <Badge variant={profile.role === 'teacher' ? 'primary' : 'default'}>
                                    <RoleIcon size={14} aria-hidden="true" />
                                    {ROLE_LABELS[profile.role] || 'Người dùng'}
                                </Badge>
                            </div>
                            <div className="public-profile-meta">
                                {profile.teacher_code && (
                                    <span className="meta-pill">{profile.teacher_code}</span>
                                )}
                                {profile.student_code && (
                                    <span className="meta-pill">{profile.student_code}</span>
                                )}
                                {profile.department && (
                                    <span className="meta-pill">{profile.department}</span>
                                )}
                                {profile.academic_rank && (
                                    <span className="meta-pill">{profile.academic_rank}</span>
                                )}
                            </div>
                            {profile.email && (
                                <a className="public-profile-email" href={`mailto:${profile.email}`}>
                                    <Mail size={14} aria-hidden="true" />
                                    {profile.email}
                                </a>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardBody>
                    <div className="public-profile-section">
                        <h3>Giới thiệu</h3>
                        {canViewBio && profile.bio ? (
                            <p className="public-profile-bio">{profile.bio}</p>
                        ) : (
                            <p className="public-profile-muted">
                                Nội dung giới thiệu chưa được công khai.
                            </p>
                        )}
                    </div>

                    <div className="public-profile-section">
                        <h3>Lĩnh vực quan tâm</h3>
                        {canViewBio && interests.length > 0 ? (
                            <div className="public-profile-tags">
                                {interests.map((tag, idx) => (
                                    <span key={idx} className="public-profile-tag">{tag}</span>
                                ))}
                            </div>
                        ) : (
                            <p className="public-profile-muted">Chưa có thông tin.</p>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}

export default PublicProfilePage;
