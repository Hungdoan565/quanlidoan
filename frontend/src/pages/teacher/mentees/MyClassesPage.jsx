import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    BookOpen, 
    AlertCircle, 
    Activity, 
    ChevronRight, 
    GraduationCap, 
    Calendar 
} from 'lucide-react';
import {
    Card,
    CardBody,
    Badge,
    Button,
    SkeletonCard,
    NoDataState,
    ErrorState
} from '../../../components/ui';
import { useMyClasses } from '../../../hooks/useTeacher';
import './MyClassesPage.css';

const ClassCard = ({ classData }) => {
    const navigate = useNavigate();
    
    // Calculate progress
    const totalStudents = classData.student_count || 0;
    const registered = classData.topics_registered || 0;
    const progress = totalStudents > 0 ? (registered / totalStudents) * 100 : 0;
    
    return (
        <Card 
            className="class-card"
            onClick={() => navigate(`/teacher/mentees/${classData.id}`)}
        >
            <CardBody>
                <div className="class-header">
                    <Badge variant="outline" className="class-code">
                        {classData.code}
                    </Badge>
                    <ChevronRight size={16} className="text-muted" />
                </div>
                
                <h3 className="class-name" title={classData.name}>
                    {classData.name}
                </h3>
                
                <div className="class-session">
                    <Calendar size={14} />
                    <span>
                        {classData.session?.name} • HK{classData.session?.semester}/{classData.session?.academic_year}
                    </span>
                </div>
                
                <div className="class-stats">
                    <div className="class-stat">
                        <span className="value">{totalStudents}</span>
                        <span className="label">Sinh viên</span>
                    </div>
                    <div className="class-stat">
                        <span className="value">{registered}</span>
                        <span className="label">Đã ĐK đề tài</span>
                    </div>
                </div>
                
                <div className="class-progress-section">
                    <div className="progress-header">
                        <span className="progress-label">Tiến độ đăng ký</span>
                        <span className="progress-percent">{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-track">
                        <div 
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};

export default function MyClassesPage() {
    const navigate = useNavigate();
    const { data: classes = [], isLoading, error, refetch } = useMyClasses();

    // Calculate overall stats
    const stats = useMemo(() => {
        const totalStudents = classes.reduce((acc, cls) => acc + (cls.student_count || 0), 0);
        const totalTopics = classes.reduce((acc, cls) => acc + (cls.topics_registered || 0), 0);
        const noTopicCount = totalStudents - totalTopics;
        
        return { totalStudents, totalTopics, noTopicCount };
    }, [classes]);

    if (isLoading) {
        return (
            <div className="my-classes-page">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title"><GraduationCap size={28} /> Lớp phụ trách</h1>
                    </div>
                </div>
                <div className="classes-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorState onRetry={refetch} />;
    }

    if (!classes || classes.length === 0) {
        return (
            <div className="my-classes-page">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title"><GraduationCap size={28} /> Lớp phụ trách</h1>
                    </div>
                </div>
                <NoDataState 
                    icon={GraduationCap}
                    title="Chưa có lớp nào"
                    description="Bạn chưa được phân công phụ trách lớp nào"
                />
            </div>
        );
    }

    return (
        <div className="my-classes-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">
                        <GraduationCap size={28} /> 
                        Lớp phụ trách
                    </h1>
                    <p className="page-subtitle">
                        Quản lý {stats.totalStudents} sinh viên trong {classes.length} lớp
                    </p>
                </div>
                <div className="page-actions">
                    <Button onClick={() => navigate('/teacher/mentees/health')}>
                        <Activity size={18} /> 
                        Theo dõi tiến độ
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="stats-row">
                <div className="stat-item">
                    <Users /> 
                    {stats.totalStudents} 
                    <span>Tổng sinh viên</span>
                </div>
                <div className="stat-item">
                    <BookOpen /> 
                    {stats.totalTopics} 
                    <span>Đề tài đã ĐK</span>
                </div>
                <div className="stat-item warning">
                    <AlertCircle /> 
                    {stats.noTopicCount} 
                    <span>Chưa ĐK đề tài</span>
                </div>
            </div>

            {/* Class Cards Grid */}
            <div className="classes-grid">
                {classes.map(cls => (
                    <ClassCard key={cls.id} classData={cls} />
                ))}
            </div>
        </div>
    );
}
