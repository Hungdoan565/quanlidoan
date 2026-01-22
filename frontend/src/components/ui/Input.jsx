import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import './Input.css';

/**
 * Input Component
 * 
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.error
 * @param {string} props.hint
 * @param {React.ReactNode} props.leftIcon
 * @param {React.ReactNode} props.rightIcon
 * @param {boolean} props.required
 */
const Input = forwardRef(({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    required,
    className,
    id,
    ...props
}, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={cn('input-group', error && 'input-group-error', className)}>
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            
            <div className="input-wrapper">
                {leftIcon && (
                    <span className="input-icon input-icon-left">{leftIcon}</span>
                )}
                
                <input
                    ref={ref}
                    id={inputId}
                    className={cn(
                        'input-field',
                        leftIcon && 'input-with-left-icon',
                        rightIcon && 'input-with-right-icon'
                    )}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                    {...props}
                />
                
                {rightIcon && (
                    <span className="input-icon input-icon-right">{rightIcon}</span>
                )}
            </div>
            
            {error && (
                <p id={`${inputId}-error`} className="input-error" role="alert">
                    {error}
                </p>
            )}
            
            {hint && !error && (
                <p id={`${inputId}-hint`} className="input-hint">
                    {hint}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export { Input };
