import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '../../lib/utils';
import './Dropdown.css';

// Context for dropdown state
const DropdownContext = createContext(null);

/**
 * Dropdown Component
 * A flexible dropdown menu with trigger and items
 */
function Dropdown({ 
    children, 
    className,
    align = 'end', // 'start' | 'end' | 'center'
    sideOffset = 4,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        function handleEscape(event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const toggle = () => setIsOpen(!isOpen);
    const close = () => setIsOpen(false);

    return (
        <DropdownContext.Provider value={{ isOpen, toggle, close, align, sideOffset }}>
            <div ref={dropdownRef} className={cn('dropdown', className)}>
                {children}
            </div>
        </DropdownContext.Provider>
    );
}

/**
 * Dropdown Trigger - The element that opens the dropdown
 */
function DropdownTrigger({ children, asChild = false, className }) {
    const { toggle, isOpen } = useContext(DropdownContext);

    const handleClick = (e) => {
        e.stopPropagation();
        toggle();
    };

    if (asChild) {
        // Clone the child and add click handler
        return children({ onClick: handleClick, 'aria-expanded': isOpen });
    }

    return (
        <button 
            type="button"
            className={cn('dropdown-trigger', className)}
            onClick={handleClick}
            aria-expanded={isOpen}
            aria-haspopup="menu"
        >
            {children}
        </button>
    );
}

/**
 * Dropdown Content - The popup menu
 */
function DropdownContent({ children, className, minWidth = 180 }) {
    const { isOpen, align, sideOffset } = useContext(DropdownContext);

    if (!isOpen) return null;

    return (
        <div 
            className={cn('dropdown-content', `dropdown-align-${align}`, className)}
            style={{ 
                '--dropdown-min-width': `${minWidth}px`,
                '--dropdown-offset': `${sideOffset}px`,
            }}
            role="menu"
        >
            {children}
        </div>
    );
}

/**
 * Dropdown Item - A single menu item
 */
function DropdownItem({ 
    children, 
    icon: Icon,
    onClick, 
    disabled = false,
    variant = 'default', // 'default' | 'danger'
    className,
}) {
    const { close } = useContext(DropdownContext);

    const handleClick = (e) => {
        if (disabled) return;
        onClick?.(e);
        close();
    };

    return (
        <button
            type="button"
            className={cn(
                'dropdown-item',
                `dropdown-item-${variant}`,
                disabled && 'dropdown-item-disabled',
                className
            )}
            onClick={handleClick}
            disabled={disabled}
            role="menuitem"
        >
            {Icon && <Icon size={16} className="dropdown-item-icon" />}
            <span>{children}</span>
        </button>
    );
}

/**
 * Dropdown Label - A non-interactive label
 */
function DropdownLabel({ children, className }) {
    return (
        <div className={cn('dropdown-label', className)}>
            {children}
        </div>
    );
}

/**
 * Dropdown Separator - A divider line
 */
function DropdownSeparator({ className }) {
    return <div className={cn('dropdown-separator', className)} role="separator" />;
}

export { 
    Dropdown, 
    DropdownTrigger, 
    DropdownContent, 
    DropdownItem, 
    DropdownLabel,
    DropdownSeparator 
};
