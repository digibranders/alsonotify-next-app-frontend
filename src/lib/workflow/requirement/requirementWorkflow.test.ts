import { describe, it, expect } from 'vitest';
import {
  isTransitionValid,
  getAllowedTransitions,
  isRequirementStatus,
  INTERNAL_TRANSITIONS,
  SENDER_TRANSITIONS,
  RECEIVER_TRANSITIONS,
  CLIENT_SENDER_TRANSITIONS,
  CLIENT_RECEIVER_TRANSITIONS,
} from './requirementWorkflow';

describe('requirementWorkflow', () => {
  describe('transition maps', () => {
    it('should define all 11 statuses in INTERNAL_TRANSITIONS', () => {
      expect(Object.keys(INTERNAL_TRANSITIONS)).toHaveLength(11);
    });

    it('should define all 11 statuses in SENDER_TRANSITIONS', () => {
      expect(Object.keys(SENDER_TRANSITIONS)).toHaveLength(11);
    });

    it('should define all 11 statuses in RECEIVER_TRANSITIONS', () => {
      expect(Object.keys(RECEIVER_TRANSITIONS)).toHaveLength(11);
    });

    it('should define all 11 statuses in CLIENT_SENDER_TRANSITIONS', () => {
      expect(Object.keys(CLIENT_SENDER_TRANSITIONS)).toHaveLength(11);
    });

    it('should define all 11 statuses in CLIENT_RECEIVER_TRANSITIONS', () => {
      expect(Object.keys(CLIENT_RECEIVER_TRANSITIONS)).toHaveLength(11);
    });
  });

  describe('isTransitionValid', () => {
    describe('sender transitions', () => {
      it('should allow Draft -> Waiting', () => {
        expect(isTransitionValid('Draft', 'Waiting', 'sender')).toBe(true);
      });

      it('should allow Submitted -> Assigned (accept quote)', () => {
        expect(isTransitionValid('Submitted', 'Assigned', 'sender')).toBe(true);
      });

      it('should allow Submitted -> Rejected (reject quote)', () => {
        expect(isTransitionValid('Submitted', 'Rejected', 'sender')).toBe(true);
      });

      it('should allow Review -> Completed (approve work)', () => {
        expect(isTransitionValid('Review', 'Completed', 'sender')).toBe(true);
      });

      it('should allow Review -> Revision (request revision)', () => {
        expect(isTransitionValid('Review', 'Revision', 'sender')).toBe(true);
      });

      it('should not allow sender to transition from Revision', () => {
        expect(isTransitionValid('Revision', 'In_Progress', 'sender')).toBe(false);
        expect(isTransitionValid('Revision', 'Review', 'sender')).toBe(false);
      });

      it('should not allow skipping workflow steps', () => {
        expect(isTransitionValid('Draft', 'Completed', 'sender')).toBe(false);
        expect(isTransitionValid('Waiting', 'Completed', 'sender')).toBe(false);
      });
    });

    describe('receiver transitions', () => {
      it('should allow Waiting -> Submitted (submit quote)', () => {
        expect(isTransitionValid('Waiting', 'Submitted', 'receiver')).toBe(true);
      });

      it('should allow Waiting -> Rejected (decline)', () => {
        expect(isTransitionValid('Waiting', 'Rejected', 'receiver')).toBe(true);
      });

      it('should allow Assigned -> In_Progress', () => {
        expect(isTransitionValid('Assigned', 'In_Progress', 'receiver')).toBe(true);
      });

      it('should allow In_Progress -> Review (submit work)', () => {
        expect(isTransitionValid('In_Progress', 'Review', 'receiver')).toBe(true);
      });

      it('should allow Revision -> Review (resubmit)', () => {
        expect(isTransitionValid('Revision', 'Review', 'receiver')).toBe(true);
      });

      it('should not allow receiver Draft transitions', () => {
        expect(isTransitionValid('Draft', 'Waiting', 'receiver')).toBe(false);
      });

      it('should not allow receiver Completed transitions', () => {
        expect(isTransitionValid('Completed', 'Revision', 'receiver')).toBe(false);
      });
    });

    describe('internal transitions', () => {
      it('should allow Draft -> Assigned', () => {
        expect(isTransitionValid('Draft', 'Assigned', 'internal')).toBe(true);
      });

      it('should allow In_Progress -> Review', () => {
        expect(isTransitionValid('In_Progress', 'Review', 'internal')).toBe(true);
      });

      it('should allow Review -> Completed', () => {
        expect(isTransitionValid('Review', 'Completed', 'internal')).toBe(true);
      });

      it('should allow Completed -> Revision (reopen)', () => {
        expect(isTransitionValid('Completed', 'Revision', 'internal')).toBe(true);
      });
    });

    describe('client transitions', () => {
      it('should allow client sender Waiting -> Assigned (direct accept)', () => {
        expect(isTransitionValid('Waiting', 'Assigned', 'sender', 'client')).toBe(true);
      });

      it('should not allow client sender Draft transitions', () => {
        expect(isTransitionValid('Draft', 'Waiting', 'sender', 'client')).toBe(false);
      });

      it('should allow client receiver Assigned -> In_Progress', () => {
        expect(isTransitionValid('Assigned', 'In_Progress', 'receiver', 'client')).toBe(true);
      });

      it('should allow client receiver In_Progress -> Review', () => {
        expect(isTransitionValid('In_Progress', 'Review', 'receiver', 'client')).toBe(true);
      });

      it('should not allow client receiver Completed transitions', () => {
        expect(isTransitionValid('Completed', 'Revision', 'receiver', 'client')).toBe(false);
      });
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return correct transitions for sender Waiting', () => {
      const result = getAllowedTransitions('Waiting', 'sender');
      expect(result).toContain('On_Hold');
      expect(result).toContain('Rejected');
    });

    it('should return correct transitions for receiver Waiting', () => {
      const result = getAllowedTransitions('Waiting', 'receiver');
      expect(result).toContain('Submitted');
      expect(result).toContain('Rejected');
    });

    it('should return empty array for receiver Draft', () => {
      expect(getAllowedTransitions('Draft', 'receiver')).toHaveLength(0);
    });

    it('should return empty array for sender Revision', () => {
      expect(getAllowedTransitions('Revision', 'sender')).toHaveLength(0);
    });
  });

  describe('isRequirementStatus', () => {
    it('should return true for valid statuses', () => {
      const validStatuses = ['Draft', 'Assigned', 'In_Progress', 'On_Hold', 'Submitted', 'Completed', 'Waiting', 'Rejected', 'Review', 'Revision', 'Delayed'];
      validStatuses.forEach((status) => {
        expect(isRequirementStatus(status)).toBe(true);
      });
    });

    it('should return false for invalid strings', () => {
      expect(isRequirementStatus('draft')).toBe(false);
      expect(isRequirementStatus('COMPLETED')).toBe(false);
      expect(isRequirementStatus('Invalid')).toBe(false);
      expect(isRequirementStatus('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isRequirementStatus(42)).toBe(false);
      expect(isRequirementStatus(null)).toBe(false);
      expect(isRequirementStatus(undefined)).toBe(false);
    });
  });
});
