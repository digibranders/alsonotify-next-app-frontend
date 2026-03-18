/**
 * Requirement Overdue Detection
 *
 * Determines if requirements are overdue based on their end_date and current status.
 * Used to auto-transition overdue requirements to "Delayed" status.
 */

import type { RequirementStatus } from '../types/requirement.types';

/**
 * Statuses eligible for auto-delay when past due date.
 * These are "active work" statuses where being past the deadline
 * means the requirement should be marked as Delayed.
 */
const AUTO_DELAY_STATUSES: readonly RequirementStatus[] = [
  'Assigned',
  'In_Progress',
  'Review',
  'Revision',
] as const;

/**
 * Checks if a requirement is overdue based on its status and end date.
 *
 * A requirement is overdue when:
 * - It has a valid end_date (not null, not 'TBD')
 * - The end_date is strictly in the past (before the start of today)
 * - Its status is an active work status (Assigned, In_Progress, Review, Revision)
 *
 * NOT overdue when:
 * - Status is already Delayed, On_Hold, Completed, Draft, Waiting, Submitted, Rejected
 * - end_date is today (still has time)
 * - end_date is null or 'TBD'
 */
export function isRequirementOverdue(
  status: string,
  endDate: string | null | undefined
): boolean {
  if (!endDate || endDate === 'TBD') return false;

  if (!AUTO_DELAY_STATUSES.includes(status as RequirementStatus)) return false;

  const end = new Date(endDate);
  if (isNaN(end.getTime())) return false;

  // Compare end of day: requirement is overdue if end_date is before today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return end < today;
}

/**
 * Filters a list of requirements and returns the IDs of overdue ones.
 */
export function getOverdueRequirementIds(
  requirements: ReadonlyArray<{
    id: number;
    status: string;
    end_date?: string | null;
  }>
): number[] {
  return requirements
    .filter((req) => isRequirementOverdue(req.status, req.end_date))
    .map((req) => req.id);
}
