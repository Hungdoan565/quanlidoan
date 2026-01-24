import { useState, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, X, File, Image, FileText, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import './FileUpload.css';

/**
 * FileUpload Component - Drag and drop file upload with preview
 * 
 * @param {Object} props
 * @param {Array} props.files - Array of file objects [{name, url, size, type}]
 * @param {Function} props.onChange - Callback when files change
 * @param {number} props.maxFiles - Maximum number of files (default: 10)
 * @param {number} props.maxSizeMB - Maximum file size in MB (default: 5)
 * @param {Array} props.accept - Accepted file types (default: all)
 * @param {boolean} props.disabled - Disable upload
 * @param {string} props.className - Additional CSS classes
 */
function FileUpload({
    files = [],
    onChange,
    maxFiles = 10,
    maxSizeMB = 5,
    accept = ['*'],
    disabled = false,
    className,
    label = 'Đính kèm tệp',
    hint,
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    const getFileIcon = (file) => {
        const type = file.type || '';
        if (type.startsWith('image/')) return <Image size={18} />;
        if (type.includes('pdf')) return <FileText size={18} />;
        return <File size={18} />;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const validateFile = (file) => {
        // Check size
        if (file.size > maxSizeBytes) {
            return `Tệp "${file.name}" vượt quá ${maxSizeMB}MB`;
        }

        // Check type if specified
        if (accept[0] !== '*') {
            const fileType = file.type || '';
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const isAccepted = accept.some(type => {
                if (type.startsWith('.')) {
                    return fileExt === type.slice(1).toLowerCase();
                }
                if (type.endsWith('/*')) {
                    return fileType.startsWith(type.slice(0, -1));
                }
                return fileType === type;
            });
            
            if (!isAccepted) {
                return `Loại tệp "${file.name}" không được hỗ trợ`;
            }
        }

        return null;
    };

    const processFiles = (fileList) => {
        if (disabled) return;
        
        setError(null);
        const newFiles = [];
        const remainingSlots = maxFiles - files.length;

        if (remainingSlots <= 0) {
            setError(`Đã đạt giới hạn ${maxFiles} tệp`);
            return;
        }

        for (let i = 0; i < Math.min(fileList.length, remainingSlots); i++) {
            const file = fileList[i];
            const validationError = validateFile(file);
            
            if (validationError) {
                setError(validationError);
                continue;
            }

            // Create file object with local URL for preview
            newFiles.push({
                id: `${Date.now()}-${i}`,
                name: file.name,
                size: file.size,
                type: file.type,
                file: file, // Keep original file for upload
                url: URL.createObjectURL(file),
                isLocal: true, // Mark as not yet uploaded
            });
        }

        if (newFiles.length > 0) {
            onChange([...files, ...newFiles]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (!disabled) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        
        if (disabled) return;
        
        const droppedFiles = e.dataTransfer.files;
        processFiles(droppedFiles);
    };

    const handleFileSelect = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles) {
            processFiles(selectedFiles);
        }
        // Reset input value to allow selecting same file again
        e.target.value = '';
    };

    const handleRemove = (index) => {
        if (disabled) return;
        
        const fileToRemove = files[index];
        // Revoke object URL if it's a local file
        if (fileToRemove.isLocal && fileToRemove.url) {
            URL.revokeObjectURL(fileToRemove.url);
        }
        
        const newFiles = files.filter((_, i) => i !== index);
        onChange(newFiles);
        setError(null);
    };

    const canAddMore = files.length < maxFiles && !disabled;

    return (
        <div className={cn('file-upload', className)}>
            {label && (
                <label className="file-upload-label">{label}</label>
            )}

            {/* Drop zone */}
            <div
                className={cn(
                    'file-upload-dropzone',
                    isDragging && 'file-upload-dropzone-active',
                    disabled && 'file-upload-dropzone-disabled',
                    !canAddMore && 'file-upload-dropzone-full'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => canAddMore && inputRef.current?.click()}
                role="button"
                tabIndex={canAddMore ? 0 : -1}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        canAddMore && inputRef.current?.click();
                    }
                }}
                aria-label="Kéo thả tệp hoặc nhấp để chọn"
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={accept.join(',')}
                    onChange={handleFileSelect}
                    disabled={!canAddMore}
                    className="file-upload-input"
                    aria-hidden="true"
                />
                
                <div className="file-upload-icon">
                    <Upload size={24} />
                </div>
                <p className="file-upload-text">
                    {isDragging 
                        ? 'Thả tệp vào đây'
                        : canAddMore 
                            ? 'Kéo thả tệp hoặc nhấp để chọn'
                            : `Đã đạt giới hạn ${maxFiles} tệp`
                    }
                </p>
                <p className="file-upload-hint">
                    {hint || `Tối đa ${maxFiles} tệp, mỗi tệp ${maxSizeMB}MB`}
                </p>
            </div>

            {/* Error message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        className="file-upload-error"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* File list */}
            {files.length > 0 && (
                <div className="file-upload-list">
                    <AnimatePresence>
                        {files.map((file, index) => (
                            <motion.div
                                key={file.id || index}
                                className="file-upload-item"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className="file-upload-item-icon">
                                    {getFileIcon(file)}
                                </span>
                                <div className="file-upload-item-info">
                                    <span className="file-upload-item-name" title={file.name}>
                                        {file.name}
                                    </span>
                                    <span className="file-upload-item-size">
                                        {formatFileSize(file.size)}
                                        {file.isLocal && ' • Chưa tải lên'}
                                    </span>
                                </div>
                                {!disabled && (
                                    <button
                                        type="button"
                                        className="file-upload-item-remove"
                                        onClick={() => handleRemove(index)}
                                        aria-label={`Xóa ${file.name}`}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

export { FileUpload };
