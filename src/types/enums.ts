/**
 * Centralized Enum Definitions
 *
 * Single source of truth for all enum values used across the frontend.
 * These match the backend Prisma enums exactly.
 *
 * For workflow-specific types (CTA configs, action types), import from '@/lib/workflow'.
 */

// Re-export from workflow module (canonical definitions)
export { TASK_STATUSES } from '@/lib/workflow/types/task.types';
export type { TaskStatus, MemberStatus, ExecutionMode } from '@/lib/workflow/types/task.types';

export { REQUIREMENT_STATUSES } from '@/lib/workflow/types/requirement.types';
export type { RequirementStatus, UserRole } from '@/lib/workflow/types/requirement.types';

/**
 * PricingModel - How a requirement is priced.
 * Matches backend: pricing_model String? field with validated values.
 */
export const PRICING_MODELS = ['hourly', 'project'] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

/**
 * InvoiceStatus - Status of an invoice.
 * Matches backend Prisma InvoiceStatus enum.
 */
export const INVOICE_STATUSES = ['draft', 'paid', 'past_due', 'open'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/**
 * WorkspaceStatus - Status of a workspace/project.
 * Matches backend Prisma WorkspaceStatus enum.
 */
export const WORKSPACE_STATUSES = [
  'Active',
  'Archived',
  'Assigned',
  'In_Progress',
  'On_Hold',
  'Submitted',
  'Completed',
  'Waiting',
  'Rejected',
  'Review',
  'Revision',
] as const;
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

/**
 * TaskMemberStatus - Status for individual task members.
 * Matches backend TaskMemberStatus constant.
 */
export const TASK_MEMBER_STATUSES = [
  'PendingEstimate',
  'Assigned',
  'In_Progress',
  'Completed',
  'Pending',
] as const;
export type TaskMemberStatus = (typeof TASK_MEMBER_STATUSES)[number];

/**
 * RequirementType - How a requirement is sourced.
 */
export type RequirementType = 'inhouse' | 'outsourced' | 'client';

/**
 * EmployeeStatus - Active/inactive status for employees.
 */
export type EmployeeStatus = 'active' | 'inactive';

/**
 * InviteStatus - Status of a user invitation.
 */
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
