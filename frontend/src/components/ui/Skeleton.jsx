import { cn } from '../../lib/utils';
import './Skeleton.css';

/**
 * Skeleton Loading Component
 */
function Skeleton({ className, variant = 'text', width, height, ...props }) {
    return (
        <div 
            className={cn('skeleton', `skeleton-${variant}`, className)}
            style={{ width, height }}
            {...props}
        />
    );
}

/**
 * Pre-built skeleton patterns
 */
function SkeletonText({ lines = 3, className }) {
    return (
        <div className={cn('skeleton-text-group', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton 
                    key={i} 
                    variant="text" 
                    style={{ width: i === lines - 1 ? '60%' : '100%' }}
                />
            ))}
        </div>
    );
}

function SkeletonCard({ className }) {
    return (
        <div className={cn('skeleton-card', className)}>
            <div className="skeleton-card-header">
                <Skeleton variant="circle" width={40} height={40} />
                <div className="skeleton-card-header-text">
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" height={12} />
                </div>
            </div>
            <SkeletonText lines={2} />
        </div>
    );
}

function SkeletonTable({ rows = 5, cols = 4, className }) {
    return (
        <div className={cn('skeleton-table', className)}>
            <div className="skeleton-table-header">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} variant="text" height={16} />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="skeleton-table-row">
                    {Array.from({ length: cols }).map((_, colIdx) => (
                        <Skeleton key={colIdx} variant="text" />
                    ))}
                </div>
            ))}
        </div>
    );
}

function SkeletonStatCard({ className }) {
    return (
        <div className={cn('skeleton-stat-card', className)}>
            <Skeleton variant="text" width="40%" height={14} />
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="50%" height={12} />
        </div>
    );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonStatCard };
