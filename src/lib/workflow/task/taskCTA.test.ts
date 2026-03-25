import { describe, it, expect } from 'vitest';
import { getTaskCTAConfig, getTaskTab } from './taskCTA';
import type { TaskCTAContext } from './taskCTA';

const baseContext: TaskCTAContext = {
  isLeader: false,
  isMember: true,
  isCurrentTurn: true,
  executionMode: 'parallel',
  isSelfAssigned: false,
};

describe('taskCTA', () => {
  describe('getTaskCTAConfig', () => {
    describe('Assigned status', () => {
      it('should show Start Work for member who can act', () => {
        const result = getTaskCTAConfig('Assigned', { ...baseContext, isMember: true });
        expect(result.displayStatus).toBe('Ready to Start');
        expect(result.tab).toBe('pending');
        expect(result.primaryAction?.label).toBe('Start Work');
        expect(result.primaryAction?.apiAction).toBe('start');
      });

      it('should show Waiting for Turn in sequential mode when not current turn', () => {
        const result = getTaskCTAConfig('Assigned', {
          ...baseContext,
          executionMode: 'sequential',
          isCurrentTurn: false,
        });
        expect(result.displayStatus).toBe('Waiting for Turn');
        expect(result.primaryAction).toBeUndefined();
      });

      it('should show Assigned for non-member', () => {
        const result = getTaskCTAConfig('Assigned', { ...baseContext, isMember: false });
        expect(result.displayStatus).toBe('Assigned');
        expect(result.primaryAction).toBeUndefined();
      });
    });

    describe('In_Progress status', () => {
      it('should show Submit for Review for member (not self-assigned)', () => {
        const result = getTaskCTAConfig('In_Progress', { ...baseContext, isSelfAssigned: false });
        expect(result.displayStatus).toBe('In Progress');
        expect(result.tab).toBe('active');
        expect(result.primaryAction?.label).toBe('Submit for Review');
        expect(result.secondaryAction?.label).toBe('Pause');
      });

      it('should show Mark Complete for self-assigned member', () => {
        const result = getTaskCTAConfig('In_Progress', { ...baseContext, isSelfAssigned: true });
        expect(result.primaryAction?.label).toBe('Mark Complete');
      });

      it('should show view-only for non-member', () => {
        const result = getTaskCTAConfig('In_Progress', { ...baseContext, isMember: false });
        expect(result.displayStatus).toBe('In Progress');
        expect(result.primaryAction).toBeUndefined();
        expect(result.secondaryAction).toBeUndefined();
      });

      it('should show not your turn in sequential mode', () => {
        const result = getTaskCTAConfig('In_Progress', {
          ...baseContext,
          executionMode: 'sequential',
          isCurrentTurn: false,
        });
        expect(result.displayStatus).toBe('In Progress (Not Your Turn)');
        expect(result.primaryAction).toBeUndefined();
      });
    });

    describe('Review status', () => {
      it('should show Pull Back for member who can act', () => {
        const result = getTaskCTAConfig('Review', { ...baseContext });
        expect(result.displayStatus).toBe('Submitted for Review');
        expect(result.tab).toBe('pending');
        expect(result.secondaryAction?.label).toBe('Pull Back');
      });

      it('should show Awaiting Review for leader (not member)', () => {
        const result = getTaskCTAConfig('Review', { ...baseContext, isMember: false, isLeader: true });
        expect(result.displayStatus).toBe('Awaiting Review');
        expect(result.secondaryAction).toBeUndefined();
      });
    });

    describe('Delayed status', () => {
      it('should show Resume Work for member who can act', () => {
        const result = getTaskCTAConfig('Delayed', { ...baseContext });
        expect(result.displayStatus).toBe('Delayed');
        expect(result.tab).toBe('delayed');
        expect(result.primaryAction?.label).toBe('Resume Work');
      });

      it('should show view-only for non-member', () => {
        const result = getTaskCTAConfig('Delayed', { ...baseContext, isMember: false });
        expect(result.displayStatus).toBe('Delayed');
        expect(result.primaryAction).toBeUndefined();
      });
    });

    describe('Completed status', () => {
      it('should show Reopen for leader', () => {
        const result = getTaskCTAConfig('Completed', { ...baseContext, isLeader: true });
        expect(result.displayStatus).toBe('Completed');
        expect(result.tab).toBe('completed');
        expect(result.secondaryAction?.label).toBe('Reopen');
      });

      it('should show no actions for non-leader', () => {
        const result = getTaskCTAConfig('Completed', { ...baseContext, isLeader: false });
        expect(result.displayStatus).toBe('Completed');
        expect(result.secondaryAction).toBeUndefined();
      });
    });

    describe('Review task (isReviewTask)', () => {
      it('should show Approve/Request Changes for member', () => {
        const result = getTaskCTAConfig('Assigned', { ...baseContext, isReviewTask: true });
        expect(result.displayStatus).toBe('Review Pending');
        expect(result.primaryAction?.label).toBe('Approve');
        expect(result.secondaryAction?.label).toBe('Request Changes');
      });

      it('should show Review Completed for completed review task', () => {
        const result = getTaskCTAConfig('Completed', { ...baseContext, isReviewTask: true });
        expect(result.displayStatus).toBe('Review Completed');
        expect(result.tab).toBe('completed');
      });

      it('should show Under Review for non-member non-leader', () => {
        const result = getTaskCTAConfig('Assigned', {
          ...baseContext,
          isMember: false,
          isLeader: false,
          isReviewTask: true,
        });
        expect(result.displayStatus).toBe('Under Review');
        expect(result.primaryAction).toBeUndefined();
      });
    });
  });

  describe('getTaskTab', () => {
    it('should map Assigned to pending', () => {
      expect(getTaskTab('Assigned')).toBe('pending');
    });

    it('should map In_Progress to active', () => {
      expect(getTaskTab('In_Progress')).toBe('active');
    });

    it('should map Review to pending', () => {
      expect(getTaskTab('Review')).toBe('pending');
    });

    it('should map Delayed to delayed', () => {
      expect(getTaskTab('Delayed')).toBe('delayed');
    });

    it('should map Completed to completed', () => {
      expect(getTaskTab('Completed')).toBe('completed');
    });
  });
});
