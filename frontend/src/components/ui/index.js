// UI Components Library
// Export all reusable components

// Core
export { Button } from './Button';
export { Input } from './Input';
export { Textarea } from './Textarea';
export { Select } from './Select';
export { default as CustomSelect } from './CustomSelect';
export { RadioGroup, DifficultySelector, DIFFICULTY_OPTIONS } from './RadioGroup';
export {
    Dropdown,
    DropdownTrigger,
    DropdownContent,
    DropdownItem,
    DropdownLabel,
    DropdownSeparator
} from './Dropdown';

// Display
export { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from './Card';
export { Badge, StatusBadge, RoleBadge } from './Badge';
export { Avatar, AvatarGroup } from './Avatar';
export { StatCard } from './StatCard';
export { Timeline, TimelineItem, ProgressTimeline } from './Timeline';
export { Countdown, CountdownCard } from './Countdown';
export { ProgressBar } from './ProgressBar';
export { Accordion, AccordionItem, AccordionGroup } from './Accordion';
export { TaskList, SimpleTaskList, ProgressTaskList } from './TaskList';
export { FileUpload } from './FileUpload';

// Feedback
export { Modal, ConfirmModal } from './Modal';
export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonStatCard } from './Skeleton';
export { EmptyState, NoDataState, NoSearchResultState, ErrorState } from './EmptyState';
export { Tooltip } from './Tooltip';

// Data Display
export {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Pagination
} from './Table';

// Animations
export {
    PageTransition,
    FadeInView,
    AnimatedList,
    AnimatedListItem,
    PressableCard,
    fadeInUp,
    fadeIn,
    scaleIn,
    slideInRight,
    staggerContainer,
    springTransition,
    smoothTransition
} from './Motion';
