import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle,
    X,
    Download,
    Loader2
} from 'lucide-react';
import { Modal, Button, Badge } from '../../../components/ui';
import { useImportStudents } from '../../../hooks/useClasses';
import './ImportStudentsModal.css';

/**
 * Modal để import sinh viên từ file Excel
 */
export function ImportStudentsModal({ isOpen, onClose, classId, existingStudentIds = [] }) {
    const fileInputRef = useRef(null);
    const importStudents = useImportStudents();

    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [validationErrors, setValidationErrors] = useState([]);
    const [step, setStep] = useState('upload'); // upload | preview | importing | done

    // Expected columns
    const EXPECTED_COLUMNS = ['student_code', 'full_name', 'email'];
    const OPTIONAL_COLUMNS = ['phone', 'class_name', 'birth_date', 'gender'];

    // Reset state when modal closes
    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        setValidationErrors([]);
        setStep('upload');
        onClose();
    };

    // Handle file selection
    const handleFileChange = useCallback((e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            '.xlsx',
            '.xls'
        ];

        if (!validTypes.some(type =>
            selectedFile.type === type || selectedFile.name.endsWith(type)
        )) {
            setValidationErrors([{ row: 0, message: 'Vui lòng chọn file Excel (.xlsx hoặc .xls)' }]);
            return;
        }

        setFile(selectedFile);
        parseExcelFile(selectedFile);
    }, []);

    // Parse Excel file - supports multiple formats
    const parseExcelFile = async (file) => {
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });

            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: ''
            });

            if (jsonData.length < 2) {
                setValidationErrors([{ row: 0, message: 'File Excel rỗng hoặc không có dữ liệu' }]);
                return;
            }


            // Find header row (look in first 5 rows)
            let headerRowIndex = -1;
            let headers = [];

            // Helper function to normalize Vietnamese text
            const normalizeVN = (text) => {
                return String(text || '').toLowerCase().trim()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove diacritics FIRST
                    .replace(/đ/g, 'd').replace(/Đ/g, 'd') // Handle đ separately
                    .replace(/\s+/g, '_');
            };

            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                const row = jsonData[i];
                if (!row || row.length < 2) continue;

                const normalizedRow = row.map(h => normalizeVN(h));

                // Debug: log what we're seeing
                console.log(`Row ${i}:`, normalizedRow.slice(0, 6));

                // Check if this row contains student-related headers
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
                    console.log('Found header row at index:', i, headers);
                    break;
                }
            }

            if (headerRowIndex === -1) {
                // Fallback to first row with data
                for (let i = 0; i < Math.min(5, jsonData.length); i++) {
                    if (jsonData[i] && jsonData[i].length > 2) {
                        headerRowIndex = i;
                        headers = jsonData[i].map(h => normalizeVN(h));
                        break;
                    }
                }
            }

            // Column mapping with multiple patterns
            const columnMap = {};

            // Student code - check multiple patterns
            headers.forEach((h, i) => {
                if (!columnMap.student_code &&
                    (h.includes('ma_sinh_vien') || h.includes('masinhvien') ||
                        h.includes('mssv') || h.includes('ma_sv') ||
                        h === 'ma' || h === 'masv')) {
                    columnMap.student_code = i;
                }
            });

            // Full name or split name (Họ đệm + Tên)
            headers.forEach((h, i) => {
                // Full name in one column
                if (!columnMap.full_name &&
                    (h.includes('ho_ten') || h.includes('hoten') ||
                        h === 'ho_va_ten' || h === 'hovaten' || h === 'full_name')) {
                    columnMap.full_name = i;
                }
                // Họ đệm (first part of name)
                if (!columnMap.ho_dem &&
                    (h.includes('ho_dem') || h.includes('hodem') ||
                        h === 'ho' || h === 'holot')) {
                    columnMap.ho_dem = i;
                }
                // Tên (last name / given name)  
                if (!columnMap.ten &&
                    (h === 'ten' || h === 'firstname' || h === 'first_name') &&
                    !h.includes('ho')) {
                    columnMap.ten = i;
                }
            });

            // Email (optional)
            headers.forEach((h, i) => {
                if (h.includes('email') || h.includes('mail')) {
                    columnMap.email = i;
                }
            });

            // Optional columns
            headers.forEach((h, i) => {
                if (h.includes('sdt') || h.includes('dien_thoai') || h.includes('phone') || h.includes('so_dien_thoai')) {
                    columnMap.phone = i;
                }
                if ((h.includes('lop') && !h.includes('hoc_phan')) || h === 'lop_hoc' || h === 'class_name') {
                    columnMap.class_name = i;
                }
                if (h.includes('ngay_sinh') || h.includes('birth') || h.includes('sinh')) {
                    columnMap.birth_date = i;
                }
                if (h.includes('gioi_tinh') || h.includes('gender') || h === 'gioi') {
                    columnMap.gender = i;
                }
            });

            // Check if we can extract name
            const hasFullName = columnMap.full_name !== undefined;
            const hasSplitName = columnMap.ho_dem !== undefined || columnMap.ten !== undefined;
            const hasStudentCode = columnMap.student_code !== undefined;

            if (!hasStudentCode) {
                setValidationErrors([{
                    row: 0,
                    message: 'Không tìm thấy cột MSSV (Mã sinh viên). Cần có cột: "Mã sinh viên", "MSSV", hoặc "Mã SV"'
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

            // Parse data rows (skip header row)
            const errors = [];
            const students = [];
            let stt = 0; // Sequential counter

            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.every(cell => !cell)) continue; // Skip empty rows

                const studentCode = String(row[columnMap.student_code] || '').trim();
                if (!studentCode) continue; // Skip rows without student code

                // Build full name
                let fullName = '';
                if (hasFullName) {
                    fullName = String(row[columnMap.full_name] || '').trim();
                } else if (hasSplitName) {
                    const hoDem = columnMap.ho_dem !== undefined ? String(row[columnMap.ho_dem] || '').trim() : '';
                    const ten = columnMap.ten !== undefined ? String(row[columnMap.ten] || '').trim() : '';
                    fullName = `${hoDem} ${ten}`.trim();
                }

                // Email: use from file or auto-generate
                let email = '';
                if (columnMap.email !== undefined) {
                    email = String(row[columnMap.email] || '').trim().toLowerCase();
                }
                if (!email && studentCode) {
                    // Auto-generate email from student code
                    email = `${studentCode}@dnc.edu.vn`;
                }

                stt++; // Increment counter
                const student = {
                    student_code: studentCode,
                    full_name: fullName,
                    email: email,
                    phone: columnMap.phone !== undefined ? String(row[columnMap.phone] || '').trim() || null : null,
                    class_name: columnMap.class_name !== undefined ? String(row[columnMap.class_name] || '').trim() || null : null,
                    birth_date: columnMap.birth_date !== undefined ? parseDate(row[columnMap.birth_date]) : null,
                    gender: columnMap.gender !== undefined ? parseGender(row[columnMap.gender]) : null,
                    row_number: stt, // Sequential number
                    status: 'valid'
                };

                // Validate
                const rowErrors = [];
                if (!student.student_code) rowErrors.push('Thiếu MSSV');
                if (!student.full_name) rowErrors.push('Thiếu Họ tên');

                if (rowErrors.length > 0) {
                    student.status = 'error';
                    student.errors = rowErrors;
                    errors.push({ row: i + 1, message: rowErrors.join(', ') });
                }

                students.push(student);
            }

            if (students.length === 0) {
                setValidationErrors([{ row: 0, message: 'Không tìm thấy sinh viên nào trong file' }]);
                return;
            }

            // Check for duplicates within file
            const seen = new Set();
            students.forEach(s => {
                if (seen.has(s.student_code)) {
                    s.status = 'warning';
                    s.errors = ['MSSV trùng trong file'];
                } else {
                    seen.add(s.student_code);
                }
            });

            setParsedData(students);
            setValidationErrors(errors);
            setStep('preview');

        } catch (err) {
            console.error('Parse error:', err);
            setValidationErrors([{ row: 0, message: 'Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.' }]);
        }
    };

    // Handle import
    const handleImport = async () => {
        const validStudents = parsedData.filter(s => s.status === 'valid' || s.status === 'warning');

        if (validStudents.length === 0) {
            setValidationErrors([{ row: 0, message: 'Không có sinh viên hợp lệ để import' }]);
            return;
        }

        setStep('importing');

        try {
            await importStudents.mutateAsync({
                classId,
                students: validStudents.map(s => ({
                    student_code: s.student_code,
                    full_name: s.full_name,
                    email: s.email,
                    phone: s.phone,
                    class_name: s.class_name,
                    birth_date: s.birth_date,
                    gender: s.gender,
                }))
            });
            setStep('done');
        } catch (error) {
            setStep('preview');
            setValidationErrors([{ row: 0, message: error.message || 'Lỗi khi import sinh viên' }]);
        }
    };

    // Download template
    const handleDownloadTemplate = () => {
        const template = [
            ['MSSV', 'Họ tên', 'Email', 'SĐT', 'Lớp', 'Ngày sinh', 'Giới tính'],
            ['21200123', 'Nguyễn Văn A', 'nva@dnc.edu.vn', '0901234567', 'K11-CNTT', '15/03/2003', 'Nam'],
            ['21200124', 'Trần Thị B', 'ttb@dnc.edu.vn', '0912345678', 'K11-CNTT', '22/07/2003', 'Nữ'],
        ];

        const ws = XLSX.utils.aoa_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'template_import_sinhvien.xlsx');
    };

    // Stats
    const validCount = parsedData.filter(s => s.status === 'valid').length;
    const warningCount = parsedData.filter(s => s.status === 'warning').length;
    const errorCount = parsedData.filter(s => s.status === 'error').length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Import sinh viên từ Excel"
            size="lg"
        >
            <div className="import-modal-content">
                {/* Upload Step */}
                {step === 'upload' && (
                    <div className="upload-section">
                        <div
                            className="upload-zone"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileSpreadsheet size={48} className="upload-icon" aria-hidden="true" />
                            <p className="upload-text">
                                Kéo thả file Excel hoặc <span>click để chọn file</span>
                            </p>
                            <p className="upload-hint">Hỗ trợ .xlsx, .xls</p>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />

                        <div className="template-section">
                            <p>Chưa có file mẫu?</p>
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Download size={14} aria-hidden="true" />}
                                onClick={handleDownloadTemplate}
                            >
                                Tải template Excel
                            </Button>
                        </div>

                        {validationErrors.length > 0 && (
<div className="error-box">
                                <AlertCircle size={16} aria-hidden="true" />
                                {validationErrors[0].message}
                            </div>
                        )}
                    </div>
                )}

                {/* Preview Step */}
                {step === 'preview' && (
                    <div className="preview-section">
                        <div className="preview-header">
                            <div className="file-info">
                                <FileSpreadsheet size={20} aria-hidden="true" />
                                <span>{file?.name}</span>
<button onClick={() => { setStep('upload'); setFile(null); setParsedData([]); }} aria-label="Xóa file">
                                    <X size={14} aria-hidden="true" />
                                </button>
                            </div>
                            <div className="stats">
                                <Badge variant="success">{validCount} hợp lệ</Badge>
                                {warningCount > 0 && <Badge variant="warning">{warningCount} cảnh báo</Badge>}
                                {errorCount > 0 && <Badge variant="danger">{errorCount} lỗi</Badge>}
                            </div>
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
                                    {parsedData.slice(0, 50).map((student, idx) => (
                                        <tr key={idx} className={`row-${student.status}`}>
                                            <td>{student.row_number}</td>
                                            <td>{student.student_code}</td>
                                            <td>{student.full_name}</td>
                                            <td>{student.email}</td>
                                            <td>
                                                {student.status === 'valid' && (
<span className="status valid">
                                                        <CheckCircle size={14} aria-hidden="true" /> OK
                                                    </span>
                                                )}
                                                {student.status === 'warning' && (
<span className="status warning" title={student.errors?.join(', ')}>
                                                        <AlertCircle size={14} aria-hidden="true" /> {student.errors?.[0]}
                                                    </span>
                                                )}
                                                {student.status === 'error' && (
<span className="status error" title={student.errors?.join(', ')}>
                                                        <AlertCircle size={14} aria-hidden="true" /> {student.errors?.[0]}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {parsedData.length > 50 && (
                                <p className="more-rows">...và {parsedData.length - 50} dòng khác</p>
                            )}
                        </div>

                        <div className="preview-actions">
                            <Button variant="secondary" onClick={() => setStep('upload')}>
                                Chọn file khác
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={validCount + warningCount === 0}
                            >
                                Import {validCount + warningCount} sinh viên
                            </Button>
                        </div>
                    </div>
                )}

                {/* Importing Step */}
                {step === 'importing' && (
                    <div className="importing-section">
                        <Loader2 size={48} className="spinner" aria-hidden="true" />
                        <p>Đang import sinh viên...</p>
                    </div>
                )}

                {/* Done Step */}
                {step === 'done' && (
                    <div className="done-section">
                        <CheckCircle size={48} className="success-icon" aria-hidden="true" />
                        <h3>Import thành công!</h3>
                        <p>Đã thêm {validCount + warningCount} sinh viên vào lớp</p>
                        <Button onClick={handleClose}>Đóng</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}

// Helper functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseDate(value) {
    if (!value) return null;

    // If it's a number (Excel date serial)
    if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
            return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
    }

    // If it's a string like "15/03/2003"
    const str = String(value);
    const match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }

    return null;
}

function parseGender(value) {
    if (!value) return null;
    const str = String(value).toLowerCase().trim();
    if (str === 'nam' || str === 'male' || str === 'm') return 'male';
    if (str === 'nữ' || str === 'nu' || str === 'female' || str === 'f') return 'female';
    return null;
}
