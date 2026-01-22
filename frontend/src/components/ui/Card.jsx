import { cn } from '../../lib/utils';
import './Card.css';

/**
 * Card Component
 */
function Card({ children, className, padding = 'md', hover = false, ...props }) {
    return (
        <div 
            className={cn(
                'card',
                `card-padding-${padding}`,
                hover && 'card-hover',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

function CardHeader({ children, className, ...props }) {
    return (
        <div className={cn('card-header', className)} {...props}>
            {children}
        </div>
    );
}

function CardTitle({ children, className, as: Component = 'h3', ...props }) {
    return (
        <Component className={cn('card-title', className)} {...props}>
            {children}
        </Component>
    );
}

function CardDescription({ children, className, ...props }) {
    return (
        <p className={cn('card-description', className)} {...props}>
            {children}
        </p>
    );
}

function CardBody({ children, className, ...props }) {
    return (
        <div className={cn('card-body', className)} {...props}>
            {children}
        </div>
    );
}

function CardFooter({ children, className, ...props }) {
    return (
        <div className={cn('card-footer', className)} {...props}>
            {children}
        </div>
    );
}

export { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter };
