import { motion } from 'framer-motion';

/**
 * Animation Variants - Reusable animation configurations
 */

// Fade in from bottom
export const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

// Fade in
export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

// Scale in
export const scaleIn = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
};

// Slide in from right
export const slideInRight = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

// Stagger children container
export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

// Smooth spring transition
export const springTransition = {
    type: 'spring',
    stiffness: 400,
    damping: 30,
};

// Smooth ease transition (premium feel)
export const smoothTransition = {
    duration: 0.4,
    ease: [0.16, 1, 0.3, 1],
};

/**
 * PageTransition - Wrap pages for smooth enter/exit
 */
export function PageTransition({ children, className }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}

/**
 * FadeInView - Animate elements when they enter viewport
 */
export function FadeInView({
    children,
    className,
    delay = 0,
    direction = 'up' // 'up' | 'down' | 'left' | 'right'
}) {
    const directionOffset = {
        up: { y: 20 },
        down: { y: -20 },
        left: { x: 20 },
        right: { x: -20 },
    };

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, ...directionOffset[direction] }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}

/**
 * AnimatedList - Stagger animate list items
 */
export function AnimatedList({ children, className }) {
    return (
        <motion.div
            className={className}
            initial="initial"
            animate="animate"
            variants={{
                animate: {
                    transition: {
                        staggerChildren: 0.05,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

/**
 * AnimatedListItem - For use inside AnimatedList
 */
export function AnimatedListItem({ children, className }) {
    return (
        <motion.div
            className={className}
            variants={{
                initial: { opacity: 0, x: -10 },
                animate: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
}

/**
 * PressableCard - Card with press and hover animations
 */
export function PressableCard({ children, className, onClick }) {
    return (
        <motion.div
            className={className}
            whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {children}
        </motion.div>
    );
}
