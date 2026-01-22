/**
 * Utility function to conditionally join classNames
 */
export function cn(...inputs) {
    return inputs.filter(Boolean).join(' ');
}

/**
 * Format relative time (e.g., "5 phút trước")
 */
export function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return 'Vừa xong';
}

/**
 * Format date to Vietnamese locale
 */
export function formatDate(date, options = {}) {
    return new Date(date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options,
    });
}
