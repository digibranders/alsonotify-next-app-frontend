import { describe, it, expect } from 'vitest';
import { isTaskTransitionValid, getAllowedTaskTransitions, isTaskStatus, TASK_TRANSITIONS } from './taskWorkflow';

describe('taskWorkflow', () => {
  describe('TASK_TRANSITIONS', () => {
    it('should define transitions for all 5 statuses', () => {
      expect(Object.keys(TASK_TRANSITIONS)).toHaveLength(5);
      expect(TASK_TRANSITIONS).toHaveProperty('Assigned');
      expect(TASK_TRANSITIONS).toHaveProperty('In_Progress');
      expect(TASK_TRANSITIONS).toHaveProperty('Review');
      expect(TASK_TRANSITIONS).toHaveProperty('Delayed');
      expect(TASK_TRANSITIONS).toHaveProperty('Completed');
    });
  });

  describe('isTaskTransitionValid', () => {
    it('should allow Assigned -> In_Progress', () => {
      expect(isTaskTransitionValid('Assigned', 'In_Progress')).toBe(true);
    });

    it('should allow Assigned -> Delayed', () => {
      expect(isTaskTransitionValid('Assigned', 'Delayed')).toBe(true);
    });

    it('should not allow Assigned -> Completed (must go through In_Progress)', () => {
      expect(isTaskTransitionValid('Assigned', 'Completed')).toBe(false);
    });

    it('should not allow Assigned -> Review', () => {
      expect(isTaskTransitionValid('Assigned', 'Review')).toBe(false);
    });

    it('should allow In_Progress -> Completed', () => {
      expect(isTaskTransitionValid('In_Progress', 'Completed')).toBe(true);
    });

    it('should allow In_Progress -> Review', () => {
      expect(isTaskTransitionValid('In_Progress', 'Review')).toBe(true);
    });

    it('should allow In_Progress -> Delayed', () => {
      expect(isTaskTransitionValid('In_Progress', 'Delayed')).toBe(true);
    });

    it('should allow Review -> Completed', () => {
      expect(isTaskTransitionValid('Review', 'Completed')).toBe(true);
    });

    it('should allow Review -> In_Progress (send back)', () => {
      expect(isTaskTransitionValid('Review', 'In_Progress')).toBe(true);
    });

    it('should allow Delayed -> Assigned', () => {
      expect(isTaskTransitionValid('Delayed', 'Assigned')).toBe(true);
    });

    it('should allow Delayed -> In_Progress', () => {
      expect(isTaskTransitionValid('Delayed', 'In_Progress')).toBe(true);
    });

    it('should allow Completed -> Review (reopen)', () => {
      expect(isTaskTransitionValid('Completed', 'Review')).toBe(true);
    });

    it('should not allow Completed -> In_Progress directly', () => {
      expect(isTaskTransitionValid('Completed', 'In_Progress')).toBe(false);
    });

    it('should not allow self-transitions', () => {
      expect(isTaskTransitionValid('Assigned', 'Assigned')).toBe(false);
      expect(isTaskTransitionValid('Completed', 'Completed')).toBe(false);
    });
  });

  describe('getAllowedTaskTransitions', () => {
    it('should return [In_Progress, Delayed] for Assigned', () => {
      expect(getAllowedTaskTransitions('Assigned')).toEqual(['In_Progress', 'Delayed']);
    });

    it('should return [Completed, Review, Delayed] for In_Progress', () => {
      expect(getAllowedTaskTransitions('In_Progress')).toEqual(['Completed', 'Review', 'Delayed']);
    });

    it('should return [Completed, In_Progress] for Review', () => {
      expect(getAllowedTaskTransitions('Review')).toEqual(['Completed', 'In_Progress']);
    });

    it('should return [Assigned, In_Progress] for Delayed', () => {
      expect(getAllowedTaskTransitions('Delayed')).toEqual(['Assigned', 'In_Progress']);
    });

    it('should return [Review] for Completed', () => {
      expect(getAllowedTaskTransitions('Completed')).toEqual(['Review']);
    });
  });

  describe('isTaskStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isTaskStatus('Assigned')).toBe(true);
      expect(isTaskStatus('In_Progress')).toBe(true);
      expect(isTaskStatus('Completed')).toBe(true);
      expect(isTaskStatus('Delayed')).toBe(true);
      expect(isTaskStatus('Review')).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isTaskStatus('assigned')).toBe(false);
      expect(isTaskStatus('COMPLETED')).toBe(false);
      expect(isTaskStatus('Invalid')).toBe(false);
      expect(isTaskStatus('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isTaskStatus(123)).toBe(false);
      expect(isTaskStatus(null)).toBe(false);
      expect(isTaskStatus(undefined)).toBe(false);
      expect(isTaskStatus({})).toBe(false);
    });
  });
});
