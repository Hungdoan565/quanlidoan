import './ProgressBar.css';

/**
 * ProgressBar Component
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 * @param {'primary' | 'success' | 'warning' | 'danger'} variant - Color variant
 * @param {boolean} showLabel - Show percentage label
 * @param {string} className - Additional CSS classes
 */
export function ProgressBar({
    value = 0,
    max = 100,
    variant = 'primary',
    showLabel = false,
    className = '',
}) {
    const percentage = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

    return (
        <div className={`progress-bar-container ${className}`}>
            <div className={`progress-bar-track`}>
                <div
                    className={`progress-bar-fill ${variant}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <span className="progress-bar-label">{percentage}%</span>
            )}
        </div>
    );
}

export default ProgressBar;
