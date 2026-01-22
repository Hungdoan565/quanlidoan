import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import './Button.css';

/**
 * Button Component
 * 
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'} props.variant
 * @param {'sm' | 'md' | 'lg'} props.size
 * @param {boolean} props.loading
 * @param {boolean} props.fullWidth
 * @param {React.ReactNode} props.leftIcon
 * @param {React.ReactNode} props.rightIcon
 */
const Button = forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    type = 'button',
    ...props
}, ref) => {
    const isDisabled = disabled || loading;

    return (
        <button
            ref={ref}
            type={type}
            disabled={isDisabled}
            className={cn(
                'btn',
                `btn-${variant}`,
                `btn-${size}`,
                fullWidth && 'btn-full',
                isDisabled && 'btn-disabled',
                className
            )}
            {...props}
        >
            {loading ? (
                <Loader2 className="btn-spinner" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
            ) : leftIcon ? (
                <span className="btn-icon btn-icon-left">{leftIcon}</span>
            ) : null}
            
            <span className="btn-text">{children}</span>
            
            {rightIcon && !loading && (
                <span className="btn-icon btn-icon-right">{rightIcon}</span>
            )}
        </button>
    );
});

Button.displayName = 'Button';

export { Button };
