import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight,
    ChevronDown,
    Users,
    BookOpen,
    Edit,
    Trash2,
    Copy,
    Lock,
    Unlock,
    ExternalLink,
    Plus,
    FileSpreadsheet
} from 'lucide-react';
import { Button, StatusBadge, Badge } from '../../../components/ui';

/**
 * Expandable Session Row - Hiển thị session với khả năng expand xem classes
 */
export function SessionRow({
    session,
    onEdit,
    onDelete,
    onClone,
    onToggleStatus,
    onImport,
    toggleStatusPending
}) {
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);

    const classesCount = session.classes?.length || 0;
    const hasClasses = classesCount > 0;

    // Get session type label
    const getSessionTypeLabel = (type) => {
        return type === 'do_an_tot_nghiep' ? 'Tốt nghiệp' : 'Cơ sở';
    };

    // Navigate to classes with session filter
    const handleViewClasses = (e) => {
        e.stopPropagation();
        navigate(`/admin/classes?session=${session.id}`);
    };

    // Toggle expand
    const handleToggleExpand = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    // Navigate to class detail
    const handleViewClass = (classId, e) => {
        e.stopPropagation();
        navigate(`/admin/classes/${classId}`);
    };

    // Handle import for this session
    const handleImport = (e) => {
        e.stopPropagation();
        if (onImport) {
            onImport(session);
        }
    };

    return (
        <Fragment>
            {/* Main Row */}
            <tr className={`session-row ${isExpanded ? 'expanded' : ''}`}>
                {/* Expand Toggle + Name */}
                <td className="td-name">
                    <div className="session-name-cell">
<button
                            className="expand-toggle"
                            onClick={handleToggleExpand}
                            aria-label={isExpanded ? 'Thu gọn' : 'Xem lớp học'}
                            aria-expanded={isExpanded}
                        >
                            {isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                        </button>
                        <div className="session-name" onClick={() => onEdit(session)}>
                            <span className="name-text">{session.name}</span>
                            <span className="semester-text">Học kỳ {session.semester}</span>
                        </div>
                    </div>
                </td>

                {/* Academic Year */}
                <td>{session.academic_year}</td>

                {/* Stats - Clickable to view classes */}
                <td>
                    <div className="session-stats">
<button
                            className="stat-item clickable"
                            aria-label="Xem danh sách lớp"
                            onClick={handleViewClasses}
                        >
                            <Users size={14} aria-hidden="true" />
                            <span>{classesCount} lớp</span>
                            <ExternalLink size={12} className="external-icon" aria-hidden="true" />
                        </button>
                    </div>
                </td>

                {/* Type */}
                <td>
                    <span className={`type-badge type-${session.session_type}`}>
                        {getSessionTypeLabel(session.session_type)}
                    </span>
                </td>

                {/* Status */}
                <td>
                    <StatusBadge status={session.status} />
                </td>

                {/* Actions */}
                <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
<Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleStatus(session)}
                            aria-label={session.status === 'open' ? 'Đóng đợt' : 'Mở đợt'}
                            disabled={toggleStatusPending}
                        >
                            {session.status === 'open' ? <Lock size={16} aria-hidden="true" /> : <Unlock size={16} aria-hidden="true" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onClone(session)}
                            aria-label="Sao chép đợt"
                        >
                            <Copy size={16} aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(session)}
                            aria-label="Chỉnh sửa"
                        >
                            <Edit size={16} aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(session)}
                            aria-label="Xóa"
                        >
                            <Trash2 size={16} aria-hidden="true" />
                        </Button>
                    </div>
                </td>
            </tr>

            {/* Expanded Classes List - Always show when expanded */}
            {isExpanded && (
                <tr className="expanded-row">
                    <td colSpan={6}>
                        <div className="classes-preview">
                            <div className="classes-header">
<span className="classes-title">
                                    <Users size={14} aria-hidden="true" />
                                    Lớp học trong đợt này ({classesCount})
                                </span>
                                <div className="classes-header-actions">
<Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleViewClasses}
                                    >
                                        Xem tất cả
                                        <ExternalLink size={14} aria-hidden="true" />
                                    </Button>
                                </div>
                            </div>

                            {hasClasses ? (
                                <div className="classes-grid">
                                    {session.classes.slice(0, 6).map((cls) => (
                                        <div
                                            key={cls.id}
                                            className="class-card"
                                            onClick={(e) => handleViewClass(cls.id, e)}
                                        >
<div className="class-card-header">
                                                <span className="class-code">{cls.code || cls.class_code}</span>
                                                <ChevronRight size={14} aria-hidden="true" />
                                            </div>
                                            <div className="class-card-body">
                                                <span className="class-name">{cls.name || cls.class_name}</span>
                                                <div className="class-stats">
                                                    <Users size={12} aria-hidden="true" />
                                                    <span>{cls.student_count || cls.students?.length || 0} SV</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {classesCount > 6 && (
                                        <div className="more-classes-card" onClick={handleViewClasses}>
                                            <span>+{classesCount - 6}</span>
                                            <span>lớp khác</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="no-classes">
                                    <p>Chưa có lớp nào trong đợt này</p>
                                </div>
                            )}

                            {/* Import button - contextual for this session */}
                            <div className="classes-actions">
<Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<FileSpreadsheet size={14} aria-hidden="true" />}
                                    onClick={handleImport}
                                >
                                    Import lớp từ Excel
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Plus size={14} aria-hidden="true" />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/admin/classes?session=${session.id}&action=create`);
                                    }}
                                >
                                    Tạo lớp thủ công
                                </Button>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </Fragment>
    );
}

