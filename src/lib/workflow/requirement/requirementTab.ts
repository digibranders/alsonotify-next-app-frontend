/**
 * Requirement Tab Logic
 *
 * Determines which tab a requirement should appear in based on
 * status, type, role, and additional context.
 */

import type { Tab } from '../types/common.types';
import type { RequirementStatus, UserRole, RequirementContext, SpecialStatus } from '../types/requirement.types';

/**
 * Requirement type - determines the workflow path.
 *
 * - outsourced: Cross-company collaboration (sender/receiver)
 * - inhouse: Internal team workflow
 * - client: Client-facing requirements (treated same as inhouse)
 */
export type RequirementType = 'outsourced' | 'inhouse' | 'client';

/**
 * Extended context for tab determination.
 * Includes approval status for inhouse requirements and archive flag.
 */
export interface TabContext extends RequirementContext {
  /** Approval status for inhouse requirements */
  readonly approvalStatus?: 'pending' | 'approved' | 'rejected';
  /** Whether the requirement is archived (soft-delete) */
  readonly isArchived?: boolean;
}

/**
 * Determines which tab a requirement belongs to.
 *
 * Tab determination follows a priority order:
 * 1. isArchived flag → 'archived'
 * 2. Delayed/On_Hold → 'delayed'
 * 3. draft → 'draft'
 * 4. Completed → 'completed'
 * 5. Status-specific logic based on type and role
 *
 * @param status - Current requirement status (includes special 'draft' status)
 * @param type - Requirement type (outsourced, inhouse, client)
 * @param role - User's role relative to this requirement
 * @param context - Additional context for tab determination (includes isArchived flag)
 * @returns The tab this requirement should appear in
 *
 * @example
 * // Archived requirement
 * getRequirementTab('Completed', 'outsourced', 'sender', { isArchived: true, ... })
 * // Returns 'archived'
 *
 * @example
 * // Receiver with unmapped workspace sees requirement in pending
 * getRequirementTab('Assigned', 'outsourced', 'receiver', { isWorkspaceMapped: false, ... })
 * // Returns 'pending'
 *
 * @example
 * // Sender whose requirement was rejected sees it in draft
 * getRequirementTab('Rejected', 'outsourced', 'sender', { isRejectedBySender: false, ... })
 * // Returns 'draft'
 */
export function getRequirementTab(
  status: RequirementStatus | SpecialStatus,
  type: RequirementType,
  role: UserRole,
  context: TabContext
): Tab {
  // Priority 1: Archived flag (not a status, but a boolean field)
  if (context.isArchived) {
    return 'archived';
  }

  // Priority 2: Delayed/On_Hold status
  if (status === 'Delayed' || status === 'On_Hold') {
    return 'delayed';
  }

  // Priority 3: Draft status (first-class or legacy special)
  if (status === 'Draft' || status === 'draft') {
    return 'draft';
  }

  // Priority 4: Completed status
  if (status === 'Completed') {
    return 'completed';
  }

  // Priority 5: Type-specific logic
  // At this point, status is a workflow status (not Delayed, draft, Completed)
  const workflowStatus = status as WorkflowStatus;

  if (type === 'outsourced') {
    return getOutsourcedTab(workflowStatus, role, context);
  }

  // Inhouse/Client logic (client is treated same as inhouse)
  return getInhouseTab(workflowStatus, context);
}

/**
 * Workflow statuses that require tab determination logic.
 * Excludes terminal/special statuses handled by priority checks.
 */
type WorkflowStatus = Exclude<RequirementStatus, 'Delayed' | 'Completed'>;

/**
 * Determines tab for outsourced requirements.
 *
 * Pending tab conditions:
 * - Waiting for quote (Waiting)
 * - Quote submitted, awaiting acceptance (Submitted)
 * - Assigned but workspace not mapped
 * - Rejected (varies by role)
 *
 * Active tab conditions:
 * - Work submitted for review (Review) - CHANGED: Now in Active tab
 * - Assigned with mapped workspace
 * - In_Progress
 * - Revision
 * - Impediment/Stuck (still active work)
 */
function getOutsourcedTab(
  status: WorkflowStatus,
  role: UserRole,
  context: TabContext
): Tab {
  // Quote flow statuses → Pending (CHANGED: Removed Review from this list)
  if (status === 'Waiting' || status === 'Submitted') {
    return 'pending';
  }

  // Assigned but not mapped → Pending (needs action)
  if (status === 'Assigned' && !context.isWorkspaceMapped) {
    return 'pending';
  }

  // Rejected status - depends on who rejected and who is viewing
  if (status === 'Rejected') {
    return getRejectedTab(role, context);
  }

  // Active work states (On_Hold is handled in main function)
  // Remaining statuses: Assigned, In_Progress, Review, Revision, Impediment, Stuck
  // CHANGED: Review now stays in Active tab for manual submission workflow
  return 'active';
}

/**
 * Determines tab for rejected requirements.
 *
 * The tab depends on:
 * - Who rejected (sender vs receiver)
 * - Who is viewing (sender vs receiver)
 *
 * Sender viewing:
 * - If receiver rejected → Draft (sender needs to edit & resend)
 * - If sender rejected quote → Pending (waiting for receiver to revise)
 *
 * Receiver viewing:
 * - If sender rejected quote → Pending (receiver needs to revise)
 * - If receiver rejected → Pending (waiting for sender to edit)
 */
function getRejectedTab(role: UserRole, context: TabContext): Tab {
  if (role === 'sender') {
    // Sender is viewing
    if (context.isRejectedBySender) {
      // Sender rejected the quote, waiting for receiver to revise
      return 'pending';
    }
    // Receiver rejected the requirement; show in Pending (not Draft) per product rule
    return 'pending';
  }

  // Receiver or internal is viewing
  // Always show in pending - either needs to revise quote or waiting for sender
  return 'pending';
}

/**
 * Determines tab for inhouse/client requirements.
 *
 * Simpler logic:
 * - If approval is pending → 'pending'
 * - Otherwise → 'active'
 */
function getInhouseTab(status: WorkflowStatus, context: TabContext): Tab {
  // If pending approval, show in pending tab
  if (context.approvalStatus === 'pending') {
    return 'pending';
  }

  // Active work states
  if (
    status === 'Assigned' ||
    status === 'In_Progress' ||
    status === 'Submitted' ||
    status === 'Revision' ||
    status === 'Review'
  ) {
    return 'active';
  }

  // Fallback
  return 'active';
}
