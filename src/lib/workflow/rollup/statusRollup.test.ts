import { describe, it, expect } from 'vitest';
import { aggregateMemberStatuses, deriveRequirementStatusFromTasks } from './statusRollup';

describe('statusRollup', () => {
  describe('aggregateMemberStatuses', () => {
    it('should return Assigned for empty array', () => {
      expect(aggregateMemberStatuses([])).toBe('Assigned');
    });

    it('should return Assigned for null/undefined input', () => {
      expect(aggregateMemberStatuses(null as any)).toBe('Assigned');
      expect(aggregateMemberStatuses(undefined as any)).toBe('Assigned');
    });

    it('should return In_Progress if any member is In_Progress', () => {
      expect(aggregateMemberStatuses([
        { status: 'In_Progress' },
        { status: 'Assigned' },
      ])).toBe('In_Progress');
    });

    it('should return In_Progress even if some are Completed', () => {
      expect(aggregateMemberStatuses([
        { status: 'In_Progress' },
        { status: 'Completed' },
      ])).toBe('In_Progress');
    });

    it('should return Completed only when ALL members are Completed', () => {
      expect(aggregateMemberStatuses([
        { status: 'Completed' },
        { status: 'Completed' },
      ])).toBe('Completed');
    });

    it('should not return Completed if only some members are Completed', () => {
      expect(aggregateMemberStatuses([
        { status: 'Completed' },
        { status: 'Review' },
      ])).not.toBe('Completed');
    });

    it('should return Review if any member is in Review (and none In_Progress)', () => {
      expect(aggregateMemberStatuses([
        { status: 'Review' },
        { status: 'Assigned' },
      ])).toBe('Review');
    });

    it('should return Delayed if any member is Delayed (and none In_Progress/Review)', () => {
      expect(aggregateMemberStatuses([
        { status: 'Delayed' },
        { status: 'Assigned' },
      ])).toBe('Delayed');
    });

    it('should return Assigned as default fallback', () => {
      expect(aggregateMemberStatuses([
        { status: 'Assigned' },
        { status: 'Assigned' },
      ])).toBe('Assigned');
    });

    it('should prioritize In_Progress over Review', () => {
      expect(aggregateMemberStatuses([
        { status: 'In_Progress' },
        { status: 'Review' },
      ])).toBe('In_Progress');
    });

    it('should prioritize Review over Delayed', () => {
      expect(aggregateMemberStatuses([
        { status: 'Review' },
        { status: 'Delayed' },
      ])).toBe('Review');
    });

    it('should handle single member', () => {
      expect(aggregateMemberStatuses([{ status: 'Completed' }])).toBe('Completed');
    });
  });

  describe('deriveRequirementStatusFromTasks', () => {
    it('should return Assigned for empty array', () => {
      expect(deriveRequirementStatusFromTasks([])).toBe('Assigned');
    });

    it('should return Assigned for null/undefined input', () => {
      expect(deriveRequirementStatusFromTasks(null as any)).toBe('Assigned');
      expect(deriveRequirementStatusFromTasks(undefined as any)).toBe('Assigned');
    });

    it('should return Revision if any revision task is not completed', () => {
      expect(deriveRequirementStatusFromTasks([
        { status: 'Completed', isRevision: false },
        { status: 'In_Progress', isRevision: true },
      ])).toBe('Revision');
    });

    it('should not return Revision if revision task is completed', () => {
      expect(deriveRequirementStatusFromTasks([
        { status: 'Completed', isRevision: true },
        { status: 'Completed', isRevision: false },
      ])).not.toBe('Revision');
    });

    it('should return Review when all tasks are completed', () => {
      expect(deriveRequirementStatusFromTasks([
        { status: 'Completed', isRevision: false },
        { status: 'Completed', isRevision: false },
      ])).toBe('Review');
    });

    it('should return In_Progress if any task is in progress', () => {
      expect(deriveRequirementStatusFromTasks([
        { status: 'In_Progress', isRevision: false },
        { status: 'Assigned', isRevision: false },
      ])).toBe('In_Progress');
    });

    it('should return Assigned as default', () => {
      expect(deriveRequirementStatusFromTasks([
        { status: 'Assigned', isRevision: false },
      ])).toBe('Assigned');
    });

    it('should prioritize Revision over Review', () => {
      expect(deriveRequirementStatusFromTasks([
        { status: 'Completed', isRevision: false },
        { status: 'Assigned', isRevision: true },
      ])).toBe('Revision');
    });
  });
});
