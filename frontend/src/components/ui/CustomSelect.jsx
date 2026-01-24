import React, { useState, useRef, useEffect, forwardRef, useMemo, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import './CustomSelect.css';

/**
 * CustomSelect Component
 * A beautiful replacement for native select with identical API
 */
const CustomSelect = forwardRef(({
    label,
    error,
    hint,
    required,
    options = [],
    placeholder = "Select an option",
    className,
    children,
    value,
    onChange,
    name,
    disabled = false,
    id,
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const listRef = useRef(null);
    const generatedId = useId();
    
    const selectId = id || `custom-select-${generatedId}`;

    // Normalize options from props or children
    const items = useMemo(() => {
        if (options && options.length > 0) {
            return options;
        }
        
        if (children) {
            return React.Children.map(children, (child) => {
                if (React.isValidElement(child) && child.type === 'option') {
                    return {
                        value: child.props.value,
                        label: child.props.children,
                        disabled: child.props.disabled
                    };
                }
                return null;
            }).filter(Boolean);
        }
        
        return [];
    }, [options, children]);

    // Find selected label
    const selectedItem = items.find(item => String(item.value) === String(value));
    const displayValue = selectedItem ? selectedItem.label : placeholder;

    // Handle outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
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

    // Handle escape key
    useEffect(() => {
        function handleEscape(event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleToggle = (e) => {
        e.preventDefault(); // Prevent form submission if inside a form
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleSelect = (itemValue) => {
        // Mimic native event structure
        const event = {
            target: {
                value: itemValue,
                name: name
            }
        };
        onChange && onChange(event);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (disabled) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            }
            // Basic keyboard nav logic could be added here to cycle through options
            // For now, we rely on the user opening and then clicking or tabbing
            // A more complex implementation would manage a focusedIndex state
        }
    };

    return (
        <div className={cn('custom-select-group', className)} ref={containerRef}>
            {label && (
                <label htmlFor={selectId} className="custom-select-label">
                    {label}
                    {required && <span className="custom-select-required">*</span>}
                </label>
            )}

            <div className="custom-select-wrapper">
                {/* Hidden native select for accessibility/forms if needed, 
                    but here we're building a full custom UI so we manage accessibility manually 
                */}
                
                <button
                    type="button"
                    ref={(node) => {
                        triggerRef.current = node;
                        if (typeof ref === 'function') ref(node);
                        else if (ref) ref.current = node;
                    }}
                    id={selectId}
                    className="custom-select-trigger"
                    onClick={handleToggle}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-invalid={!!error}
                    aria-labelledby={label ? `${selectId}-label` : undefined}
                >
                    <span className={cn('custom-select-value', !selectedItem && 'custom-select-placeholder')}>
                        {displayValue}
                    </span>
                    <ChevronDown size={16} className="custom-select-icon" />
                </button>

                {isOpen && (
                    <div 
                        className="custom-select-content" 
                        role="listbox" 
                        tabIndex={-1}
                        ref={listRef}
                    >
                        {items.length === 0 ? (
                            <div className="custom-select-option" style={{ pointerEvents: 'none', color: 'var(--text-muted)' }}>
                                No options available
                            </div>
                        ) : (
                            items.map((item, index) => {
                                const isSelected = String(item.value) === String(value);
                                return (
                                    <button
                                        type="button"
                                        key={item.value || index}
                                        role="option"
                                        aria-selected={isSelected}
                                        className={cn(
                                            'custom-select-option',
                                            isSelected && 'selected'
                                        )}
                                        onClick={() => !item.disabled && handleSelect(item.value)}
                                        disabled={item.disabled}
                                        data-value={item.value}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {error && (
                <p className="custom-select-error" role="alert">{error}</p>
            )}

            {hint && !error && (
                <p className="custom-select-hint">{hint}</p>
            )}
        </div>
    );
});

CustomSelect.displayName = 'CustomSelect';

export default CustomSelect;
