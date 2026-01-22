import { cn } from '../../lib/utils';
import './Badge.css';

/**
 * Badge Component - Status indicators
 * 
 * @param {'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'} variant
 * @param {'sm' | 'md'} size
 */
function Badge({ 
    children, 
    variant = 'default', 
    size = 'md',
    dot = false,
    className,
    ...props 
}) {
    return (
        <span 
            className={cn(
                'badge',
                `badge-${variant}`,
                `badge-${size}`,
                dot && 'badge-with-dot',
                className
            )}
            {...props}
        >
            {dot && <span className="badge-dot" />}
            {children}
        </span>
    );
}

// Preset badges for topic status
const statusConfig = {
    pending: { variant: 'warning', label: 'Chờ duyệt' },
    revision: { variant: 'warning', label: 'Yêu cầu sửa' },
    approved: { variant: 'success', label: 'Đã duyệt' },
    in_progress: { variant: 'primary', label: 'Đang thực hiện' },
    submitted: { variant: 'info', label: 'Đã nộp' },
    defended: { variant: 'info', label: 'Đã bảo vệ' },
    completed: { variant: 'success', label: 'Hoàn thành' },
    rejected: { variant: 'danger', label: 'Từ chối' },
    // Session status
    draft: { variant: 'default', label: 'Nháp' },
    open: { variant: 'success', label: 'Đang mở' },
    closed: { variant: 'default', label: 'Đã đóng' },
    archived: { variant: 'default', label: 'Lưu trữ' },
};

function StatusBadge({ status, className, ...props }) {
    const config = statusConfig[status] || { variant: 'default', label: status };
    
    return (
        <Badge 
            variant={config.variant} 
            dot
            className={className}
            {...props}
        >
            {config.label}
        </Badge>
    );
}

// Role badge
const roleConfig = {
    admin: { variant: 'danger', label: 'Admin' },
    teacher: { variant: 'warning', label: 'Giảng viên' },
    student: { variant: 'success', label: 'Sinh viên' },
};

function RoleBadge({ role, className, ...props }) {
    const config = roleConfig[role] || { variant: 'default', label: role };
    
    return (
        <Badge 
            variant={config.variant}
            size="sm"
            className={className}
            {...props}
        >
            {config.label}
        </Badge>
    );
}

export { Badge, StatusBadge, RoleBadge };
