import { describe, it, expect, vi, afterEach } from 'vitest';
import { isRequirementOverdue, getOverdueRequirementIds } from './requirementOverdue';

describe('requirementOverdue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isRequirementOverdue', () => {
    it('should return false for null end date', () => {
      expect(isRequirementOverdue('In_Progress', null)).toBe(false);
    });

    it('should return false for undefined end date', () => {
      expect(isRequirementOverdue('In_Progress', undefined)).toBe(false);
    });

    it('should return false for TBD end date', () => {
      expect(isRequirementOverdue('In_Progress', 'TBD')).toBe(false);
    });

    it('should return false for invalid date string', () => {
      expect(isRequirementOverdue('In_Progress', 'not-a-date')).toBe(false);
    });

    it('should return true for past date with eligible status', () => {
      expect(isRequirementOverdue('In_Progress', '2020-01-01')).toBe(true);
      expect(isRequirementOverdue('Assigned', '2020-01-01')).toBe(true);
      expect(isRequirementOverdue('Review', '2020-01-01')).toBe(true);
      expect(isRequirementOverdue('Revision', '2020-01-01')).toBe(true);
    });

    it('should return false for past date with ineligible status', () => {
      expect(isRequirementOverdue('Completed', '2020-01-01')).toBe(false);
      expect(isRequirementOverdue('Delayed', '2020-01-01')).toBe(false);
      expect(isRequirementOverdue('On_Hold', '2020-01-01')).toBe(false);
      expect(isRequirementOverdue('Draft', '2020-01-01')).toBe(false);
      expect(isRequirementOverdue('Waiting', '2020-01-01')).toBe(false);
      expect(isRequirementOverdue('Submitted', '2020-01-01')).toBe(false);
      expect(isRequirementOverdue('Rejected', '2020-01-01')).toBe(false);
    });

    it('should return false for future date', () => {
      expect(isRequirementOverdue('In_Progress', '2099-12-31')).toBe(false);
    });

    it('should return false for today date (still has time)', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isRequirementOverdue('In_Progress', today)).toBe(false);
    });
  });

  describe('getOverdueRequirementIds', () => {
    it('should return empty array for empty input', () => {
      expect(getOverdueRequirementIds([])).toEqual([]);
    });

    it('should return IDs of overdue requirements only', () => {
      const requirements = [
        { id: 1, status: 'In_Progress', end_date: '2020-01-01' },
        { id: 2, status: 'Completed', end_date: '2020-01-01' },
        { id: 3, status: 'Assigned', end_date: '2020-06-01' },
        { id: 4, status: 'In_Progress', end_date: '2099-12-31' },
      ];
      const result = getOverdueRequirementIds(requirements);
      expect(result).toContain(1);
      expect(result).toContain(3);
      expect(result).not.toContain(2);
      expect(result).not.toContain(4);
    });

    it('should handle requirements with null end_date', () => {
      const requirements = [
        { id: 1, status: 'In_Progress', end_date: null },
        { id: 2, status: 'In_Progress' },
      ];
      expect(getOverdueRequirementIds(requirements)).toEqual([]);
    });
  });
});
