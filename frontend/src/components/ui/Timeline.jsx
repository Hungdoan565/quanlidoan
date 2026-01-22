import { cn } from '../../lib/utils';
import { Check, Circle } from 'lucide-react';
import './Timeline.css';

/**
 * Timeline Component - Show progress steps
 */
function Timeline({ children, className }) {
    return (
        <div className={cn('timeline', className)}>
            {children}
        </div>
    );
}

/**
 * Timeline Item
 */
function TimelineItem({ 
    label,
    date,
    status = 'pending', // 'completed' | 'current' | 'pending'
    isLast = false,
    className,
}) {
    return (
        <div className={cn('timeline-item', `timeline-item-${status}`, className)}>
            <div className="timeline-marker">
                {status === 'completed' ? (
                    <Check size={12} />
                ) : (
                    <Circle size={8} />
                )}
            </div>
            {!isLast && <div className="timeline-connector" />}
            <div className="timeline-content">
                <span className="timeline-label">{label}</span>
                {date && <span className="timeline-date">{date}</span>}
            </div>
        </div>
    );
}

/**
 * Horizontal Progress Timeline
 */
function ProgressTimeline({ steps, className }) {
    return (
        <div className={cn('progress-timeline', className)}>
            {steps.map((step, index) => (
                <div 
                    key={step.key || index}
                    className={cn(
                        'progress-step',
                        `progress-step-${step.status}`
                    )}
                >
                    <div className="progress-marker">
                        {step.status === 'completed' ? (
                            <Check size={14} />
                        ) : step.status === 'current' ? (
                            <span className="progress-dot-current" />
                        ) : (
                            <span className="progress-dot" />
                        )}
                    </div>
                    {index < steps.length - 1 && (
                        <div className={cn(
                            'progress-connector',
                            step.status === 'completed' && 'progress-connector-completed'
                        )} />
                    )}
                    <div className="progress-label">
                        <span className="progress-name">{step.label}</span>
                        {step.date && <span className="progress-date">{step.date}</span>}
                    </div>
                </div>
            ))}
        </div>
    );
}

export { Timeline, TimelineItem, ProgressTimeline };
