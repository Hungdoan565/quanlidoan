import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Button } from '../../../components/ui';

/**
 * CollapsibleCardGroup - Shows first N cards with expand/collapse and drag-reorder
 * 
 * @param {string} title - Group header title (e.g., class name)
 * @param {Array} students - Array of student objects
 * @param {number} threshold - Number of cards to show before collapsing (default: 8)
 * @param {Function} renderCard - Function to render each card: (student, index) => JSX
 * @param {string} className - Additional CSS classes
 * @param {boolean} reorderable - Whether cards can be reordered (default: true)
 */
export function CollapsibleCardGroup({
  title,
  students = [],
  threshold = 8,
  renderCard,
  className = '',
  reorderable = true,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [orderedStudents, setOrderedStudents] = useState(students);
  
  // Reset state when students prop changes (filter/search changed)
  useEffect(() => {
    setIsExpanded(false);
    setOrderedStudents(students);
  }, [students]);

  // Don't render if no students
  if (!orderedStudents || orderedStudents.length === 0) {
    return null;
  }

  const shouldCollapse = orderedStudents.length > threshold;
  const visibleStudents = isExpanded ? orderedStudents : orderedStudents.slice(0, threshold);
  const hiddenCount = orderedStudents.length - threshold;

  const handleReorder = (newOrder) => {
    // Only reorder visible items, keep hidden ones in place
    if (isExpanded) {
      setOrderedStudents(newOrder);
    } else {
      const hiddenStudents = orderedStudents.slice(threshold);
      setOrderedStudents([...newOrder, ...hiddenStudents]);
    }
  };

  return (
    <div className={`collapsible-card-group ${className}`}>
      {/* Group Header */}
      {title && (
        <div className="group-header">
          <span className="group-title">{title}</span>
          <span className="group-count">({orderedStudents.length})</span>
        </div>
      )}

      {/* Cards with Reorder */}
      {reorderable ? (
        <Reorder.Group
          axis="y"
          values={visibleStudents}
          onReorder={handleReorder}
          className="group-cards"
        >
          {visibleStudents.map((student, index) => (
            <Reorder.Item
              key={student.id}
              value={student}
              className="reorder-item"
              dragListener={false}
            >
              <div className="card-with-handle">
                <motion.div
                  className="drag-handle"
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  whileDrag={{ cursor: 'grabbing' }}
                  aria-label="Kéo để sắp xếp lại"
                >
                  <GripVertical size={14} />
                </motion.div>
                <div className="card-content">
                  {renderCard(student, index)}
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className="group-cards">
          <AnimatePresence mode="popLayout">
            {visibleStudents.map((student, index) => (
              <motion.div
                key={student.id || index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderCard(student, index)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Expand/Collapse Button */}
      {shouldCollapse && (
        <Button
          variant="ghost"
          size="sm"
          className="expand-toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Thu gọn danh sách' : `Xem thêm ${hiddenCount} sinh viên`}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} />
              Thu gọn
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Xem thêm {hiddenCount} sinh viên
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export default CollapsibleCardGroup;
