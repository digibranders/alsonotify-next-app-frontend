/**
 * Requirement Workflow State Machine
 *
 * Defines valid status transitions for requirements based on user role.
 */

import { REQUIREMENT_STATUSES } from '../types/requirement.types';
import type { RequirementStatus, UserRole } from '../types/requirement.types';

/**
 * Internal requirement transitions.
 * For in-house requirements where sender and receiver are the same company.
 */
export const INTERNAL_TRANSITIONS: Readonly<Record<RequirementStatus, readonly RequirementStatus[]>> = {
  // From Draft: internal can submit for work
  Draft: ['Assigned'],

  // From Assigned: can start work, pause, or delay
  Assigned: ['In_Progress', 'On_Hold', 'Delayed'],

  // From In_Progress: can submit for review, complete, mark as blocked, pause, or delay
  In_Progress: ['Review', 'Completed', 'Impediment', 'Stuck', 'On_Hold', 'Delayed'],

  // From Review: can approve (Completed), need revisions, reassign, or reject
  Review: ['Assigned', 'Completed', 'Revision'],

  // From Revision: can resume work or resubmit for review
  Revision: ['In_Progress', 'Review'],

  // From On_Hold: can resume work or reassign
  On_Hold: ['In_Progress', 'Assigned'],

  // From Delayed: can resume to various states
  Delayed: ['In_Progress', 'Assigned', 'On_Hold'],

  // From Impediment/Stuck: can only resume to In_Progress once unblocked
  Impediment: ['In_Progress'],
  Stuck: ['In_Progress'],

  // From Completed: can reopen for revisions or reassign
  Completed: ['Revision', 'Assigned'],

  // From Rejected: can restart workflow
  Rejected: ['Assigned'],

  // From Waiting/Submitted: these should not exist for internal, but handle gracefully
  Waiting: ['Assigned'],
  Submitted: ['Review', 'Assigned'],
} as const;

/**
 * Sender (Company A / Client) transitions.
 * The company that created and sent the requirement.
 */
export const SENDER_TRANSITIONS: Readonly<Record<RequirementStatus, readonly RequirementStatus[]>> = {
  // From Draft: sender can send to partner
  Draft: ['Waiting'],

  // From Assigned: can pause, delay, or monitor progress
  Assigned: ['On_Hold', 'In_Progress', 'Delayed'],

  // From Waiting: can cancel/pause while waiting for quote, delay, or reject outright
  Waiting: ['On_Hold', 'Rejected', 'Delayed'],

  // QUOTE FLOW: Submitted (Quote Received) -> Accept (Assigned) or Reject
  Submitted: ['Assigned', 'Rejected'],

  // From On_Hold: can resume to various states depending on where it was paused
  On_Hold: ['In_Progress', 'Assigned', 'Waiting'],

  // From Delayed: can resume to various states
  Delayed: ['In_Progress', 'Assigned', 'Waiting', 'On_Hold'],

  // From In_Progress: can pause or delay
  In_Progress: ['On_Hold', 'Delayed'],

  // WORK FLOW: Review (Work Received) -> Approve (Completed) or Request Revision
  Review: ['Completed', 'Revision'],

  // From Completed: can reopen if quality issues found
  Completed: ['Revision', 'Rejected'],

  // From Rejected (Quote Rejected): Sender can edit and Resend (Waiting)
  Rejected: ['Waiting'],

  // Sender cannot transition from these states (receiver's domain)
  Revision: [],
  Impediment: [],
  Stuck: [],
} as const;

/**
 * Receiver (Company B / Vendor / Partner) transitions.
 * The company that receives and works on the requirement.
 */
export const RECEIVER_TRANSITIONS: Readonly<Record<RequirementStatus, readonly RequirementStatus[]>> = {
  // Draft: receiver never sees Draft (requirement not sent yet)
  Draft: [],

  // QUOTE FLOW: Waiting -> Submit Quote (Submitted) or Reject
  Waiting: ['Submitted', 'Rejected'],

  // From Rejected (Quote Rejected): Revise Quote -> Submitted (Back to quote review)
  Rejected: ['Submitted'],

  // After quote accepted (Assigned): can start work (In_Progress)
  Assigned: ['In_Progress'],

  // WORK FLOW: In_Progress -> Submit Work for Review (Review) or mark blocked/delayed
  In_Progress: ['Review', 'Impediment', 'Stuck', 'On_Hold', 'Delayed'],

  // From Delayed: can resume to In_Progress
  Delayed: ['In_Progress'],

  // Revision flow: Resubmit Work (Review) or continue working
  Revision: ['Review', 'In_Progress'],

  // Unblock flows
  Impediment: ['In_Progress'],
  Stuck: ['In_Progress'],

  // Resume from pause
  On_Hold: ['In_Progress'],

  // Allow receiver to pull back from review if needed
  Review: ['In_Progress'],

  // Allow receiver to pull back from submitted quote if needed
  Submitted: ['Waiting'],

  // Receiver cannot transition from Completed (sender's domain)
  Completed: [],
} as const;

/**
 * Get the transition map for a given role.
 *
 * @param role - The user's role relative to the requirement
 * @returns The appropriate transition map
 */
function getTransitionMapForRole(
  role: UserRole
): Readonly<Record<RequirementStatus, readonly RequirementStatus[]>> {
  switch (role) {
    case 'internal':
      return INTERNAL_TRANSITIONS;
    case 'sender':
      return SENDER_TRANSITIONS;
    case 'receiver':
      return RECEIVER_TRANSITIONS;
    default: {
      const _exhaustive: never = role;
      throw new Error(`Unknown role: ${_exhaustive}`);
    }
  }
}

/**
 * Checks if a status transition is valid for the given role.
 *
 * @param from - Current requirement status
 * @param to - Target requirement status
 * @param role - User's role relative to this requirement
 * @returns true if the transition is allowed
 *
 * @example
 * isTransitionValid('Waiting', 'Submitted', 'receiver') // true - receiver can submit quote
 * isTransitionValid('Waiting', 'Completed', 'receiver') // false - cannot skip to completed
 * isTransitionValid('Review', 'Completed', 'sender')    // true - sender can approve work
 */
export function isTransitionValid(
  from: RequirementStatus,
  to: RequirementStatus,
  role: UserRole
): boolean {
  const transitions = getTransitionMapForRole(role);
  const allowedTransitions = transitions[from];
  return allowedTransitions.includes(to);
}

/**
 * Gets all allowed transitions from a given status for a role.
 *
 * Useful for UI to show only valid action buttons.
 *
 * @param status - Current requirement status
 * @param role - User's role relative to this requirement
 * @returns Array of statuses that can be transitioned to
 *
 * @example
 * getAllowedTransitions('Waiting', 'receiver') // ['Submitted', 'Rejected']
 * getAllowedTransitions('Review', 'sender')    // ['Completed', 'Revision']
 */
export function getAllowedTransitions(
  status: RequirementStatus,
  role: UserRole
): readonly RequirementStatus[] {
  const transitions = getTransitionMapForRole(role);
  return transitions[status];
}

/**
 * Type guard to check if a string is a valid RequirementStatus.
 *
 * @param value - String to check
 * @returns true if value is a valid RequirementStatus
 *
 * @example
 * if (isRequirementStatus(req.status)) {
 *   // TypeScript now knows req.status is RequirementStatus
 *   const tab = getRequirementTab(req.status);
 * }
 */
export function isRequirementStatus(value: unknown): value is RequirementStatus {
  return typeof value === 'string' && REQUIREMENT_STATUSES.includes(value as RequirementStatus);
}
