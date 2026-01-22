import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './StatCard.css';

/**
 * StatCard Component - For dashboard statistics with animations
 */
function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    trendValue,
    variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'danger'
    loading = false,
    className,
    onClick,
    delay = 0, // Animation delay for stagger effect
}) {
    const getTrendIcon = () => {
        if (!trend) return null;
        if (trend === 'up') return <TrendingUp size={14} />;
        if (trend === 'down') return <TrendingDown size={14} />;
        return <Minus size={14} />;
    };

    return (
        <motion.div
            className={cn(
                'stat-card',
                `stat-card-${variant}`,
                onClick && 'stat-card-clickable',
                loading && 'stat-card-loading',
                className
            )}
            onClick={onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.4,
                delay: delay,
                ease: [0.16, 1, 0.3, 1]
            }}
            whileHover={onClick ? {
                y: -4,
                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
            } : undefined}
            whileTap={onClick ? { scale: 0.98 } : undefined}
        >
            <div className="stat-card-content">
                <div className="stat-card-header">
                    <span className="stat-card-title">{title}</span>
                    {Icon && (
                        <motion.div
                            className="stat-card-icon"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: delay + 0.2, type: 'spring', stiffness: 400 }}
                        >
                            <Icon size={20} />
                        </motion.div>
                    )}
                </div>

                <motion.div
                    className="stat-card-value"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: delay + 0.1, duration: 0.3 }}
                >
                    {value}
                </motion.div>

                {(subtitle || trend) && (
                    <div className="stat-card-footer">
                        {trend && (
                            <span className={cn('stat-card-trend', `trend-${trend}`)}>
                                {getTrendIcon()}
                                {trendValue}
                            </span>
                        )}
                        {subtitle && (
                            <span className="stat-card-subtitle">{subtitle}</span>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export { StatCard };
