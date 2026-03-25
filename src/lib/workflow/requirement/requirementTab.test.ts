import { describe, it, expect } from 'vitest';
import { getRequirementTab } from './requirementTab';
import type { TabContext } from './requirementTab';

const baseContext: TabContext = {
  isWorkspaceMapped: true,
  isRejectedBySender: false,
  hasQuotedPrice: false,
  isAdvancePending: false,
  isAdvancePaid: false,
  isAdvanceInvoiceSent: false,
  requiresAdvancePayment: false,
  hasAdvanceInvoice: false,
};

describe('requirementTab', () => {
  describe('getRequirementTab', () => {
    describe('priority rules', () => {
      it('should return archived when isArchived is true', () => {
        expect(getRequirementTab('In_Progress', 'outsourced', 'sender', { ...baseContext, isArchived: true })).toBe('archived');
      });

      it('should return delayed for Delayed status', () => {
        expect(getRequirementTab('Delayed', 'outsourced', 'sender', baseContext)).toBe('delayed');
      });

      it('should return delayed for On_Hold status', () => {
        expect(getRequirementTab('On_Hold', 'outsourced', 'sender', baseContext)).toBe('delayed');
      });

      it('should return draft for Draft status', () => {
        expect(getRequirementTab('Draft', 'outsourced', 'sender', baseContext)).toBe('draft');
      });

      it('should return draft for lowercase draft', () => {
        expect(getRequirementTab('draft', 'outsourced', 'sender', baseContext)).toBe('draft');
      });

      it('should return completed for Completed status', () => {
        expect(getRequirementTab('Completed', 'outsourced', 'sender', baseContext)).toBe('completed');
      });

      it('should prioritize archived over delayed', () => {
        expect(getRequirementTab('Delayed', 'outsourced', 'sender', { ...baseContext, isArchived: true })).toBe('archived');
      });
    });

    describe('outsourced type', () => {
      it('should return pending for Waiting', () => {
        expect(getRequirementTab('Waiting', 'outsourced', 'sender', baseContext)).toBe('pending');
      });

      it('should return pending for Submitted', () => {
        expect(getRequirementTab('Submitted', 'outsourced', 'sender', baseContext)).toBe('pending');
      });

      it('should return pending for Assigned with unmapped workspace', () => {
        expect(getRequirementTab('Assigned', 'outsourced', 'receiver', { ...baseContext, isWorkspaceMapped: false })).toBe('pending');
      });

      it('should return active for Assigned with mapped workspace', () => {
        expect(getRequirementTab('Assigned', 'outsourced', 'receiver', baseContext)).toBe('active');
      });

      it('should return active for In_Progress', () => {
        expect(getRequirementTab('In_Progress', 'outsourced', 'sender', baseContext)).toBe('active');
      });

      it('should return active for Review', () => {
        expect(getRequirementTab('Review', 'outsourced', 'sender', baseContext)).toBe('active');
      });

      it('should return active for Revision', () => {
        expect(getRequirementTab('Revision', 'outsourced', 'receiver', baseContext)).toBe('active');
      });

      it('should return pending for Rejected (sender viewing, sender rejected)', () => {
        expect(getRequirementTab('Rejected', 'outsourced', 'sender', { ...baseContext, isRejectedBySender: true })).toBe('pending');
      });

      it('should return pending for Rejected (sender viewing, receiver rejected)', () => {
        expect(getRequirementTab('Rejected', 'outsourced', 'sender', { ...baseContext, isRejectedBySender: false })).toBe('pending');
      });

      it('should return pending for Rejected (receiver viewing)', () => {
        expect(getRequirementTab('Rejected', 'outsourced', 'receiver', baseContext)).toBe('pending');
      });
    });

    describe('client type', () => {
      it('should return pending for Waiting', () => {
        expect(getRequirementTab('Waiting', 'client', 'sender', baseContext)).toBe('pending');
      });

      it('should return pending for Rejected', () => {
        expect(getRequirementTab('Rejected', 'client', 'sender', baseContext)).toBe('pending');
      });

      it('should return pending for Assigned with unmapped workspace', () => {
        expect(getRequirementTab('Assigned', 'client', 'sender', { ...baseContext, isWorkspaceMapped: false })).toBe('pending');
      });

      it('should return active for Assigned with mapped workspace', () => {
        expect(getRequirementTab('Assigned', 'client', 'sender', baseContext)).toBe('active');
      });

      it('should return active for In_Progress', () => {
        expect(getRequirementTab('In_Progress', 'client', 'receiver', baseContext)).toBe('active');
      });
    });

    describe('inhouse type', () => {
      it('should return pending when approval is pending', () => {
        expect(getRequirementTab('Assigned', 'inhouse', 'internal', { ...baseContext, approvalStatus: 'pending' })).toBe('pending');
      });

      it('should return active for approved work', () => {
        expect(getRequirementTab('Assigned', 'inhouse', 'internal', { ...baseContext, approvalStatus: 'approved' })).toBe('active');
      });

      it('should return active for In_Progress', () => {
        expect(getRequirementTab('In_Progress', 'inhouse', 'internal', baseContext)).toBe('active');
      });

      it('should return active for Review', () => {
        expect(getRequirementTab('Review', 'inhouse', 'internal', baseContext)).toBe('active');
      });
    });
  });
});
