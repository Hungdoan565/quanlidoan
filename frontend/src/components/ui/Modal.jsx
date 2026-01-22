import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import './Modal.css';

/**
 * Modal Component with Framer Motion animations
 */
function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    closeOnOverlay = true,
    showClose = true,
    className,
}) {
    // Handle escape key
    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape' && isOpen) {
            onClose();
        }
    }, [isOpen, onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleEscape);

        // Prevent body scroll when modal is open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={closeOnOverlay ? onClose : undefined}
                >
                    <motion.div
                        className={cn('modal', `modal-${size}`, className)}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{
                            duration: 0.25,
                            ease: [0.16, 1, 0.3, 1]
                        }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        {/* Header */}
                        <div className="modal-header">
                            <div className="modal-header-text">
                                {title && (
                                    <h2 id="modal-title" className="modal-title">{title}</h2>
                                )}
                                {description && (
                                    <p className="modal-description">{description}</p>
                                )}
                            </div>
                            {showClose && (
                                <motion.button
                                    className="modal-close"
                                    onClick={onClose}
                                    aria-label="Đóng"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X size={20} />
                                </motion.button>
                            )}
                        </div>

                        {/* Body */}
                        <div className="modal-body">
                            {children}
                        </div>

                        {/* Footer */}
                        {footer && (
                            <div className="modal-footer">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Confirm Modal - Pre-built confirmation dialog
 */
function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Xác nhận',
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'primary', // 'primary' | 'danger'
    loading = false,
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </Button>
                </>
            }
        >
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{message}</p>
        </Modal>
    );
}

export { Modal, ConfirmModal };
