# 🚀 MASTER PLAN: HỆ THỐNG QUẢN LÝ ĐỒ ÁN (RE-VAMP)

> **Trạng thái:** Active  
> **Mô hình:** Solo Student & Unified Lecturer  
> **Ngày cập nhật:** 22/01/2026

---

## 1. THAY ĐỔI CỐT LÕI (CORE CHANGES)

| Yếu tố | Cũ (Deprecated) | Mới (Current) | Tác động hệ thống |
|--------|-----------------|---------------|-------------------|
| **Sinh viên** | Ghép cặp (2 người) | **Solo (1 người/đề tài)** | Bỏ bảng `Group`, Logic `topics` 1-1 với `student`. Tăng cường tính năng tự quản lý. |
| **Giảng viên** | Phân tách HD & PB | **Unified (1 GV trọn gói)** | Bỏ `teacher_pairs`. GVHD chấm cả quá trình & phản biện. Dashboard tập trung. |
| **Quy trình** | Phức tạp nhiều bước duyệt | **Tinh gọn** | Tập trung vào Logbook & Quality Gate để đảm bảo chất lượng đầu ra. |

---

## 2. KIẾN TRÚC NGHIỆP VỤ (BUSINESS ARCHITECTURE)

### 2.1 Role: SINH VIÊN (The Creator)
**Mục tiêu:** Hoàn thành đồ án đúng hạn với chất lượng cao nhất để build Portfolio cá nhân.

*   **Tính năng chính:**
    *   **Dashboard Tiến độ (Personal Roadmap):** Timeline trực quan, đếm ngược deadline, trạng thái % hoàn thành.
    *   **Smart Logbook:** Báo cáo tiến độ tuần. Tự động nhắc nhở nếu quên check-in.
    *   **Topic Registration:** Đăng ký đề tài (chọn từ mẫu của GV hoặc tự đề xuất).
    *   **Submission Vault:** Nộp báo cáo từng giai đoạn (Draft -> Final). Hệ thống versioning lưu lại các lần sửa.

### 2.2 Role: GIẢNG VIÊN (The Mentor)
**Mục tiêu:** Quản lý hiệu quả số lượng lớn SV, đảm bảo chất lượng mà không bị overload.

*   **Tính năng chính:**
    *   **Mentee Management (Kanban):** Quản lý toàn bộ SV theo trạng thái (Ổn / Cần chú ý / Nguy hiểm).
    *   **Logbook Review:** Duyệt nhật ký nhanh, comment trực tiếp.
    *   **Grading System:** Chấm điểm quá trình & điểm phản biện trên cùng 1 giao diện.
    *   **Topic Bank:** Quản lý kho đề tài mẫu.

### 2.3 Role: ADMIN (The Operator)
**Mục tiêu:** Vận hành trơn tru, phân bổ nguồn lực tối ưu.

*   **Tính năng chính:**
    *   **Session Management:** Tạo đợt đồ án, config deadline cứng.
    *   **Auto-Assignment:** Phân công GV hướng dẫn dựa trên chuyên môn/số lượng slot.
    *   **Council Scheduling:** Xếp lịch hội đồng bảo vệ (Kéo thả, check trùng lịch).

---

## 3. CẤU TRÚC DỮ LIỆU (DATABASE SCHEMA PLAN)

Các thay đổi cần thực hiện trong Supabase để đáp ứng nghiệp vụ mới:

### 3.1 Bảng cần XÓA/SỬA
*   ❌ **DROP** `teacher_pairs` (Không còn cặp GV).
*   ❌ **DROP** cột `reviewer_id` trong bảng `topics` (GVHD kiêm nhiệm).
*   ✏️ **MODIFY** bảng `topics`: Đảm bảo `student_id` là Unique Key (1 SV chỉ 1 đề tài active).
*   ✏️ **MODIFY** bảng `grades`: Update Enum `grader_role` chỉ còn `advisor` và `council`.

### 3.2 Bảng Mới/Nâng cấp
*   ✅ **Table `milestones` (Mới):** Lưu các mốc quan trọng của cá nhân SV (nếu phát triển tính năng Roadmap).
*   ✅ **Table `audit_logs`:** Ghi lại mọi thao tác quan trọng (Nộp bài, Chấm điểm) để minh bạch hóa (vì giờ chỉ có 1 GV chấm, cần log kỹ để tra soát).

---

## 4. LỘ TRÌNH PHÁT TRIỂN (DEVELOPMENT ROADMAP)

### Phase 1: Clean & Migrate (Tuần 1)
- [ ] Backup dữ liệu cũ.
- [ ] Chạy migration script xóa bỏ các bảng/cột thừa (`teacher_pairs`, `reviewer_id`).
- [ ] Update lại Seed Data cho phù hợp model mới.

### Phase 2: Feature Upgrade - Student (Tuần 2)
- [ ] Xây dựng lại Dashboard Sinh viên (Focus vào Timeline cá nhân).
- [ ] Nâng cấp Flow đăng ký đề tài (Validate 1-1 chặt chẽ).

### Phase 3: Feature Upgrade - Lecturer (Tuần 3)
- [ ] Xây dựng "Super Dashboard" cho GV (Gộp view Hướng dẫn cũ).
- [ ] Làm tính năng "Bulk Action" (Duyệt nhanh logbook).

### Phase 4: Admin & Optimization (Tuần 4)
- [ ] Làm lại thuật toán phân công (Auto-assign).
- [ ] Testing & Security Audit.

---

## 5. TECH STACK
*   **Frontend:** React + Vite + Tailwind CSS + Shadcn UI.
*   **Backend:** Supabase (Auth, Postgres, Realtime, Storage).
*   **State Management:** Zustand / TanStack Query.
*   **Form:** React Hook Form + Zod.

---
> *Tài liệu này thay thế toàn bộ các documents cũ (PRD, Workflow...) để bám sát thực tế triển khai.*
