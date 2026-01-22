import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import './Select.css';

/**
 * Select Component
 * Supports both options prop and children for flexibility
 */
const Select = forwardRef(({
    label,
    error,
    hint,
    required,
    options = [],
    placeholder,
    className,
    children,
    id,
    ...props
}, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const hasChildren = !!children;

    return (
        <div className={cn('select-group', error && 'select-group-error', className)}>
            {label && (
                <label htmlFor={selectId} className="select-label">
                    {label}
                    {required && <span className="select-required">*</span>}
                </label>
            )}
            
            <div className="select-wrapper">
                <select
                    ref={ref}
                    id={selectId}
                    className="select-field"
                    aria-invalid={!!error}
                    {...props}
                >
                    {hasChildren ? (
                        // Use children if provided
                        children
                    ) : (
                        // Otherwise use options array
                        <>
                            {placeholder && (
                                <option value="" disabled>
                                    {placeholder}
                                </option>
                            )}
                            {options.map((option) => (
                                <option 
                                    key={option.value} 
                                    value={option.value}
                                    disabled={option.disabled}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </>
                    )}
                </select>
                <ChevronDown className="select-icon" size={16} />
            </div>
            
            {error && (
                <p className="select-error" role="alert">{error}</p>
            )}
            
            {hint && !error && (
                <p className="select-hint">{hint}</p>
            )}
        </div>
    );
});

Select.displayName = 'Select';

export { Select };
