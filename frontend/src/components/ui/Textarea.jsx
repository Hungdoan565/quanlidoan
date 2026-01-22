import './Input.css';

/**
 * Textarea Component
 * Multi-line text input component
 */
export function Textarea({
    className = '',
    error,
    rows = 4,
    ...props
}) {
    return (
        <textarea
            className={`input textarea ${error ? 'input-error' : ''} ${className}`}
            rows={rows}
            {...props}
        />
    );
}
