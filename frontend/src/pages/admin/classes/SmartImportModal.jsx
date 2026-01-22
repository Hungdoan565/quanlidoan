import { useState, useCallback, useRef, useEffect } from 'react';
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
import { Modal, Button, Badge, Input, Select } from '../../../components/ui';
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
        onClose();
    };

    // Extract class code from filename (e.g., "DH22TIN06.xlsx" -> "DH22TIN06")
    const extractClassCode = (filename) => {
        return filename.replace(/\.(xlsx|xls)$/i, '').trim();
    };

    // Helper to normalize Vietnamese text
    const normalizeVN = (text) => {
        return String(text || '').toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'd')
            .replace(/\s+/g, '_');
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
            return;
        }

        // Extract class code from filename
        const extractedCode = extractClassCode(selectedFile.name);
        setClassCode(extractedCode);
        setClassName(extractedCode);

        setFile(selectedFile);
        parseExcelFile(selectedFile);
    }, []);

    // Parse Excel file
    const parseExcelFile = async (file) => {
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (jsonData.length < 2) {
                setValidationErrors([{ row: 0, message: 'File Excel rỗng hoặc không có dữ liệu' }]);
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
                return;
            }

            if (!hasFullName && !hasSplitName) {
                setValidationErrors([{
                    row: 0,
                    message: 'Không tìm thấy cột Họ tên. Cần có: "Họ tên" hoặc "Họ đệm" + "Tên"'
                }]);
                return;
            }

            // Parse data rows
            const students = [];
            let stt = 0;

            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.every(cell => !cell)) continue;

                const studentCode = String(row[columnMap.student_code] || '').trim();
                if (!studentCode) continue;

                let fullName = '';
                if (hasFullName) {
                    fullName = String(row[columnMap.full_name] || '').trim();
                } else if (hasSplitName) {
                    const hoDem = columnMap.ho_dem !== undefined ? String(row[columnMap.ho_dem] || '').trim() : '';
                    const ten = columnMap.ten !== undefined ? String(row[columnMap.ten] || '').trim() : '';
                    fullName = `${hoDem} ${ten}`.trim();
                }

                let email = '';
                if (columnMap.email !== undefined) {
                    email = String(row[columnMap.email] || '').trim().toLowerCase();
                }
                if (!email && studentCode) {
                    email = `${studentCode}@dnc.edu.vn`;
                }

                stt++;
                const student = {
                    student_code: studentCode,
                    full_name: fullName,
                    email: email,
                    phone: columnMap.phone !== undefined ? String(row[columnMap.phone] || '').trim() || null : null,
                    row_number: stt,
                    status: fullName ? 'valid' : 'error',
                    errors: fullName ? [] : ['Thiếu họ tên']
                };

                students.push(student);
            }

            if (students.length === 0) {
                setValidationErrors([{ row: 0, message: 'Không tìm thấy sinh viên nào trong file' }]);
                return;
            }

            setParsedData(students);
            setValidationErrors([]);
            setStep('preview');

        } catch (error) {
            console.error('Parse error:', error);
            setValidationErrors([{ row: 0, message: `Lỗi đọc file: ${error.message}` }]);
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
            // Step 1: Create class
            const classData = {
                session_id: sessionId,
                class_code: classCode.trim(),
                class_name: className.trim() || classCode.trim(),
                max_students: validStudents.length + 5, // Add buffer
            };

            const newClass = await createClass.mutateAsync(classData);

            // Step 2: Import students to the new class
            const results = await classesService.bulkImportStudents(newClass.id, validStudents);

            setImportResults({
                classId: newClass.id,
                classCode: classCode,
                ...results
            });
            setStep('done');
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

    // Session options
    const sessionOptions = sessions
        .filter(s => s.status === 'active' || s.status === 'upcoming')
        .map(s => ({ value: s.id, label: `${s.session_name} (${s.academic_year})` }));

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
                    <Select
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        disabled={step === 'importing' || step === 'done'}
                    >
                        <option value="">-- Chọn đợt đồ án --</option>
                        {sessionOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>
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
                                <FileSpreadsheet size={24} className="file-icon" />
                                <span className="file-name">{file.name}</span>
                                <button
                                    className="remove-file"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setParsedData([]);
                                        setClassCode('');
                                        setClassName('');
                                        setStep('upload');
                                    }}
                                >
                                    <X size={16} />
                                </button>
                                <Badge variant="success">{validCount} hợp lệ</Badge>
                            </div>
                        ) : (
                            <div className="upload-placeholder">
                                <Upload size={32} className="upload-icon" />
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
                                <AlertCircle size={16} />
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
                                <Sparkles size={18} />
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
                                        <Users size={18} />
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
                            <h4>Preview ({parsedData.length} sinh viên)</h4>
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
                                        {parsedData.slice(0, 50).map((student, i) => (
                                            <tr key={i} className={student.status === 'error' ? 'row-error' : ''}>
                                                <td>{student.row_number}</td>
                                                <td>{student.student_code}</td>
                                                <td>{student.full_name}</td>
                                                <td>{student.email}</td>
                                                <td>
                                                    {student.status === 'valid' ? (
                                                        <span className="status-ok"><CheckCircle size={14} /> OK</span>
                                                    ) : (
                                                        <span className="status-error"><AlertCircle size={14} /> {student.errors?.join(', ')}</span>
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
                        <Loader2 size={48} className="spin" />
                        <h3>Đang tạo lớp và import sinh viên...</h3>
                        <p>Vui lòng đợi, quá trình này có thể mất vài giây</p>
                    </div>
                )}

                {/* Done step */}
                {step === 'done' && importResults && (
                    <div className="done-state">
                        <CheckCircle size={64} className="success-icon" />
                        <h3>Import thành công!</h3>
                        <div className="results-summary">
                            <div className="result-item">
                                <School size={20} />
                                <span>Lớp: <strong>{importResults.classCode}</strong></span>
                            </div>
                            <div className="result-item">
                                <Users size={20} />
                                <span>Đã thêm: <strong>{importResults.added_to_class}</strong> sinh viên</span>
                            </div>
                            {importResults.created > 0 && (
                                <div className="result-item">
                                    <Sparkles size={20} />
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
                            Sinh viên đăng nhập với email <code>MSSV@dnc.edu.vn</code> và mật khẩu là <code>MSSV</code>
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="modal-actions">
                    {step === 'done' ? (
                        <Button variant="primary" onClick={handleClose}>
                            Đóng
                        </Button>
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
                                    leftIcon={step === 'importing' ? <Loader2 className="spin" /> : <School />}
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
