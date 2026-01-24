import { cn } from '../../lib/utils';
import './RadioGroup.css';

/**
 * RadioGroup Component - Segmented button style radio group
 * 
 * @param {Object} props
 * @param {string} props.name - Radio group name
 * @param {Array} props.options - Array of {value, label, variant?, icon?}
 * @param {string} props.value - Current selected value
 * @param {Function} props.onChange - Callback when value changes
 * @param {string} props.error - Error message
 * @param {string} props.label - Group label
 * @param {boolean} props.required - Show required indicator
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 */
function RadioGroup({
    name,
    options = [],
    value,
    onChange,
    error,
    label,
    required,
    size = 'md',
    className,
    ...props
}) {
    const handleChange = (optionValue) => {
        onChange?.(optionValue);
    };

    return (
        <div className={cn('radio-group-container', className)} {...props}>
            {label && (
                <label className="radio-group-label">
                    {label}
                    {required && <span className="radio-group-required">*</span>}
                </label>
            )}
            
            <div 
                className={cn('radio-group', `radio-group-${size}`)}
                role="radiogroup"
                aria-label={label}
            >
                {options.map((option) => {
                    const isSelected = value === option.value;
                    const variant = option.variant || 'default';
                    
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={cn(
                                'radio-group-option',
                                `radio-group-option-${variant}`,
                                isSelected && 'radio-group-option-selected'
                            )}
                            onClick={() => handleChange(option.value)}
                        >
                            {option.icon && (
                                <span className="radio-group-option-icon" aria-hidden="true">
                                    {option.icon}
                                </span>
                            )}
                            <span className="radio-group-option-label">{option.label}</span>
                        </button>
                    );
                })}
            </div>
            
            {error && (
                <p className="radio-group-error" role="alert">{error}</p>
            )}
        </div>
    );
}

// Preset difficulty options
const DIFFICULTY_OPTIONS = [
    { value: 'easy', label: 'Dễ', variant: 'success' },
    { value: 'medium', label: 'Trung bình', variant: 'warning' },
    { value: 'hard', label: 'Khó', variant: 'danger' },
];

/**
 * DifficultySelector - Preset RadioGroup for topic difficulty
 */
function DifficultySelector({ value, onChange, error, required, ...props }) {
    return (
        <RadioGroup
            name="difficulty"
            label="Độ khó"
            options={DIFFICULTY_OPTIONS}
            value={value}
            onChange={onChange}
            error={error}
            required={required}
            {...props}
        />
    );
}

export { RadioGroup, DifficultySelector, DIFFICULTY_OPTIONS };
