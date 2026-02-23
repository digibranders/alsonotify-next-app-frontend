/**
 * Requirement Types for Workflow Module
 *
 * Type definitions for requirement status, user roles, and CTA configurations.
 */

import type { Tab, ModalType } from './common.types';

/**
 * All valid requirement status values as a constant array.
 * Single source of truth - used for both type definition and runtime validation.
 * Matches backend Prisma enum exactly (12 values).
 */
export const REQUIREMENT_STATUSES = [
  'Draft',
  'Assigned',
  'In_Progress',
  'On_Hold',
  'Submitted',
  'Completed',
  'Waiting',
  'Rejected',
  'Review',
  'Revision',
  'Delayed',
] as const;

/**
 * RequirementStatus - All possible states for a requirement.
 * Derived from REQUIREMENT_STATUSES constant (12 values).
 *
 * Workflow stages:
 * - Quote Flow: Waiting → Submitted → Assigned (or Rejected)
 * - Work Flow: Assigned → In_Progress → Review → Completed (or Revision)
 * - Blocking: On_Hold, Delayed
 * - Terminal: Completed
 */
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

/**
 * Special statuses that exist outside the main workflow.
 * Used for UI tab determination but not part of state machine transitions.
 */
export type SpecialStatus = 'draft';

/**
 * Requirement flags for UI-only state management.
 * These are separate from the workflow status.
 *
 * @property isArchived - Whether the requirement has been archived (soft-delete)
 */
export interface RequirementFlags {
  readonly isArchived: boolean;
}

/**
 * UserRole - The role of the current user relative to a requirement.
 *
 * - sender: Company A that created/sent the requirement (client)
 * - receiver: Company B that receives and works on the requirement (vendor/partner)
 * - internal: In-house requirement where sender and receiver are the same company
 */
export type UserRole = 'sender' | 'receiver' | 'internal';

/**
 * ActionType - Categories of actions that can be performed on a requirement.
 */
export type ActionType = 'primary' | 'secondary' | 'danger' | 'info';

/**
 * ActionConfig - Configuration for a single action button.
 *
 * @property label - Display text for the button
 * @property type - Visual style/importance of the action
 * @property modal - Which modal to open (if any)
 * @property apiAction - The API action to perform (e.g., 'accept', 'reject', 'submit')
 */
export interface ActionConfig {
  readonly label: string;
  readonly type: ActionType;
  readonly modal: ModalType;
  readonly apiAction?: string;
}

/**
 * RequirementCTAConfig - Complete CTA (Call-To-Action) configuration for a requirement.
 *
 * Determines what the UI should display based on requirement status and user role.
 *
 * @property displayStatus - Human-readable status text to show in the UI
 * @property isPending - Whether this requirement is awaiting action
 * @property tab - Which tab this requirement should appear in
 * @property primaryAction - Main action button configuration (optional)
 * @property secondaryAction - Secondary action button configuration (optional)
 *
 * @example
 * // Receiver sees "Waiting" status
 * {
 *   displayStatus: 'Action Needed: Submit Quote',
 *   isPending: true,
 *   tab: 'pending',
 *   primaryAction: { label: 'Submit Quote', type: 'primary', modal: 'quotation' },
 *   secondaryAction: { label: 'Reject', type: 'danger', modal: 'reject' }
 * }
 */
export interface RequirementCTAConfig {
  readonly displayStatus: string;
  readonly isPending: boolean;
  readonly tab: Tab;
  readonly primaryAction?: ActionConfig;
  readonly secondaryAction?: ActionConfig;
}

/**
 * RequirementContext - Additional context needed for CTA determination.
 *
 * Some CTA decisions depend on more than just status and role.
 *
 * @property isWorkspaceMapped - Whether receiver has mapped their workspace
 * @property isRejectedBySender - Whether the sender rejected (vs receiver)
 * @property hasQuotedPrice - Whether a quote has been submitted
 */
export interface RequirementContext {
  readonly isWorkspaceMapped: boolean;
  readonly isRejectedBySender: boolean;
  readonly hasQuotedPrice: boolean;
}
