import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { FileX, Search, Inbox, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import './EmptyState.css';

/**
 * EmptyState Component with premium animations
 */
function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    actionLabel,
    onAction,
    variant = 'default', // 'default' | 'search' | 'error'
    className,
}) {
    const defaultIcons = {
        default: Inbox,
        search: Search,
        error: AlertCircle,
    };

    const IconComponent = Icon || defaultIcons[variant];

    return (
        <motion.div
            className={cn('empty-state', `empty-state-${variant}`, className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <motion.div
                className="empty-state-icon"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                    delay: 0.1
                }}
            >
                <IconComponent size={48} strokeWidth={1.5} />
            </motion.div>

            {title && (
                <motion.h3
                    className="empty-state-title"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                >
                    {title}
                </motion.h3>
            )}

            {description && (
                <motion.p
                    className="empty-state-description"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                >
                    {description}
                </motion.p>
            )}

            {(action || onAction) && (
                <motion.div
                    className="empty-state-action"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                >
                    {action || (
                        <Button onClick={onAction}>
                            {actionLabel || 'Thử lại'}
                        </Button>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}

// Pre-built empty states
function NoDataState({ title, description, action, onAction, actionLabel }) {
    return (
        <EmptyState
            icon={Inbox}
            title={title || 'Chưa có dữ liệu'}
            description={description || 'Dữ liệu sẽ xuất hiện ở đây khi có.'}
            action={action}
            onAction={onAction}
            actionLabel={actionLabel}
        />
    );
}

function NoSearchResultState({ query, onClear }) {
    return (
        <EmptyState
            variant="search"
            icon={Search}
            title="Không tìm thấy kết quả"
            description={query ? `Không có kết quả nào cho "${query}"` : 'Thử tìm kiếm với từ khóa khác.'}
            action={onClear && (
                <Button variant="secondary" onClick={onClear}>
                    Xóa bộ lọc
                </Button>
            )}
        />
    );
}

function ErrorState({ title, description, onRetry }) {
    return (
        <EmptyState
            variant="error"
            icon={AlertCircle}
            title={title || 'Đã xảy ra lỗi'}
            description={description || 'Không thể tải dữ liệu. Vui lòng thử lại.'}
            onAction={onRetry}
            actionLabel="Thử lại"
        />
    );
}

export { EmptyState, NoDataState, NoSearchResultState, ErrorState };
