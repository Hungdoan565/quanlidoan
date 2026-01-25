import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleCardGroup } from '../CollapsibleCardGroup';

const mockStudents = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  student: { full_name: `Student ${i + 1}` },
}));

const renderCard = (student) => (
  <div data-testid={`card-${student.id}`}>{student.student.full_name}</div>
);

describe('CollapsibleCardGroup', () => {
  it('shows only threshold cards initially', () => {
    render(
      <CollapsibleCardGroup
        title="Test Class"
        students={mockStudents}
        threshold={8}
        renderCard={renderCard}
      />
    );

    // Should show 8 cards
    expect(screen.getAllByTestId(/^card-/)).toHaveLength(8);
  });

  it('shows "Xem thêm N sinh viên" button when cards > threshold', () => {
    render(
      <CollapsibleCardGroup
        title="Test Class"
        students={mockStudents}
        threshold={8}
        renderCard={renderCard}
      />
    );

    expect(screen.getByText('Xem thêm 4 sinh viên')).toBeInTheDocument();
  });

  it('expands to show all cards when button clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <CollapsibleCardGroup
        title="Test Class"
        students={mockStudents}
        threshold={8}
        renderCard={renderCard}
      />
    );

    await user.click(screen.getByText('Xem thêm 4 sinh viên'));

    // Should now show all 12 cards
    expect(screen.getAllByTestId(/^card-/)).toHaveLength(12);
    expect(screen.getByText('Thu gọn')).toBeInTheDocument();
  });

  it('hides expand button when cards <= threshold', () => {
    const fewStudents = mockStudents.slice(0, 5);
    
    render(
      <CollapsibleCardGroup
        title="Test Class"
        students={fewStudents}
        threshold={8}
        renderCard={renderCard}
      />
    );

    expect(screen.queryByText(/Xem thêm/)).not.toBeInTheDocument();
  });

  it('does not render when students array is empty', () => {
    const { container } = render(
      <CollapsibleCardGroup
        title="Test Class"
        students={[]}
        threshold={8}
        renderCard={renderCard}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  describe('Reordering', () => {
    it('resets order when students prop changes', async () => {
      const { rerender } = render(
        <CollapsibleCardGroup
          title="Test Class"
          students={mockStudents.slice(0, 3)}
          threshold={8}
          renderCard={renderCard}
          reorderable={true}
        />
      );

      // Rerender with different students
      const newStudents = [{ id: 99, student: { full_name: 'New Student' } }];
      rerender(
        <CollapsibleCardGroup
          title="Test Class"
          students={newStudents}
          threshold={8}
          renderCard={renderCard}
          reorderable={true}
        />
      );

      expect(screen.getByTestId('card-99')).toBeInTheDocument();
      expect(screen.queryByTestId('card-1')).not.toBeInTheDocument();
    });

    it('renders drag handles when reorderable is true', () => {
      render(
        <CollapsibleCardGroup
          title="Test Class"
          students={mockStudents.slice(0, 3)}
          threshold={8}
          renderCard={renderCard}
          reorderable={true}
        />
      );

      expect(screen.getAllByLabelText('Kéo để sắp xếp lại')).toHaveLength(3);
    });

    it('does not render drag handles when reorderable is false', () => {
      render(
        <CollapsibleCardGroup
          title="Test Class"
          students={mockStudents.slice(0, 3)}
          threshold={8}
          renderCard={renderCard}
          reorderable={false}
        />
      );

      expect(screen.queryByLabelText('Kéo để sắp xếp lại')).not.toBeInTheDocument();
    });
  });
});
