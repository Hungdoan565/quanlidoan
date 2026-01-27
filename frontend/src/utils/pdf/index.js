/**
 * PDF Generator Utility (jspdf-based, browser-native)
 * With Vietnamese font support (Arial) and logo
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ArialRegular } from '../../assets/fonts/arial-base64.js';

// DNC Brand Colors (RGB arrays for jsPDF)
const COLORS = {
    primary: [220, 38, 38],     // DNC Red
    text: [31, 41, 55],
    textSecondary: [107, 114, 128],
    border: [229, 231, 235],
    bgAlt: [249, 250, 251],
};

/**
 * Register Vietnamese-compatible font with jsPDF (Arial with full Unicode)
 */
function registerVietnameseFont(doc) {
    doc.addFileToVFS('Arial.ttf', ArialRegular);
    doc.addFont('Arial.ttf', 'Arial', 'normal');
    doc.setFont('Arial');
}

/**
 * Normalize Vietnamese text to NFC (Canonical Decomposition, followed by Canonical Composition)
 * This ensures characters like 'ọ' are represented as precomposed characters
 */
function vn(text) {
    if (!text) return '';
    return String(text).normalize('NFC');
}

/**
 * Load logo image as base64 with high resolution for sharp PDF
 */
async function loadLogo() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Use higher resolution for sharper image (3x display size)
            const targetWidth = 300; // 3x the display width of 100
            const scale = targetWidth / img.width;
            canvas.width = targetWidth;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            // Enable high quality image rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Use PNG for lossless quality
            resolve(canvas.toDataURL('image/png', 1.0));
        };
        img.onerror = () => resolve(null);
        img.src = '/logo_truong.png';
    });
}

/**
 * Generate Student List PDF with Vietnamese font
 */
export async function generateStudentListPDF(classData) {
    const doc = new jsPDF();
    registerVietnameseFont(doc); // Enable Vietnamese diacritics

    const students = classData.students || [];
    const currentDate = new Date().toLocaleDateString('vi-VN');

    // Add logo - larger with more spacing
    try {
        const logoData = await loadLogo();
        if (logoData) {
            doc.addImage(logoData, 'PNG', 15, 12, 28, 20);
        }
    } catch (e) {
        console.warn('Could not load logo');
    }

    // Header - centered text, logo on left (Vietnamese with diacritics)
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.primary);
    doc.text('TRƯỜNG ĐẠI HỌC NAM CẦN THƠ', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('KHOA CÔNG NGHỆ THÔNG TIN', 105, 25, { align: 'center' });

    // Date on right
    doc.setFontSize(9);
    doc.text(`Ngày in: ${currentDate}`, 195, 32, { align: 'right' });

    // Red line - moved down for more breathing room
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(15, 38, 195, 38);

    // Title - moved down
    doc.setFontSize(15);
    doc.setTextColor(...COLORS.text);
    doc.text('DANH SÁCH SINH VIÊN', 105, 50, { align: 'center' });

    // Class Info - adjusted Y positions (Vietnamese with diacritics)
    doc.setFontSize(10);
    doc.text(`Lớp: ${normalizeText(classData.name || 'N/A')}`, 15, 58);
    doc.text(`Mã lớp: ${classData.code || 'N/A'}`, 15, 65);
    doc.text(`Đợt: ${normalizeText(classData.session?.name || 'N/A')}`, 110, 58);
    doc.text(`Sĩ số: ${students.length} sinh viên`, 110, 65);

    // Student Table (Vietnamese with diacritics)
    const tableData = students.length > 0
        ? students.map((s, idx) => [
            idx + 1,
            s.student_code || 'N/A',
            normalizeText(s.full_name || 'N/A'),
            vn(s.topic?.title) || 'Chưa đăng ký',
            getStatusLabelVi(s.topic?.status),
        ])
        : [['-', '-', 'Chưa có sinh viên', '-', '-']];

    autoTable(doc, {
        startY: 72,
        head: [['STT', 'MSSV', vn('Họ và tên'), vn('Đề tài'), vn('Trạng thái')]],
        body: tableData,
        headStyles: {
            fillColor: COLORS.primary,
            textColor: [255, 255, 255],
            // Use the registered Vietnamese font; avoid bold fallback to default font
            font: 'Arial',
            fontStyle: 'normal',
            fontSize: 9,
        },
        bodyStyles: {
            fontSize: 9,
            textColor: COLORS.text,
        },
        alternateRowStyles: {
            fillColor: COLORS.bgAlt,
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 40 },
            3: { cellWidth: 78 },
            4: { cellWidth: 23, halign: 'center' },
        },
        styles: {
            font: 'Arial',
            fontStyle: 'normal',
            lineColor: COLORS.border,
            lineWidth: 0.1,
            cellPadding: 2,
        },
        margin: { left: 15, right: 15 },
    });

    // Summary (Vietnamese)
    const finalY = (doc.lastAutoTable?.finalY || 200) + 8;
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(
        `Tổng: ${students.length} SV  |  Đã ĐK: ${students.filter(s => s.topic).length}  |  Đã duyệt: ${students.filter(s => s.topic?.status === 'approved').length}`,
        15,
        finalY
    );

    // Footer (Vietnamese)
    doc.setFontSize(8);
    doc.text('Trường Đại học Nam Cần Thơ - Hệ thống Quản lý Đồ án', 15, 287);
    doc.text('Trang 1/1', 195, 287, { align: 'right' });

    // Save
    doc.save(`DanhSach_${classData.code || 'Lop'}.pdf`);
}

/**
 * Generate Evaluation Form PDF with Vietnamese font
 */
export async function generateEvaluationFormPDF(topic) {
    const doc = new jsPDF();
    registerVietnameseFont(doc); // Enable Vietnamese diacritics

    const student = topic.student;
    const teacher = topic.advisor || topic.teacher;
    const currentDate = new Date().toLocaleDateString('vi-VN');

    // Add logo - larger with more spacing
    try {
        const logoData = await loadLogo();
        if (logoData) {
            doc.addImage(logoData, 'PNG', 15, 12, 28, 20);
        }
    } catch (e) {
        console.warn('Could not load logo');
    }

    // Header - centered text, logo on left (Vietnamese)
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.primary);
    doc.text('TRƯỜNG ĐẠI HỌC NAM CẦN THƠ', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('KHOA CÔNG NGHỆ THÔNG TIN', 105, 25, { align: 'center' });

    doc.setFontSize(9);
    doc.text(`Ngày in: ${currentDate}`, 195, 32, { align: 'right' });

    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(15, 38, 195, 38);

    // Title - moved down (Vietnamese)
    doc.setFontSize(15);
    doc.setTextColor(...COLORS.text);
    doc.text('PHIẾU ĐÁNH GIÁ ĐỒ ÁN TỐT NGHIỆP', 105, 50, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('(Giảng viên phụ trách)', 105, 57, { align: 'center' });

    // Student Info Box - adjusted Y positions (Vietnamese)
    doc.setFillColor(...COLORS.bgAlt);
    doc.roundedRect(15, 64, 180, 24, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.text(`Họ và tên: ${normalizeText(student?.full_name || 'N/A')}`, 20, 74);
    doc.text(`MSSV: ${student?.student_code || 'N/A'}`, 110, 74);
    doc.text(`Lớp: ${normalizeText(topic.class?.name || 'N/A')}`, 20, 82);
    doc.text(`GV phụ trách: ${normalizeText(teacher?.full_name || 'N/A')}`, 110, 82);

    // Topic Info Box - adjusted Y positions (Vietnamese)
    doc.setFillColor(...COLORS.bgAlt);
    doc.roundedRect(15, 92, 180, 14, 2, 2, 'F');
    doc.text(`Tên đề tài: ${truncate(topic.title, 85) || 'N/A'}`, 20, 101);

    // Grading Table (Vietnamese)
    const criteria = [
        ['1', 'Nội dung và phạm vi đề tài', '20', ''],
        ['2', 'Phương pháp nghiên cứu', '20', ''],
        ['3', 'Kết quả đạt được', '25', ''],
        ['4', 'Kỹ năng trình bày và bảo vệ', '15', ''],
        ['5', 'Hình thức báo cáo', '10', ''],
        ['6', 'Thái độ và tiến độ thực hiện', '10', ''],
    ];

    autoTable(doc, {
        startY: 112,
        head: [['STT', 'Tiêu chí đánh giá', 'Điểm tối đa', 'Điểm đánh giá']],
        body: criteria,
        foot: [['', 'TỔNG ĐIỂM', '100', '............']],
        headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: [254, 242, 242], textColor: COLORS.text, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: COLORS.text, font: 'Arial' },
        alternateRowStyles: { fillColor: COLORS.bgAlt },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 100 },
            2: { cellWidth: 28, halign: 'center' },
            3: { cellWidth: 32, halign: 'center' },
        },
        styles: { font: 'Arial' },
        margin: { left: 15, right: 15 },
    });

    // Comments (Vietnamese)
    const finalY = (doc.lastAutoTable?.finalY || 200) + 8;
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.text('NHẬN XÉT:', 15, finalY);
    doc.setDrawColor(...COLORS.border);
    doc.rect(15, finalY + 2, 180, 25);

    // Signatures (Vietnamese)
    const sigY = finalY + 38;
    doc.text('GIẢNG VIÊN PHỤ TRÁCH', 55, sigY, { align: 'center' });
    doc.text('XÁC NHẬN CỦA KHOA', 155, sigY, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('(Ký và ghi rõ họ tên)', 55, sigY + 4, { align: 'center' });
    doc.text('(Ký và đóng dấu)', 155, sigY + 4, { align: 'center' });

    // Footer (Vietnamese)
    doc.text(`Ngày in: ${currentDate}`, 15, 287);
    doc.text('Trường Đại học Nam Cần Thơ', 195, 287, { align: 'right' });

    doc.save(`PhieuDanhGia_${student?.student_code || 'SV'}.pdf`);
}

/**
 * Wrapper function
 */
export function generatePDF(type, data) {
    switch (type) {
        case 'studentList': return generateStudentListPDF(data);
        case 'evaluation': return generateEvaluationFormPDF(data.topic || data);
        default: console.error(`Unknown PDF type: ${type}`);
    }
}

// Helpers
function getStatusLabelVi(s) {
    return {
        pending: 'Chờ duyệt',
        approved: 'Đã duyệt',
        in_progress: 'Đang làm',
        revision: 'Cần sửa',
        submitted: 'Đã nộp',
        completed: 'Hoàn thành',
        rejected: 'Từ chối'
    }[s] || 'Chưa ĐK';
}

function truncate(t, n) {
    if (!t) return '';
    return t.length <= n ? t : t.substring(0, n - 3) + '...';
}

/**
 * Normalize text: fix extra spaces between letters
 * e.g., "T r a n H u y n h" -> "Tran Huynh"
 */
function normalizeText(str) {
    if (!str) return '';
    // Check if text has pattern like "T r a n" (single letters separated by spaces)
    // This regex matches: single letter, space, single letter pattern
    const hasExtraSpaces = /^[A-Za-zÀ-ỹ]\s[A-Za-zÀ-ỹ]/.test(str) || /\s[A-Za-zÀ-ỹ]\s[A-Za-zÀ-ỹ]\s/.test(str);

    if (hasExtraSpaces) {
        // Split by double space (word separator) or fall back to heuristic
        const parts = str.split(/\s{2,}/);
        if (parts.length > 1) {
            // Words are separated by double spaces
            return parts.map(p => p.replace(/\s/g, '')).join(' ');
        }
        // Try to detect word boundaries: uppercase after space pattern
        return str.replace(/([A-ZÀ-Ỹ])\s+(?=[a-zà-ỹ])/g, '$1')
            .replace(/([a-zà-ỹ])\s+(?=[a-zà-ỹ])/g, '$1')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }
    return str;
}

function toAscii(str) {
    if (!str) return '';
    // First normalize the text to fix spacing issues
    const normalized = normalizeText(str);
    const map = { 'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a', 'đ': 'd', 'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e', 'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i', 'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o', 'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u', 'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y', 'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A', 'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A', 'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A', 'Đ': 'D', 'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E', 'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E', 'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I', 'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O', 'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O', 'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O', 'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U', 'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U', 'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y' };
    return normalized.split('').map(c => map[c] || c).join('');
}

