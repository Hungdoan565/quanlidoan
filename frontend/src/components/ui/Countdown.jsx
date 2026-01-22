import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';
import './Countdown.css';

/**
 * Countdown Component - Shows time remaining until a deadline
 */
function Countdown({ 
    targetDate, 
    label = 'Còn lại',
    showIcon = true,
    size = 'md', // 'sm' | 'md' | 'lg'
    className,
}) {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft(targetDate));
        }, 1000 * 60); // Update every minute

        return () => clearInterval(timer);
    }, [targetDate]);

    const { days, hours, minutes, isPast, isUrgent } = timeLeft;

    if (isPast) {
        return (
            <div className={cn('countdown', 'countdown-past', `countdown-${size}`, className)}>
                {showIcon && <AlertTriangle size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
                <span className="countdown-text">Đã quá hạn</span>
            </div>
        );
    }

    return (
        <div className={cn(
            'countdown',
            isUrgent && 'countdown-urgent',
            `countdown-${size}`,
            className
        )}>
            {showIcon && <Clock size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
            <div className="countdown-content">
                {label && <span className="countdown-label">{label}</span>}
                <span className="countdown-value">
                    {days > 0 && `${days} ngày `}
                    {days === 0 && hours > 0 && `${hours} giờ `}
                    {days === 0 && hours === 0 && `${minutes} phút`}
                    {days > 0 && hours > 0 && `${hours} giờ`}
                </span>
            </div>
        </div>
    );
}

/**
 * Countdown Card - Larger display with more details
 */
function CountdownCard({
    targetDate,
    title,
    subtitle,
    onAction,
    actionLabel = 'Thực hiện ngay',
    className,
}) {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft(targetDate));
        }, 1000 * 60);

        return () => clearInterval(timer);
    }, [targetDate]);

    const { days, hours, isPast, isUrgent } = timeLeft;

    return (
        <div className={cn(
            'countdown-card',
            isPast && 'countdown-card-past',
            isUrgent && 'countdown-card-urgent',
            className
        )}>
            <div className="countdown-card-icon">
                {isPast ? <AlertTriangle size={24} /> : <Clock size={24} />}
            </div>
            <div className="countdown-card-content">
                <h4 className="countdown-card-title">{title}</h4>
                {subtitle && <p className="countdown-card-subtitle">{subtitle}</p>}
                
                <div className="countdown-card-timer">
                    {isPast ? (
                        <span className="countdown-card-past-text">Đã quá hạn</span>
                    ) : (
                        <>
                            <div className="countdown-card-unit">
                                <span className="countdown-card-number">{days}</span>
                                <span className="countdown-card-unit-label">ngày</span>
                            </div>
                            <span className="countdown-card-separator">:</span>
                            <div className="countdown-card-unit">
                                <span className="countdown-card-number">{hours}</span>
                                <span className="countdown-card-unit-label">giờ</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            {onAction && (
                <button className="countdown-card-action" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// Helper function
function calculateTimeLeft(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const difference = target - now;

    if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, isPast: true, isUrgent: false };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    return {
        days,
        hours,
        minutes,
        isPast: false,
        isUrgent: days <= 3,
    };
}

export { Countdown, CountdownCard };
