import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import './Accordion.css';

/**
 * Accordion Component - Collapsible sections
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Accordion items
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.allowMultiple - Allow multiple items open (default: false)
 */
function Accordion({ 
    children, 
    className,
    allowMultiple = false,
    defaultOpen = [],
}) {
    const [openItems, setOpenItems] = useState(new Set(defaultOpen));

    const toggleItem = (id) => {
        setOpenItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                if (!allowMultiple) {
                    next.clear();
                }
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className={cn('accordion', className)}>
            {typeof children === 'function' 
                ? children({ openItems, toggleItem })
                : children
            }
        </div>
    );
}

/**
 * AccordionItem - Individual collapsible section
 */
function AccordionItem({
    id,
    title,
    icon,
    badge,
    badgeVariant = 'default',
    children,
    isOpen,
    onToggle,
    className,
    headerClassName,
    contentClassName,
    disabled = false,
}) {
    const handleToggle = () => {
        if (!disabled && onToggle) {
            onToggle(id);
        }
    };

    return (
        <div 
            className={cn(
                'accordion-item',
                isOpen && 'accordion-item-open',
                disabled && 'accordion-item-disabled',
                className
            )}
        >
            <button
                type="button"
                className={cn('accordion-header', headerClassName)}
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${id}`}
                disabled={disabled}
            >
                <div className="accordion-header-left">
                    {icon && (
                        <span className="accordion-icon" aria-hidden="true">
                            {icon}
                        </span>
                    )}
                    <span className="accordion-title">{title}</span>
                    {badge !== undefined && (
                        <span className={cn('accordion-badge', `accordion-badge-${badgeVariant}`)}>
                            {badge}
                        </span>
                    )}
                </div>
                <motion.span 
                    className="accordion-chevron"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown size={18} />
                </motion.span>
            </button>
            
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        id={`accordion-content-${id}`}
                        className={cn('accordion-content', contentClassName)}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="accordion-content-inner">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Preset AccordionGroup - Manages multiple items internally
 */
function AccordionGroup({
    items,
    allowMultiple = false,
    defaultOpen = [],
    className,
}) {
    const [openItems, setOpenItems] = useState(new Set(defaultOpen));

    const toggleItem = (id) => {
        setOpenItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                if (!allowMultiple) {
                    next.clear();
                }
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className={cn('accordion', className)}>
            {items.map(item => (
                <AccordionItem
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    icon={item.icon}
                    badge={item.badge}
                    badgeVariant={item.badgeVariant}
                    isOpen={openItems.has(item.id)}
                    onToggle={toggleItem}
                    disabled={item.disabled}
                >
                    {item.content}
                </AccordionItem>
            ))}
        </div>
    );
}

export { Accordion, AccordionItem, AccordionGroup };
