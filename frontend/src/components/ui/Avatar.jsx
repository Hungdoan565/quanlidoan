import { cn } from '../../lib/utils';
import './Avatar.css';

/**
 * Avatar Component
 */
function Avatar({ 
    src, 
    alt, 
    name, 
    size = 'md',
    className, 
    ...props 
}) {
    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getColorFromName = (name) => {
        if (!name) return 'var(--neutral-500)';
        const colors = [
            'var(--primary-500)',
            'var(--success-500)',
            'var(--warning-500)',
            'var(--danger-500)',
            '#8b5cf6', // violet
            '#ec4899', // pink
            '#06b6d4', // cyan
            '#f97316', // orange
        ];
        const charCode = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
        return colors[charCode % colors.length];
    };

    if (src) {
        return (
            <img 
                src={src} 
                alt={alt || name} 
                className={cn('avatar', `avatar-${size}`, className)}
                {...props}
            />
        );
    }

    return (
        <div 
            className={cn('avatar', 'avatar-initials', `avatar-${size}`, className)}
            style={{ backgroundColor: getColorFromName(name) }}
            title={name}
            {...props}
        >
            {getInitials(name)}
        </div>
    );
}

/**
 * AvatarGroup - Stack of avatars
 */
function AvatarGroup({ children, max = 4, size = 'md', className }) {
    const avatars = Array.isArray(children) ? children : [children];
    const visible = avatars.slice(0, max);
    const remaining = avatars.length - max;

    return (
        <div className={cn('avatar-group', className)}>
            {visible}
            {remaining > 0 && (
                <div className={cn('avatar', 'avatar-count', `avatar-${size}`)}>
                    +{remaining}
                </div>
            )}
        </div>
    );
}

export { Avatar, AvatarGroup };
