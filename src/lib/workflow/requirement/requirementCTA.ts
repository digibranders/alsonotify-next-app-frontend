/**
 * Requirement CTA Mapping
 *
 * Centralized CTA (Call-To-Action) configuration for requirements.
 * Determines what actions are available based on requirement status, user role, and context.
 */

import type {
  RequirementStatus,
  UserRole,
  RequirementCTAConfig,
  RequirementContext,
  ActionConfig,
} from '../types/requirement.types';
import { getRequirementTab, type RequirementType, type TabContext } from './requirementTab';

/**
 * Gets the complete CTA configuration for a requirement.
 *
 * This is the main entry point for determining what UI to show for a requirement.
 * It considers:
 * - Current requirement status
 * - User's role (sender, receiver, internal)
 * - Additional context (workspace mapping, rejection source, etc.)
 *
 * @param status - Current requirement status
 * @param role - User's role relative to this requirement
 * @param context - Additional context for CTA determination
 * @param type - Requirement type (defaults to 'outsourced')
 * @returns Complete CTA configuration including display status, tab, and actions
 *
 * @example
 * // Receiver needs to submit quote
 * getRequirementCTAConfig('Waiting', 'receiver', { isWorkspaceMapped: false, isRejectedBySender: false, hasQuotedPrice: false })
 * // Returns { displayStatus: 'Action Needed: Submit Quote', isPending: true, tab: 'pending', primaryAction: {...}, secondaryAction: {...} }
 */
export function getRequirementCTAConfig(
  status: RequirementStatus,
  role: UserRole,
  context: RequirementContext,
  type: RequirementType = 'outsourced'
): RequirementCTAConfig {
  // For internal requirements, use simplified logic
  if (role === 'internal' || type === 'inhouse') {
    return getInternalCTA(status, context);
  }

  // Outsourced requirements - role-based logic
  if (role === 'receiver') {
    return getReceiverCTA(status, context, type);
  }

  return getSenderCTA(status, context, type);
}

// =============================================================================
// Sender CTA Logic
// =============================================================================

/**
 * Gets CTA configuration for sender (Company A / Client).
 */
function getSenderCTA(
  status: RequirementStatus,
  context: RequirementContext,
  type: RequirementType
): RequirementCTAConfig {
  const tabContext: TabContext = { ...context };
  const tab = getRequirementTab(status, type, 'sender', tabContext);

  switch (status) {
    case 'Draft':
      return {
        displayStatus: 'Draft',
        isPending: true,
        tab,
        primaryAction: createAction('Send to Partner', 'primary', 'none', 'send_to_partner'),
      };

    case 'Waiting':
      return {
        displayStatus: 'Awaiting Quote...',
        isPending: true,
        tab,
        secondaryAction: createAction('Cancel', 'danger', 'reject'),
      };

    case 'Submitted':
      return {
        displayStatus: 'Quote Received',
        isPending: true,
        tab,
        primaryAction: createAction('Accept Quote', 'primary', 'none', 'accept_quote'),
        secondaryAction: createAction('Reject Quote', 'danger', 'reject'),
      };

    case 'Rejected':
      return getSenderRejectedCTA(context, tab);

    case 'Assigned':
      return getSenderAssignedCTA(context, tab);

    case 'In_Progress':
      return {
        displayStatus: 'Work In Progress...',
        isPending: false,
        tab,
        secondaryAction: createAction('Pause', 'secondary', 'none', 'pause'),
      };

    case 'Review':
      return {
        displayStatus: 'Work Completed. Review Needed.',
        isPending: true,
        tab,
        primaryAction: createAction('Approve Work', 'primary', 'approval'),
        secondaryAction: createAction('Request Revision', 'danger', 'revision'),
      };

    case 'Revision':
      return {
        displayStatus: 'Revision In Progress...',
        isPending: false,
        tab,
      };

    case 'Completed':
      return {
        displayStatus: 'Completed',
        isPending: false,
        tab,
        secondaryAction: createAction('Reopen', 'secondary', 'none', 'reopen'),
      };

    case 'On_Hold':
      return {
        displayStatus: 'On Hold',
        isPending: false,
        tab,
        primaryAction: createAction('Resume', 'primary', 'none', 'resume'),
      };

    case 'Delayed':
      return {
        displayStatus: 'Delayed',
        isPending: false,
        tab,
        primaryAction: createAction('Resume', 'primary', 'none', 'resume'),
      };

    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled requirement status for sender: ${_exhaustive}`);
    }
  }
}

/**
 * Sender CTA for Rejected status.
 */
function getSenderRejectedCTA(
  context: RequirementContext,
  tab: RequirementCTAConfig['tab']
): RequirementCTAConfig {
  if (context.isRejectedBySender) {
    // Sender rejected the quote, waiting for receiver to revise
    return {
      displayStatus: 'Quote Rejected. Awaiting Revision...',
      isPending: true,
      tab,
    };
  }

  // Receiver rejected the requirement, sender needs to edit & resend
  return {
    displayStatus: 'Requirement Rejected',
    isPending: true,
    tab,
    primaryAction: createAction('Edit & Resend', 'primary', 'edit'),
  };
}

/**
 * Sender CTA for Assigned status.
 */
function getSenderAssignedCTA(
  context: RequirementContext,
  tab: RequirementCTAConfig['tab']
): RequirementCTAConfig {
  if (!context.isWorkspaceMapped) {
    return {
      displayStatus: 'Waiting for Partner to Map Workspace...',
      isPending: true,
      tab,
    };
  }

  return {
    displayStatus: 'Assigned',
    isPending: false,
    tab,
  };
}

// =============================================================================
// Receiver CTA Logic
// =============================================================================

/**
 * Gets CTA configuration for receiver (Company B / Vendor / Partner).
 */
function getReceiverCTA(
  status: RequirementStatus,
  context: RequirementContext,
  type: RequirementType
): RequirementCTAConfig {
  const tabContext: TabContext = { ...context };
  const tab = getRequirementTab(status, type, 'receiver', tabContext);

  switch (status) {
    case 'Draft':
      return {
        displayStatus: 'Not sent yet',
        isPending: false,
        tab,
      };

    case 'Waiting':
      return {
        displayStatus: 'Action Needed: Submit Quote',
        isPending: true,
        tab,
        primaryAction: createAction('Submit Quote', 'primary', 'quotation'),
        secondaryAction: createAction('Decline', 'danger', 'reject'),
      };

    case 'Submitted':
      return {
        displayStatus: 'Quote Submitted. Pending Acceptance...',
        isPending: true,
        tab,
        secondaryAction: createAction('Retract', 'secondary', 'none', 'retract'),
      };

    case 'Rejected':
      return getReceiverRejectedCTA(context, tab);

    case 'Assigned':
      return getReceiverAssignedCTA(context, tab);

    case 'In_Progress':
      return {
        displayStatus: 'Work In Progress',
        isPending: false,
        tab,
        primaryAction: createAction('Submit for Approval', 'primary', 'submit_approval'),
        secondaryAction: createAction('Mark Blocked', 'danger', 'none', 'mark_blocked'),
      };

    case 'Review':
      return {
        displayStatus: 'Work Submitted. Pending Review...',
        isPending: true,
        tab,
        secondaryAction: createAction('Pull Back', 'secondary', 'none', 'pull_back'),
      };

    case 'Revision':
      return {
        displayStatus: 'Revision Requested',
        isPending: false,
        tab,
        primaryAction: createAction('Resubmit Work', 'primary', 'none', 'resubmit'),
      };

    case 'Completed':
      return {
        displayStatus: 'Completed',
        isPending: false,
        tab,
      };

    case 'On_Hold':
      return {
        displayStatus: 'On Hold',
        isPending: false,
        tab,
        primaryAction: createAction('Resume Work', 'primary', 'none', 'resume'),
      };

    case 'Delayed':
      return {
        displayStatus: 'Delayed',
        isPending: false,
        tab,
        primaryAction: createAction('Resume Work', 'primary', 'none', 'resume'),
      };

    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled requirement status for receiver: ${_exhaustive}`);
    }
  }
}

/**
 * Receiver CTA for Rejected status.
 */
function getReceiverRejectedCTA(
  context: RequirementContext,
  tab: RequirementCTAConfig['tab']
): RequirementCTAConfig {
  if (context.isRejectedBySender) {
    // Sender rejected the quote, receiver needs to revise
    return {
      displayStatus: 'Quote Rejected',
      isPending: true,
      tab,
      primaryAction: createAction('Revise Quote', 'primary', 'quotation'),
    };
  }

  // Receiver rejected the requirement, waiting for sender to edit
  return {
    displayStatus: 'Requirement Declined. Awaiting Edit...',
    isPending: true,
    tab,
  };
}

/**
 * Receiver CTA for Assigned status.
 */
function getReceiverAssignedCTA(
  context: RequirementContext,
  tab: RequirementCTAConfig['tab']
): RequirementCTAConfig {
  if (!context.isWorkspaceMapped) {
    return {
      displayStatus: 'Action Needed: Map Workspace',
      isPending: true,
      tab,
      primaryAction: createAction('Map Workspace', 'primary', 'mapping'),
    };
  }

  return {
    displayStatus: 'Ready to Start',
    isPending: false,
    tab,
    primaryAction: createAction('Start Work', 'primary', 'none', 'start_work'),
  };
}

// =============================================================================
// Internal CTA Logic
// =============================================================================

/**
 * Gets CTA configuration for internal/inhouse requirements.
 * Simplified logic without sender/receiver distinction.
 */
function getInternalCTA(
  status: RequirementStatus,
  context: RequirementContext
): RequirementCTAConfig {
  const tabContext: TabContext = { ...context };
  const tab = getRequirementTab(status, 'inhouse', 'internal', tabContext);

  switch (status) {
    case 'Draft':
      return {
        displayStatus: 'Draft',
        isPending: true,
        tab,
        primaryAction: createAction('Submit for Work', 'primary', 'none', 'submit_for_work'),
      };

    case 'Waiting':
    case 'Submitted':
      // These shouldn't exist for internal, but handle gracefully
      return {
        displayStatus: 'Pending Assignment',
        isPending: true,
        tab,
      };

    case 'Assigned':
      return {
        displayStatus: 'Ready to Start',
        isPending: false,
        tab,
        primaryAction: createAction('Start Work', 'primary', 'none', 'start_work'),
      };

    case 'In_Progress':
      return {
        displayStatus: 'In Progress',
        isPending: false,
        tab,
        primaryAction: createAction('Submit for Approval', 'primary', 'submit_approval'),
        secondaryAction: createAction('Mark Blocked', 'danger', 'none', 'mark_blocked'),
      };

    case 'Review':
      return {
        displayStatus: 'Awaiting Review',
        isPending: true,
        tab,
        primaryAction: createAction('Approve', 'primary', 'approval'),
        secondaryAction: createAction('Request Revision', 'danger', 'revision'),
      };

    case 'Revision':
      return {
        displayStatus: 'Revision Requested',
        isPending: false,
        tab,
        primaryAction: createAction('Resubmit', 'primary', 'none', 'resubmit'),
      };

    case 'Rejected':
      return {
        displayStatus: 'Rejected',
        isPending: false,
        tab,
        primaryAction: createAction('Restart', 'primary', 'none', 'restart'),
      };

    case 'Completed':
      return {
        displayStatus: 'Completed',
        isPending: false,
        tab,
        secondaryAction: createAction('Reopen', 'secondary', 'none', 'reopen'),
      };

    case 'On_Hold':
      return {
        displayStatus: 'On Hold',
        isPending: false,
        tab,
        primaryAction: createAction('Resume', 'primary', 'none', 'resume'),
      };

    case 'Delayed':
      return {
        displayStatus: 'Delayed',
        isPending: false,
        tab,
        primaryAction: createAction('Resume', 'primary', 'none', 'resume'),
      };

    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled requirement status for internal: ${_exhaustive}`);
    }
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Helper to create an action config.
 */
function createAction(
  label: string,
  type: ActionConfig['type'],
  modal: ActionConfig['modal'],
  apiAction?: string
): ActionConfig {
  return {
    label,
    type,
    modal,
    ...(apiAction && { apiAction }),
  };
}
