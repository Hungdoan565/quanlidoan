import { describe, it, expect } from 'vitest';
import { groupStudentsByClass, shouldGroupByClass } from '../utils/groupStudentsByClass';

describe('groupStudentsByClass', () => {
  it('groups students by class code within each health category', () => {
    const input = {
      no_topic: [
        { id: 1, class: { code: 'CS102' } },
        { id: 2, class: { code: 'CS101' } },
        { id: 3, class: { code: 'CS102' } },
      ],
      danger: [],
      attention: [],
      good: [],
    };
    
    const result = groupStudentsByClass(input);
    
    expect(Object.keys(result.no_topic)).toEqual(['CS101', 'CS102']);
    expect(result.no_topic['CS101']).toHaveLength(1);
    expect(result.no_topic['CS102']).toHaveLength(2);
  });

  it('sorts groups alphabetically by class code', () => {
    const input = {
      no_topic: [
        { id: 1, class: { code: 'ZZ999' } },
        { id: 2, class: { code: 'AA100' } },
        { id: 3, class: { code: 'MM500' } },
      ],
      danger: [],
      attention: [],
      good: [],
    };
    
    const result = groupStudentsByClass(input);
    
    expect(Object.keys(result.no_topic)).toEqual(['AA100', 'MM500', 'ZZ999']);
  });

  it('uses "Không xác định" for students without class', () => {
    const input = {
      no_topic: [
        { id: 1, class: null },
        { id: 2, class: undefined },
      ],
      danger: [],
      attention: [],
      good: [],
    };
    
    const result = groupStudentsByClass(input);
    
    expect(result.no_topic['Không xác định']).toHaveLength(2);
  });
});

describe('shouldGroupByClass', () => {
  it('returns true when multiple unique classes exist', () => {
    const students = [
      { class: { code: 'CS101' } },
      { class: { code: 'CS102' } },
    ];
    expect(shouldGroupByClass(students)).toBe(true);
  });

  it('returns false when all students have same class', () => {
    const students = [
      { class: { code: 'CS101' } },
      { class: { code: 'CS101' } },
    ];
    expect(shouldGroupByClass(students)).toBe(false);
  });
});
