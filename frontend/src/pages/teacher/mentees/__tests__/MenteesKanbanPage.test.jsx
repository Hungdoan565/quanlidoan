import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenteesKanbanPage } from '../MenteesKanbanPage';
import { BrowserRouter } from 'react-router-dom';

// Mock hooks
const mockUseAllMyStudents = vi.fn();
const mockUseMyStudentsLogbook = vi.fn();

vi.mock('../../../../hooks/useTeacher', () => ({
    useAllMyStudents: () => mockUseAllMyStudents()
}));

vi.mock('../../../../hooks/useLogbook', () => ({
    useMyStudentsLogbook: () => mockUseMyStudentsLogbook()
}));

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        info: vi.fn(),
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('MenteesKanbanPage Class Selection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock return
        mockUseMyStudentsLogbook.mockReturnValue({
            data: [],
            isLoading: false
        });
    });

    it('shows class selection overlay when classes > 1 and not selected', () => {
        // Mock multiple classes
        mockUseAllMyStudents.mockReturnValue({
            data: {
                students: [
                    { id: 1, class_id: 'c1', status: 'approved', topic: { id: 't1' } },
                    { id: 2, class_id: 'c2', status: 'approved', topic: { id: 't2' } }
                ],
                classes: [
                    { id: 'c1', code: 'CLASS1', name: 'Class 1' },
                    { id: 'c2', code: 'CLASS2', name: 'Class 2' }
                ]
            },
            isLoading: false,
            error: null
        });

        render(
            <BrowserRouter>
                <MenteesKanbanPage />
            </BrowserRouter>
        );

        expect(screen.getByText('Chọn lớp để xem')).toBeInTheDocument();
        expect(screen.getByText(/Bạn đang phụ trách 2 lớp/)).toBeInTheDocument();
        expect(screen.getByText('CLASS1 - Class 1')).toBeInTheDocument();
        expect(screen.getByText('CLASS2 - Class 2')).toBeInTheDocument();
    });

    it('auto-selects when only 1 class via useEffect', () => {
        // Mock single class
        mockUseAllMyStudents.mockReturnValue({
            data: {
                students: [
                    { id: 1, class_id: 'c1', status: 'approved', topic: { id: 't1' } }
                ],
                classes: [
                    { id: 'c1', code: 'CLASS1', name: 'Class 1' }
                ]
            },
            isLoading: false,
            error: null
        });

        render(
            <BrowserRouter>
                <MenteesKanbanPage />
            </BrowserRouter>
        );

        // Should NOT show overlay
        expect(screen.queryByText('Chọn lớp để xem')).not.toBeInTheDocument();
        // Should show the board header
        expect(screen.getByText('Theo dõi Sinh viên')).toBeInTheDocument();
    });

    it('shows board after class button clicked', () => {
        mockUseAllMyStudents.mockReturnValue({
            data: {
                students: [
                    { id: 1, class_id: 'c1', status: 'approved', topic: { id: 't1' } },
                    { id: 2, class_id: 'c2', status: 'approved', topic: { id: 't2' } }
                ],
                classes: [
                    { id: 'c1', code: 'CLASS1', name: 'Class 1' },
                    { id: 'c2', code: 'CLASS2', name: 'Class 2' }
                ]
            },
            isLoading: false,
            error: null
        });

        render(
            <BrowserRouter>
                <MenteesKanbanPage />
            </BrowserRouter>
        );

        // Click on Class 1 button
        fireEvent.click(screen.getByText('CLASS1 - Class 1'));

        // Overlay should disappear
        expect(screen.queryByText('Chọn lớp để xem')).not.toBeInTheDocument();
    });

    it('sets selectedClass to "all" when "Xem tất cả lớp" clicked', () => {
        mockUseAllMyStudents.mockReturnValue({
            data: {
                students: [
                    { id: 1, class_id: 'c1', status: 'approved', topic: { id: 't1' } },
                    { id: 2, class_id: 'c2', status: 'approved', topic: { id: 't2' } }
                ],
                classes: [
                    { id: 'c1', code: 'CLASS1', name: 'Class 1' },
                    { id: 'c2', code: 'CLASS2', name: 'Class 2' }
                ]
            },
            isLoading: false,
            error: null
        });

        render(
            <BrowserRouter>
                <MenteesKanbanPage />
            </BrowserRouter>
        );

        // Click "Xem tất cả lớp"
        fireEvent.click(screen.getByText('Xem tất cả lớp'));

        // Overlay should disappear
        expect(screen.queryByText('Chọn lớp để xem')).not.toBeInTheDocument();
    });
});
