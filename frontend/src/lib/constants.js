/**
 * Application constants
 */

export const ROLES = {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
};

export const ROLE_LABELS = {
    admin: 'Quản trị viên',
    teacher: 'Giảng viên',
    student: 'Sinh viên',
};

export const TOPIC_STATUS = {
    PENDING: 'pending',
    REVISION: 'revision',
    APPROVED: 'approved',
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    DEFENDED: 'defended',
    COMPLETED: 'completed',
    REJECTED: 'rejected',
};

export const TOPIC_STATUS_LABELS = {
    pending: 'Chờ duyệt',
    revision: 'Yêu cầu sửa',
    approved: 'Đã duyệt',
    in_progress: 'Đang thực hiện',
    submitted: 'Đã nộp',
    defended: 'Đã bảo vệ',
    completed: 'Hoàn thành',
    rejected: 'Từ chối',
};

export const REPORT_PHASES = {
    REPORT1: 'report1',
    REPORT2: 'report2',
    FINAL: 'final',
    SLIDE: 'slide',
    SOURCE_CODE: 'source_code',
};

export const REPORT_PHASE_LABELS = {
    report1: 'Báo cáo tiến độ 1',
    report2: 'Báo cáo tiến độ 2',
    final: 'Báo cáo cuối kỳ',
    slide: 'Slide thuyết trình',
    source_code: 'Source code',
};

// Grading Types
export const GRADER_TYPES = {
    ADVISOR: 'advisor',
    REVIEWER: 'reviewer',
    COUNCIL: 'council',
};

export const GRADER_TYPE_LABELS = {
    advisor: 'Giảng viên',
    reviewer: 'Giảng viên',
    council: 'Hội đồng',
};

// Council Roles
export const COUNCIL_ROLES = {
    CHAIR: 'chair',
    SECRETARY: 'secretary',
    MEMBER: 'member',
};

export const COUNCIL_ROLE_LABELS = {
    chair: 'Chủ tịch',
    secretary: 'Thư ký',
    member: 'Ủy viên',
};
