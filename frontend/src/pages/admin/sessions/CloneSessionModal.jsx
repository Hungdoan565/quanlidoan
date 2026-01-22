import { useState } from 'react';
import { Copy, Calendar } from 'lucide-react';
import { useDuplicateSession } from '../../../hooks/useSessions';
import { Modal, Select, Button, Input } from '../../../components/ui';

const CLONE_OPTIONS = [
    { value: '1_month', label: '+1 tháng' },
    { value: '3_months', label: '+3 tháng' },
    { value: '6_months', label: '+6 tháng' },
    { value: '1_year', label: '+1 năm học' },
];

/**
 * Tính năm học mới dựa trên option
 */
function calculateNewAcademicYear(currentYear, option) {
    // Parse academic year: "2025-2026" -> [2025, 2026]
    const [startYear, endYear] = currentYear.split('-').map(Number);

    switch (option) {
        case '1_month':
        case '3_months':
        case '6_months':
            // Giữ nguyên năm học, chỉ thay đổi semester/đợt
            return currentYear;
        case '1_year':
        default:
            return `${startYear + 1}-${endYear + 1}`;
    }
}

export function CloneSessionModal({ isOpen, onClose, session }) {
    const [cloneOption, setCloneOption] = useState('1_year');
    const [customName, setCustomName] = useState('');
    const duplicateSession = useDuplicateSession();

    // Reset form when modal opens
    const handleOpen = () => {
        setCloneOption('1_year');
        setCustomName(session?.name ? `${session.name} (Copy)` : '');
    };

    // Handle clone
    const handleClone = async () => {
        if (!session) return;

        const newAcademicYear = calculateNewAcademicYear(session.academic_year, cloneOption);

        await duplicateSession.mutateAsync({
            id: session.id,
            newData: {
                academic_year: newAcademicYear,
                name: customName || `${session.name} (Copy)`,
            },
        });

        onClose();
    };

    if (!session) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onOpen={handleOpen}
            title="Sao chép đợt đồ án"
            size="sm"
        >
            <div className="clone-session-form">
                <div className="form-group">
                    <label>Đợt gốc</label>
                    <div className="original-session">
                        <strong>{session.name}</strong>
                        <span className="text-muted"> - {session.academic_year}</span>
                    </div>
                </div>

                <div className="form-group">
                    <label>Tên đợt mới</label>
                    <Input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder={`${session.name} (Copy)`}
                        leftIcon={<Calendar size={18} />}
                    />
                </div>

                <div className="form-group">
                    <label>Chọn khoảng thời gian</label>
                    <Select
                        options={CLONE_OPTIONS}
                        value={cloneOption}
                        onChange={(e) => setCloneOption(e.target.value)}
                    />
                    <span className="helper-text">
                        Năm học mới: <strong>{calculateNewAcademicYear(session.academic_year, cloneOption)}</strong>
                    </span>
                </div>

                <div className="modal-actions">
                    <Button variant="ghost" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleClone}
                        loading={duplicateSession.isPending}
                        leftIcon={<Copy size={16} />}
                    >
                        Sao chép
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
