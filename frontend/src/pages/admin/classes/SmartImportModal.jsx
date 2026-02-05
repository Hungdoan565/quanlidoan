import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle,
    X,
    Loader2,
    School,
    Users,
    Sparkles
} from 'lucide-react';
import { Modal, Button, Badge, Input, CustomSelect } from '../../../components/ui';
import { useSessions } from '../../../hooks/useSessions';
import { useCreateClass } from '../../../hooks/useClasses';
import classesService from '../../../services/classes.service';
import { toast } from 'sonner';
import './SmartImportModal.css';

/**
 * Smart Import Modal - All-in-one import lớp từ Excel
 * Features:
 * - Auto extract class code from filename
 * - Count students from Excel
 * - Preview before import
 * - Create class + import in one step
 */
export function SmartImportModal({ isOpen, onClose, defaultSessionId = null }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const { data: sessions = [] } = useSessions();
    const createClass = useCreateClass();

    // State
    const [sessionId, setSessionId] = useState(defaultSessionId || '');
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [classCode, setClassCode] = useState('');
    const [className, setClassName] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);
    const [step, setStep] = useState('upload'); // upload | preview | importing | done
    const [importResults, setImportResults] = useState(null);
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);

    // Reset when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setSessionId(defaultSessionId || '');
        }
    }, [isOpen, defaultSessionId]);

    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        setClassCode('');
        setClassName('');
        setValidationErrors([]);
        setStep('upload');
        setImportResults(null);
        setShowOnlyErrors(false);
        onClose();
    };

    // Helper to display clean filename (remove Data(...) prefix)
    const getDisplayFileName = (filename) => {
        if (!filename) return '';
        
        // Remove Data(...) prefix
        let cleanName = filename.replace(/^Data\([^)]*\)\s*-\s*/i, '');
        
        return cleanName;
    };

    // Extract class code and name from filename
    // Support formats:
    // 1. "DH22TIN06.xlsx" -> code: "DH22TIN06", name: ""
    // 2. "Data(010100229806) - Nguyen Ly He Dieu Hanh (DH23TIN03).xlsx" 
    //    -> code: "DH23TIN03", name: "Nguyen Ly He Dieu Hanh"
    const extractClassInfo = (filename) => {
        // Remove extension
        let name = filename.replace(/\.(xlsx|xls)$/i, '').trim();
        
        // Remove "Data(...) - " prefix if exists
        name = name.replace(/^Data\([^)]*\)\s*-\s*/i, '');
        
        // Extract class code from parentheses at the end: "...(DH23TIN03)"
        const codeMatch = name.match(/\(([A-Z0-9]+)\)$/);
        if (codeMatch) {
            const code = codeMatch[1]; // "DH23TIN03"
            const className = name.replace(/\s*\([A-Z0-9]+\)$/, '').trim(); // "Nguyen Ly He Dieu Hanh"
            return { code, className };
        }
        
        // Fallback: use entire name as code
        return { code: name, className: '' };
    };

    // Helper to normalize Vietnamese text
    const normalizeVN = (text) => {
        return String(text || '').toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'd')
            .replace(/\s+/g, '_');
    };

    const cleanStudentCode = (value) => {
        if (value === null || value === undefined) return '';
        let text = String(value).trim();
        if (text.endsWith('.0')) {
            text = text.replace(/\.0$/, '');
        }
        return text;
    };

    const isValidEmail = (email) => {
        if (!email) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    // Handle file selection
    const handleFileChange = useCallback((e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            '.xlsx', '.xls'
        ];

        if (!validTypes.some(type =>
            selectedFile.type === type || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')
        )) {
            setValidationErrors([{ row: 0, message: 'Vui lòng chọn file Excel (.xlsx hoặc .xls)' }]);
            setStep('upload');
            return;
        }

        // Extract class code and name from filename
        const { code, className } = extractClassInfo(selectedFile.name);
        setClassCode(code);
        setClassName(className || code); // Use code as fallback if no name extracted

        setFile(selectedFile);
        setValidationErrors([]);
        setShowOnlyErrors(false);
        parseExcelFile(selectedFile);
    }, []);

    // Parse Excel file
    const parseExcelFile = async (file) => {
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                raw: false,
            });

            if (jsonData.length < 2) {
                setValidationErrors([{ row: 0, message: 'File Excel rỗng hoặc không có dữ liệu' }]);
                setStep('upload');
                return;
            }

            // Find header row
            let headerRowIndex = -1;
            let headers = [];

            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                const row = jsonData[i];
                if (!row || row.length < 2) continue;

                const normalizedRow = row.map(h => normalizeVN(h));
                const hasStudentCode = normalizedRow.some(h =>
                    h.includes('ma_sinh_vien') || h.includes('mssv') || h.includes('ma_sv') ||
                    h === 'ma' || h.includes('masinhvien')
                );
                const hasName = normalizedRow.some(h =>
                    h.includes('ho_dem') || h.includes('hodem') ||
                    h.includes('ho_ten') || h.includes('hoten') ||
                    (h === 'ho' || h === 'ten')
                );

                if (hasStudentCode || hasName) {
                    headerRowIndex = i;
                    headers = normalizedRow;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                for (let i = 0; i < Math.min(5, jsonData.length); i++) {
                    if (jsonData[i] && jsonData[i].length > 2) {
                        headerRowIndex = i;
                        headers = jsonData[i].map(h => normalizeVN(h));
                        break;
                    }
                }
            }

            // Column mapping
            const columnMap = {};
            headers.forEach((h, i) => {
                if (!columnMap.student_code &&
                    (h.includes('ma_sinh_vien') || h.includes('masinhvien') ||
                        h.includes('mssv') || h.includes('ma_sv') ||
                        h === 'ma' || h === 'masv')) {
                    columnMap.student_code = i;
                }
                if (!columnMap.full_name && (h.includes('ho_ten') || h.includes('hoten') || h.includes('ho_va_ten'))) {
                    columnMap.full_name = i;
                }
                if (!columnMap.ho_dem && (h.includes('ho_dem') || h.includes('hodem') || h === 'ho' || h.includes('ho_lot'))) {
                    columnMap.ho_dem = i;
                }
                if (!columnMap.ten && (h === 'ten' || h === 'firstname' || h === 'first_name')) {
                    columnMap.ten = i;
                }
                if (!columnMap.email && (h.includes('email') || h.includes('mail'))) {
                    columnMap.email = i;
                }
                if (!columnMap.phone && (h.includes('sdt') || h.includes('dien_thoai') || h.includes('phone'))) {
                    columnMap.phone = i;
                }
            });

            const hasFullName = columnMap.full_name !== undefined;
            const hasSplitName = columnMap.ho_dem !== undefined || columnMap.ten !== undefined;

            if (columnMap.student_code === undefined) {
                setValidationErrors([{
                    row: 0,
                    message: 'Không tìm thấy cột MSSV. Cần có cột: "Mã sinh viên", "MSSV", hoặc "Mã SV"'
                }]);
                setStep('upload');
                return;
            }

            if (!hasFullName && !hasSplitName) {
                setValidationErrors([{
                    row: 0,
                    message: 'Không tìm thấy cột Họ tên. Cần có: "Họ tên" hoặc "Họ đệm" + "Tên"'
                }]);
                setStep('upload');
                return;
            }

            // Parse data rows
            const students = [];
            let stt = 0;
            const seenCodes = new Set();

            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.every(cell => !cell)) continue;

                const studentCode = cleanStudentCode(row[columnMap.student_code] || '');
                if (!studentCode) continue;

                const normalizedCode = normalizeVN(studentCode);
                if (normalizedCode.includes('tong') || !/^[0-9]+$/.test(studentCode)) {
                    continue;
                }

                let fullName = '';
                if (hasFullName) {
                    fullName = String(row[columnMap.full_name] || '').trim();
                } else if (hasSplitName) {
                    const hoDem = columnMap.ho_dem !== undefined ? String(row[columnMap.ho_dem] || '').trim() : '';
                    const ten = columnMap.ten !== undefined ? String(row[columnMap.ten] || '').trim() : '';
                    fullName = `${hoDem} ${ten}`.trim();
                }

                if (normalizeVN(fullName).includes('tong')) {
                    continue;
                }

                let email = '';
                if (columnMap.email !== undefined) {
                    email = String(row[columnMap.email] || '').trim().toLowerCase();
                }
                if (!email && studentCode) {
                    email = `${studentCode}@student.nctu.edu.vn`;
                }

                const errors = [];
                if (!fullName) errors.push('Thiếu họ tên');
                if (!isValidEmail(email)) errors.push('Email không hợp lệ');
                if (seenCodes.has(studentCode)) errors.push('Trùng MSSV');
                if (!errors.length) {
                    seenCodes.add(studentCode);
                }

                stt++;
                const student = {
                    student_code: studentCode,
                    full_name: fullName,
                    email: email,
                    phone: columnMap.phone !== undefined ? String(row[columnMap.phone] || '').trim() || null : null,
                    row_number: stt,
                    status: errors.length === 0 ? 'valid' : 'error',
                    errors
                };

                students.push(student);
            }

            if (students.length === 0) {
                setValidationErrors([{ row: 0, message: 'Không tìm thấy sinh viên nào trong file' }]);
                setStep('upload');
                return;
            }

            setParsedData(students);
            setValidationErrors([]);
            setStep('preview');
            setShowOnlyErrors(false);

        } catch (error) {
            console.error('Parse error:', error);
            setValidationErrors([{ row: 0, message: `Lỗi đọc file: ${error.message}` }]);
            setStep('upload');
        }
    };

    // Handle create class + import
    const handleSubmit = async () => {
        if (!sessionId) {
            toast.error('Vui lòng chọn đợt đồ án');
            return;
        }
        if (!classCode.trim()) {
            toast.error('Vui lòng nhập mã lớp');
            return;
        }

        const validStudents = parsedData.filter(s => s.status === 'valid');
        if (validStudents.length === 0) {
            toast.error('Không có sinh viên hợp lệ để import');
            return;
        }

        setStep('importing');

        try {
            const existingClass = await classesService.getBySessionAndCode(
                sessionId,
                classCode.trim()
            );

            if (existingClass) {
                toast.error(`Mã lớp "${classCode.trim()}" đã tồn tại trong đợt này. Vui lòng đổi mã lớp hoặc import vào lớp hiện có.`);
                setStep('preview');
                return;
            }

            // Step 1: Create class
            const classData = {
                session_id: sessionId,
                code: classCode.trim(),
                name: className.trim() || classCode.trim(),
                max_students: validStudents.length,
            };

            const newClass = await createClass.mutateAsync(classData);

            // Step 2: Import students to the new class
            const results = await classesService.bulkImportStudents(newClass.id, validStudents);

            // Ensure max_students matches actual added count
            if (results?.added_to_class !== undefined) {
                await classesService.update(newClass.id, {
                    max_students: results.added_to_class,
                });
            }

            setImportResults({
                classId: newClass.id,
                classCode: classCode,
                sessionId,
                sessionName: selectedSession?.name || '',
                ...results
            });
            setStep('done');
            
            // Invalidate queries to refresh UI immediately
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            
            toast.success(`Đã tạo lớp ${classCode} và import ${results.added_to_class} sinh viên!`);

        } catch (error) {
            console.error('Import error:', error);
            toast.error(error.message || 'Lỗi khi tạo lớp và import sinh viên');
            setStep('preview');
        }
    };

    // Stats
    const validCount = parsedData.filter(s => s.status === 'valid').length;
    const errorCount = parsedData.filter(s => s.status === 'error').length;
    const selectedSession = sessions.find(s => s.id === sessionId);

    // Session options
    const sessionOptions = sessions
        .filter(s => s.status === 'open' || s.status === 'draft')
        .map(s => ({ value: s.id, label: `${s.name} (${s.academic_year})` }));

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Import lớp từ Excel"
            size="lg"
        >
            <div className="smart-import-modal">
                {/* Step indicator */}
                <div className="import-steps">
                    <div className={`step ${step === 'upload' ? 'active' : step !== 'upload' ? 'completed' : ''}`}>
                        <span className="step-number">1</span>
                        <span className="step-label">Chọn file</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step ${step === 'preview' ? 'active' : ['importing', 'done'].includes(step) ? 'completed' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-label">Xác nhận</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step ${step === 'done' ? 'active completed' : ''}`}>
                        <span className="step-number">3</span>
                        <span className="step-label">Hoàn thành</span>
                    </div>
                </div>

                {/* Session selection - always visible */}
                <div className="form-group">
                    <label>Đợt đồ án <span className="required">*</span></label>
                    <CustomSelect
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        disabled={step === 'importing' || step === 'done'}
                        options={[
                            { value: '', label: '-- Chọn đợt đồ án --' },
                            ...sessionOptions
                        ]}
                    />
                </div>

                {/* Upload step */}
                {(step === 'upload' || step === 'preview') && (
                    <div
                        className={`upload-zone ${file ? 'has-file' : ''}`}
                        onClick={() => !file && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="hidden-input"
                        />
                        {file ? (
                            <div className="file-info">
                                <FileSpreadsheet size={24} className="file-icon" aria-hidden="true" />
                                <span className="file-name">{getDisplayFileName(file.name)}</span>
<button
                                    className="remove-file"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setParsedData([]);
                                        setClassCode('');
                                        setClassName('');
                                        setValidationErrors([]);
                                        setShowOnlyErrors(false);
                                        setStep('upload');
                                    }}
                                    aria-label="Xóa file"
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                                <Badge variant="success">{validCount} hợp lệ</Badge>
                                {errorCount > 0 && (
                                    <Badge variant="danger">{errorCount} lỗi</Badge>
                                )}
                            </div>
                        ) : (
                            <div className="upload-placeholder">
                                <Upload size={32} className="upload-icon" aria-hidden="true" />
                                <p>Click để chọn file Excel</p>
                                <span className="hint">Hỗ trợ .xlsx, .xls</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Validation errors */}
                {validationErrors.length > 0 && (
                    <div className="validation-errors">
                        {validationErrors.map((err, i) => (
<div key={i} className="error-item">
                                <AlertCircle size={16} aria-hidden="true" />
                                <span>{err.message}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Preview step */}
                {step === 'preview' && parsedData.length > 0 && (
                    <>
                        {/* Class info extracted from Excel */}
                        <div className="extracted-info">
<div className="info-header">
                                <Sparkles size={18} aria-hidden="true" />
                                <span>Thông tin từ Excel</span>
                            </div>
                            <div className="info-grid">
                                <div className="form-group">
                                    <label>Mã lớp <span className="required">*</span></label>
                                    <Input
                                        value={classCode}
                                        onChange={(e) => setClassCode(e.target.value)}
                                        placeholder="VD: DH22TIN06"
                                    />
                                    <span className="hint">Từ tên file</span>
                                </div>
                                <div className="form-group">
                                    <label>Tên lớp</label>
                                    <Input
                                        value={className}
                                        onChange={(e) => setClassName(e.target.value)}
                                        placeholder="VD: Tin học 06 - K22"
                                    />
                                    <span className="hint">Có thể sửa</span>
                                </div>
                                <div className="form-group">
                                    <label>Số sinh viên</label>
<div className="student-count">
                                        <Users size={18} aria-hidden="true" />
                                        <strong>{validCount}</strong>
                                        {errorCount > 0 && (
                                            <span className="error-count">({errorCount} lỗi)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview table */}
                        <div className="preview-section">
                            <div className="preview-header">
                                <h4>Preview ({parsedData.length} sinh viên)</h4>
                                <div className="preview-actions">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowOnlyErrors(prev => !prev)}
                                        disabled={errorCount === 0}
                                    >
                                        {showOnlyErrors ? 'Xem tất cả' : 'Chỉ xem lỗi'}
                                    </Button>
                                </div>
                            </div>
                            <div className="preview-summary">
                                <Badge variant="success">Hợp lệ: {validCount}</Badge>
                                {errorCount > 0 && (
                                    <Badge variant="danger">Lỗi: {errorCount}</Badge>
                                )}
                            </div>
                            <div className="preview-table-container">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>MSSV</th>
                                            <th>Họ tên</th>
                                            <th>Email</th>
                                            <th>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(showOnlyErrors ? parsedData.filter(s => s.status === 'error') : parsedData)
                                            .slice(0, 50)
                                            .map((student, i) => (
                                            <tr key={i} className={student.status === 'error' ? 'row-error' : ''}>
                                                <td>{student.row_number}</td>
                                                <td>{student.student_code}</td>
                                                <td>{student.full_name}</td>
                                                <td>{student.email}</td>
                                                <td>
                                                    {student.status === 'valid' ? (
                                                        <span className="status-ok"><CheckCircle size={14} aria-hidden="true" /> OK</span>
                                                    ) : (
                                                        <span className="status-error"><AlertCircle size={14} aria-hidden="true" /> {student.errors?.join(', ')}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 50 && (
                                    <div className="more-rows">...và {parsedData.length - 50} dòng khác</div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Importing step */}
                {step === 'importing' && (
                    <div className="importing-state">
                        <Loader2 size={48} className="spin" aria-hidden="true" />
                        <h3>Đang tạo lớp và import sinh viên...</h3>
                        <p>Vui lòng đợi, quá trình này có thể mất vài giây</p>
                    </div>
                )}

                {/* Done step */}
                {step === 'done' && importResults && (
                    <div className="done-state">
                        <CheckCircle size={64} className="success-icon" aria-hidden="true" />
                        <h3>Import thành công!</h3>
                        <div className="results-summary">
<div className="result-item">
                                <School size={20} aria-hidden="true" />
                                <span>Lớp: <strong>{importResults.classCode}</strong></span>
                            </div>
                            {importResults.sessionName && (
                                <div className="result-item">
                                    <span>Đợt: <strong>{importResults.sessionName}</strong></span>
                                </div>
                            )}
<div className="result-item">
                                <Users size={20} aria-hidden="true" />
                                <span>Đã thêm: <strong>{importResults.added_to_class}</strong> sinh viên</span>
                            </div>
                            {importResults.created > 0 && (
<div className="result-item">
                                    <Sparkles size={20} aria-hidden="true" />
                                    <span>Tài khoản mới: <strong>{importResults.created}</strong></span>
                                </div>
                            )}
                            {importResults.skipped > 0 && (
                                <div className="result-item">
                                    <span>Đã có sẵn: {importResults.skipped}</span>
                                </div>
                            )}
                        </div>
                        <p className="login-hint">
                            Sinh viên đăng nhập với email <code>MSSV@student.nctu.edu.vn</code> và mật khẩu là <code>MSSV</code>
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="modal-actions">
                    {step === 'done' ? (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    handleClose();
                                    if (importResults?.classId) {
                                        navigate(`/admin/classes/${importResults.classId}`);
                                    }
                                }}
                            >
                                Xem lớp vừa tạo
                            </Button>
                            <Button variant="primary" onClick={handleClose}>
                                Đóng
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={handleClose} disabled={step === 'importing'}>
                                Hủy
                            </Button>
                            {step === 'preview' && (
                                <Button
                                    variant="primary"
                                    onClick={handleSubmit}
                                    disabled={!sessionId || !classCode || validCount === 0}
                                    leftIcon={step === 'importing' ? <Loader2 className="spin" aria-hidden="true" /> : <School aria-hidden="true" />}
                                >
                                    Tạo lớp & Import {validCount} SV
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default SmartImportModal;
