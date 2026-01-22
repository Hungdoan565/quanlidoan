import { useState } from 'react';
import './Tooltip.css';

export function Tooltip({ children, content, position = 'top', delay = 200 }) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState(null);

    const showTooltip = () => {
        const id = setTimeout(() => {
            setIsVisible(true);
        }, delay);
        setTimeoutId(id);
    };

    const hideTooltip = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIsVisible(false);
    };

    if (!content) return children;

    return (
        <div 
            className="tooltip-wrapper"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
        >
            {children}
            {isVisible && (
                <div className={`tooltip-content tooltip-${position}`}>
                    {content}
                </div>
            )}
        </div>
    );
}
