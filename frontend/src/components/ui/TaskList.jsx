import { useState, useRef, useCallback, memo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, X, GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import './TaskList.css';

// Progress status options - more intuitive than raw percentages
const PROGRESS_STATUS_OPTIONS = [
    { value: 0, label: 'Mới bắt đầu', className: 'progress-status-start' },
    { value: 50, label: 'Đang làm', className: 'progress-status-working' },
    { value: 80, label: 'Gần xong', className: 'progress-status-almost' },
];

/**
 * TaskList - Dynamic list of tasks with add/remove functionality
 * 
 * @param {Object} props
 * @param {Array} props.items - Array of task strings or objects
 * @param {Function} props.onChange - Callback when items change
 * @param {string} props.placeholder - Placeholder for new item input
 * @param {boolean} props.showProgress - Show progress slider for each item
 * @param {number} props.maxItems - Maximum number of items allowed
 * @param {boolean} props.disabled - Disable all interactions
 * @param {boolean} props.reorderable - Allow drag to reorder
 */
function TaskList({
    items = [],
    onChange,
    placeholder = 'Thêm công việc mới...',
    showProgress = false,
    maxItems = 20,
    disabled = false,
    reorderable = false,
    emptyMessage = 'Chưa có công việc nào',
    className,
}) {
    const [newTask, setNewTask] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const inputRef = useRef(null);

    // Normalize items to always be objects with task and optional progress
    const normalizedItems = items.map((item, index) => {
        if (typeof item === 'string') {
            return { id: `item-${index}`, task: item, progress: 0 };
        }
        return { id: item.id || `item-${index}`, ...item };
    });

    const handleAdd = () => {
        if (!newTask.trim() || disabled) return;
        
        const newItem = showProgress 
            ? { task: newTask.trim(), progress: 0 }
            : newTask.trim();
        
        onChange([...items, newItem]);
        setNewTask('');
        setIsAdding(false);
    };

    const handleRemove = (index) => {
        if (disabled) return;
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems);
    };

    const handleTaskChange = (index, value) => {
        if (disabled) return;
        const newItems = [...items];
        if (showProgress) {
            newItems[index] = { ...newItems[index], task: value };
        } else {
            newItems[index] = value;
        }
        onChange(newItems);
    };

    const handleProgressChange = (index, progress) => {
        if (disabled || !showProgress) return;
        const newItems = [...items];
        newItems[index] = { ...newItems[index], progress: parseInt(progress) || 0 };
        onChange(newItems);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        } else if (e.key === 'Escape') {
            setIsAdding(false);
            setNewTask('');
        }
    };

    const handleReorder = (newOrder) => {
        if (disabled || !reorderable) return;
        // Map back to original format
        const reorderedItems = newOrder.map(item => {
            if (showProgress) {
                return { task: item.task, progress: item.progress };
            }
            return item.task;
        });
        onChange(reorderedItems);
    };

    const canAdd = items.length < maxItems && !disabled;

    const TaskItem = ({ item, index }) => (
        <motion.div
            className={cn(
                'task-item',
                showProgress && 'task-item-with-progress',
                disabled && 'task-item-disabled'
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
        >
            {reorderable && !disabled && (
                <span className="task-drag-handle">
                    <GripVertical size={14} />
                </span>
            )}
            <span className="task-bullet">•</span>
            <input
                type="text"
                className="task-input"
                value={item.task}
                onChange={(e) => handleTaskChange(index, e.target.value)}
                disabled={disabled}
                aria-label={`Công việc ${index + 1}`}
            />
            {showProgress && (
                <div className="task-progress-status">
                    {PROGRESS_STATUS_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={cn(
                                'progress-status-btn',
                                option.className,
                                item.progress === option.value && 'progress-status-active'
                            )}
                            onClick={() => handleProgressChange(index, option.value)}
                            disabled={disabled}
                            aria-label={`Đặt tiến độ: ${option.label}`}
                            aria-pressed={item.progress === option.value}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
            {!disabled && (
                <button
                    type="button"
                    className="task-remove"
                    onClick={() => handleRemove(index)}
                    aria-label={`Xóa công việc ${index + 1}`}
                >
                    <X size={14} />
                </button>
            )}
        </motion.div>
    );

    return (
        <div className={cn('task-list', className)}>
            {/* Items */}
            {normalizedItems.length === 0 && !isAdding ? (
                <div className="task-list-empty">
                    {emptyMessage}
                </div>
            ) : reorderable ? (
                <Reorder.Group 
                    axis="y" 
                    values={normalizedItems} 
                    onReorder={handleReorder}
                    className="task-list-items"
                >
                    {normalizedItems.map((item, index) => (
                        <Reorder.Item 
                            key={item.id} 
                            value={item}
                            className="task-reorder-item"
                        >
                            <TaskItem item={item} index={index} />
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            ) : (
                <div className="task-list-items">
                    <AnimatePresence mode="popLayout">
                        {normalizedItems.map((item, index) => (
                            <TaskItem key={item.id} item={item} index={index} />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Add new item */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        className="task-add-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <span className="task-bullet">•</span>
                        <input
                            ref={inputRef}
                            type="text"
                            className="task-input task-input-new"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            autoFocus
                            aria-label="Công việc mới"
                        />
                        <div className="task-add-actions">
                            <button
                                type="button"
                                className="task-add-confirm"
                                onClick={handleAdd}
                                disabled={!newTask.trim()}
                            >
                                Thêm
                            </button>
                            <button
                                type="button"
                                className="task-add-cancel"
                                onClick={() => {
                                    setIsAdding(false);
                                    setNewTask('');
                                }}
                            >
                                Hủy
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add button */}
            {canAdd && !isAdding && (
                <button
                    type="button"
                    className="task-add-button"
                    onClick={() => {
                        setIsAdding(true);
                        setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                >
                    <Plus size={16} />
                    <span>Thêm</span>
                </button>
            )}

            {/* Max items reached */}
            {items.length >= maxItems && (
                <p className="task-list-limit">
                    Đã đạt giới hạn {maxItems} công việc
                </p>
            )}
        </div>
    );
}

/**
 * SimpleTaskList - Simpler version for just strings, no progress
 * Memoized to prevent unnecessary re-renders
 */
const SimpleTaskList = memo(function SimpleTaskList(props) {
    return <TaskList {...props} showProgress={false} />;
});

/**
 * ProgressTaskList - Version with progress tracking
 * Memoized to prevent unnecessary re-renders
 */
const ProgressTaskList = memo(function ProgressTaskList(props) {
    return <TaskList {...props} showProgress={true} />;
});

// Memoize the main TaskList component
const MemoizedTaskList = memo(TaskList);

export { MemoizedTaskList as TaskList, SimpleTaskList, ProgressTaskList };
