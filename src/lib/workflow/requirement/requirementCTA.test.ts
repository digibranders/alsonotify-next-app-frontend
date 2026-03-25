import { describe, it, expect } from 'vitest';
import { getRequirementCTAConfig } from './requirementCTA';
import type { RequirementContext } from '../types/requirement.types';

const baseContext: RequirementContext = {
  isWorkspaceMapped: true,
  isRejectedBySender: false,
  hasQuotedPrice: false,
  isAdvancePending: false,
  isAdvancePaid: false,
  isAdvanceInvoiceSent: false,
  requiresAdvancePayment: false,
  hasAdvanceInvoice: false,
};

describe('requirementCTA', () => {
  describe('getRequirementCTAConfig - sender (outsourced)', () => {
    it('should show Send to Partner for Draft', () => {
      const result = getRequirementCTAConfig('Draft', 'sender', baseContext);
      expect(result.displayStatus).toBe('Draft');
      expect(result.primaryAction?.label).toBe('Send to Partner');
    });

    it('should show Awaiting Quote for Waiting', () => {
      const result = getRequirementCTAConfig('Waiting', 'sender', baseContext);
      expect(result.displayStatus).toBe('Awaiting Quote...');
      expect(result.secondaryAction?.label).toBe('Cancel');
    });

    it('should show Accept/Reject for Submitted', () => {
      const result = getRequirementCTAConfig('Submitted', 'sender', baseContext);
      expect(result.displayStatus).toBe('Quote Received');
      expect(result.primaryAction?.label).toBe('Accept Quote');
      expect(result.secondaryAction?.label).toBe('Reject Quote');
    });

    it('should show Approve/Revision for Review', () => {
      const result = getRequirementCTAConfig('Review', 'sender', baseContext);
      expect(result.displayStatus).toBe('Work Completed. Review Needed.');
      expect(result.primaryAction?.label).toBe('Approve Work');
      expect(result.secondaryAction?.label).toBe('Request Revision');
    });

    it('should show Completed with Reopen', () => {
      const result = getRequirementCTAConfig('Completed', 'sender', baseContext);
      expect(result.displayStatus).toBe('Completed');
      expect(result.secondaryAction?.label).toBe('Reopen');
    });

    it('should show Rejected waiting for revision when sender rejected', () => {
      const result = getRequirementCTAConfig('Rejected', 'sender', { ...baseContext, isRejectedBySender: true });
      expect(result.displayStatus).toContain('Quote Rejected');
      expect(result.primaryAction).toBeUndefined();
    });

    it('should show Edit & Resend when receiver rejected', () => {
      const result = getRequirementCTAConfig('Rejected', 'sender', { ...baseContext, isRejectedBySender: false });
      expect(result.displayStatus).toBe('Requirement Rejected');
      expect(result.primaryAction?.label).toBe('Edit & Resend');
    });

    describe('Assigned with advance payment flow', () => {
      it('should show awaiting invoice when advance required but not sent', () => {
        const result = getRequirementCTAConfig('Assigned', 'sender', {
          ...baseContext,
          requiresAdvancePayment: true,
          hasAdvanceInvoice: false,
        });
        expect(result.displayStatus).toContain('Invoice');
      });

      it('should show payment pending when invoice sent but not paid', () => {
        const result = getRequirementCTAConfig('Assigned', 'sender', {
          ...baseContext,
          requiresAdvancePayment: true,
          hasAdvanceInvoice: true,
          isAdvanceInvoiceSent: true,
          isAdvancePaid: false,
        });
        expect(result.displayStatus).toBe('Advance Payment Pending');
        expect(result.primaryAction?.label).toBe('View Invoice');
      });

      it('should show waiting for workspace mapping when advance paid', () => {
        const result = getRequirementCTAConfig('Assigned', 'sender', {
          ...baseContext,
          requiresAdvancePayment: true,
          isAdvancePaid: true,
          hasAdvanceInvoice: true,
          isAdvanceInvoiceSent: true,
          isWorkspaceMapped: false,
        });
        expect(result.displayStatus).toContain('Workspace');
      });

      it('should show Assigned when everything is ready', () => {
        const result = getRequirementCTAConfig('Assigned', 'sender', baseContext);
        expect(result.displayStatus).toBe('Assigned');
        expect(result.isPending).toBe(false);
      });
    });
  });

  describe('getRequirementCTAConfig - receiver (outsourced)', () => {
    it('should show Submit Quote for Waiting', () => {
      const result = getRequirementCTAConfig('Waiting', 'receiver', baseContext);
      expect(result.displayStatus).toBe('Action Needed: Submit Quote');
      expect(result.primaryAction?.label).toBe('Submit Quote');
      expect(result.primaryAction?.modal).toBe('quotation');
      expect(result.secondaryAction?.label).toBe('Decline');
    });

    it('should show Quote Submitted for Submitted', () => {
      const result = getRequirementCTAConfig('Submitted', 'receiver', baseContext);
      expect(result.displayStatus).toContain('Quote Submitted');
      expect(result.secondaryAction?.label).toBe('Retract');
    });

    it('should show Map Workspace for unmapped Assigned', () => {
      const result = getRequirementCTAConfig('Assigned', 'receiver', {
        ...baseContext,
        isWorkspaceMapped: false,
      });
      expect(result.displayStatus).toContain('Map Workspace');
      expect(result.primaryAction?.label).toBe('Map Workspace');
      expect(result.primaryAction?.modal).toBe('mapping');
    });

    it('should show Start Work for mapped Assigned', () => {
      const result = getRequirementCTAConfig('Assigned', 'receiver', baseContext);
      expect(result.displayStatus).toBe('Ready to Start');
      expect(result.primaryAction?.label).toBe('Start Work');
    });

    it('should show Submit for Review for In_Progress', () => {
      const result = getRequirementCTAConfig('In_Progress', 'receiver', baseContext);
      expect(result.primaryAction?.label).toBe('Submit for Review');
    });

    it('should show Create Invoice for Completed', () => {
      const result = getRequirementCTAConfig('Completed', 'receiver', baseContext);
      expect(result.primaryAction?.label).toBe('Create Invoice');
    });

    it('should show Revise Quote when sender rejected', () => {
      const result = getRequirementCTAConfig('Rejected', 'receiver', { ...baseContext, isRejectedBySender: true });
      expect(result.displayStatus).toBe('Quote Rejected');
      expect(result.primaryAction?.label).toBe('Revise Quote');
    });

    it('should show awaiting edit when receiver rejected', () => {
      const result = getRequirementCTAConfig('Rejected', 'receiver', { ...baseContext, isRejectedBySender: false });
      expect(result.displayStatus).toContain('Declined');
    });

    describe('Assigned with advance payment flow', () => {
      it('should show send invoice action when advance required', () => {
        const result = getRequirementCTAConfig('Assigned', 'receiver', {
          ...baseContext,
          requiresAdvancePayment: true,
          hasAdvanceInvoice: false,
          isWorkspaceMapped: false,
        });
        expect(result.primaryAction?.label).toBe('View & Send Invoice');
      });

      it('should show mark advance paid when invoice sent', () => {
        const result = getRequirementCTAConfig('Assigned', 'receiver', {
          ...baseContext,
          requiresAdvancePayment: true,
          hasAdvanceInvoice: true,
          isAdvanceInvoiceSent: true,
          isAdvancePaid: false,
          isWorkspaceMapped: false,
        });
        expect(result.primaryAction?.label).toBe('Mark Advance Paid');
      });
    });
  });

  describe('getRequirementCTAConfig - internal/inhouse', () => {
    it('should show Submit for Work for Draft', () => {
      const result = getRequirementCTAConfig('Draft', 'internal', baseContext);
      expect(result.displayStatus).toBe('Draft');
      expect(result.primaryAction?.label).toBe('Submit for Work');
    });

    it('should show Start Work for Assigned', () => {
      const result = getRequirementCTAConfig('Assigned', 'internal', baseContext);
      expect(result.displayStatus).toBe('Ready to Start');
      expect(result.primaryAction?.label).toBe('Start Work');
    });

    it('should show Submit for Review for In_Progress', () => {
      const result = getRequirementCTAConfig('In_Progress', 'internal', baseContext);
      expect(result.primaryAction?.label).toBe('Submit for Review');
    });

    it('should show Approve for Review', () => {
      const result = getRequirementCTAConfig('Review', 'internal', baseContext);
      expect(result.primaryAction?.label).toBe('Approve');
      expect(result.secondaryAction?.label).toBe('Request Revision');
    });

    it('should show Resubmit for Revision', () => {
      const result = getRequirementCTAConfig('Revision', 'internal', baseContext);
      expect(result.primaryAction?.label).toBe('Resubmit');
    });

    it('should show Reopen for Completed', () => {
      const result = getRequirementCTAConfig('Completed', 'internal', baseContext);
      expect(result.secondaryAction?.label).toBe('Reopen');
    });

    it('should handle inhouse type with sender role (uses internal logic)', () => {
      const result = getRequirementCTAConfig('Draft', 'sender', baseContext, 'inhouse');
      expect(result.displayStatus).toBe('Draft');
      expect(result.primaryAction?.label).toBe('Submit for Work');
    });
  });

  describe('getRequirementCTAConfig - client type', () => {
    it('should show Accept for client sender Waiting', () => {
      const result = getRequirementCTAConfig('Waiting', 'sender', baseContext, 'client');
      expect(result.displayStatus).toContain('Accept');
      expect(result.primaryAction?.label).toContain('Accept');
      expect(result.secondaryAction?.label).toBe('Decline');
    });

    it('should show Approve Work for client sender Review', () => {
      const result = getRequirementCTAConfig('Review', 'sender', baseContext, 'client');
      expect(result.primaryAction?.label).toBe('Approve Work');
      expect(result.secondaryAction?.label).toBe('Request Revision');
    });

    it('should show awaiting acceptance for client receiver Waiting', () => {
      const result = getRequirementCTAConfig('Waiting', 'receiver', baseContext, 'client');
      expect(result.displayStatus).toContain('Awaiting Client');
    });

    it('should show Start Work for client receiver Assigned (already mapped)', () => {
      const result = getRequirementCTAConfig('Assigned', 'receiver', baseContext, 'client');
      expect(result.primaryAction?.label).toBe('Start Work');
    });

    it('should show Submit for Review for client receiver In_Progress', () => {
      const result = getRequirementCTAConfig('In_Progress', 'receiver', baseContext, 'client');
      expect(result.primaryAction?.label).toBe('Submit for Review');
    });

    it('should show Create Invoice for client receiver Completed', () => {
      const result = getRequirementCTAConfig('Completed', 'receiver', baseContext, 'client');
      expect(result.primaryAction?.label).toBe('Create Invoice');
    });
  });
});
