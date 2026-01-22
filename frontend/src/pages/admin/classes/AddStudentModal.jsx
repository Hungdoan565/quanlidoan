import { useState } from 'react';
import { Search, UserPlus, Check } from 'lucide-react';
import { useStudents } from '../../../hooks/useUsers';
import { useAddStudentToClass, useImportStudents } from '../../../hooks/useClasses';
import { Modal, Input, Button, Badge } from '../../../components/ui';

export function AddStudentModal({ isOpen, onClose, classId, sessionId, existingStudentIds = [] }) {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    const { data: allStudents = [], isLoading } = useStudents({ activeOnly: true });
    const addStudent = useAddStudentToClass();
    const importStudents = useImportStudents();

    // Filter out existing students and by search
    const availableStudents = allStudents.filter(s => {
        if (existingStudentIds.includes(s.id)) return false;
        if (!search) return true;
        return (
            s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            s.student_code?.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase())
        );
    });

    // Toggle selection
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    // Select all visible
    const selectAll = () => {
        const visibleIds = availableStudents.map(s => s.id);
        setSelectedIds(prev => {
            const allSelected = visibleIds.every(id => prev.includes(id));
            if (allSelected) {
                return prev.filter(id => !visibleIds.includes(id));
            }
            return [...new Set([...prev, ...visibleIds])];
        });
    };

    // Add selected students
    const handleAdd = async () => {
        if (selectedIds.length === 0) return;

        if (selectedIds.length === 1) {
            await addStudent.mutateAsync({ classId, studentId: selectedIds[0] });
        } else {
            await importStudents.mutateAsync({ classId, studentIds: selectedIds });
        }

        setSelectedIds([]);
        setSearch('');
        onClose();
    };

    const handleClose = () => {
        setSelectedIds([]);
        setSearch('');
        onClose();
    };

    const isAdding = addStudent.isPending || importStudents.isPending;
    const allVisibleSelected = availableStudents.length > 0 &&
        availableStudents.every(s => selectedIds.includes(s.id));

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Thêm sinh viên vào lớp"
            size="lg"
        >
            <div className="add-student-modal">
                {/* Search */}
                <div className="search-header">
                    <Input
                        placeholder="Tìm theo tên, MSSV hoặc email..."
                        leftIcon={<Search size={18} />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {availableStudents.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAll}
                        >
                            {allVisibleSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </Button>
                    )}
                </div>

                {/* Selected count */}
                {selectedIds.length > 0 && (
                    <div className="selected-count">
                        <Badge variant="primary">{selectedIds.length} sinh viên được chọn</Badge>
                    </div>
                )}

                {/* Students list */}
                <div className="students-list">
                    {isLoading ? (
                        <div className="loading-text">Đang tải...</div>
                    ) : availableStudents.length === 0 ? (
                        <div className="empty-text">
                            {search ? 'Không tìm thấy sinh viên phù hợp' : 'Tất cả sinh viên đã được thêm vào lớp'}
                        </div>
                    ) : (
                        availableStudents.map(student => (
                            <div
                                key={student.id}
                                className={`student-item ${selectedIds.includes(student.id) ? 'selected' : ''}`}
                                onClick={() => toggleSelect(student.id)}
                            >
                                <div className="student-checkbox">
                                    {selectedIds.includes(student.id) && <Check size={14} />}
                                </div>
                                <div className="student-info">
                                    <span className="student-name">{student.full_name}</span>
                                    <span className="student-details">
                                        {student.student_code} • {student.email}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Actions */}
                <div className="modal-actions">
                    <Button variant="ghost" onClick={handleClose}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleAdd}
                        loading={isAdding}
                        disabled={selectedIds.length === 0}
                        leftIcon={<UserPlus size={16} />}
                    >
                        Thêm {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
