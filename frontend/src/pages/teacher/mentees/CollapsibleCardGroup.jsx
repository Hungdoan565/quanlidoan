import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../components/ui';

/**
 * CollapsibleCardGroup - Shows first N cards with expand/collapse functionality
 * 
 * @param {string} title - Group header title (e.g., class name)
 * @param {Array} students - Array of student objects
 * @param {number} threshold - Number of cards to show before collapsing (default: 8)
 * @param {Function} renderCard - Function to render each card: (student, index) => JSX
 * @param {string} className - Additional CSS classes
 */
export function CollapsibleCardGroup({
  title,
  students = [],
  threshold = 8,
  renderCard,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Reset expanded state when students change
  useEffect(() => {
    setIsExpanded(false);
  }, [students]);

  // Don't render if no students
  if (!students || students.length === 0) {
    return null;
  }

  const shouldCollapse = students.length > threshold;
  const visibleStudents = isExpanded ? students : students.slice(0, threshold);
  const hiddenCount = students.length - threshold;

  return (
    <div className={`collapsible-card-group ${className}`}>
      {/* Group Header */}
      {title && (
        <div className="group-header">
          <span className="group-title">{title}</span>
          <span className="group-count">({students.length})</span>
        </div>
      )}

      {/* Cards */}
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
