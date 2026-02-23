/**
 * Requirement Workflow Helper Functions
 * 
 * Helper functions to map Requirement domain objects to workflow module types.
 * These functions are used by components to convert Requirement objects to the
 * types expected by the workflow module (@/lib/workflow).
 */

import { Requirement } from "@/types/domain";
import {
  isRequirementStatus,
  type RequirementStatus,
  type UserRole,
  type RequirementContext,
  type RequirementType,
} from '@/lib/workflow';

// Keep type exports for backward compatibility if needed
export interface RequirementActionState {
  isPending: boolean;
  displayStatus: string;
  actionButton?: 'Approve' | 'Reject' | 'Revise' | 'Edit' | 'Map' | 'Submit';
  actionButtonLabel?: string;
  isSender: boolean;
  isReceiver: boolean;
}

export type RequirementTab = 'draft' | 'pending' | 'active' | 'completed' | 'delayed' | 'archived';

// =============================================================================
// Helper Functions - Map Requirement to Workflow Types
// =============================================================================

/**
 * Maps a Requirement's rawStatus to a workflow RequirementStatus or 'draft'.
 * 
 * @param req - The requirement object
 * @returns RequirementStatus enum value or 'draft' special status
 */
export function mapRequirementToStatus(req: Requirement): RequirementStatus | 'draft' {
  const rawStatus = req.rawStatus;

  // Handle Draft (first-class) or legacy lowercase
  if (rawStatus === 'Draft' || rawStatus === 'draft') {
    return 'Draft';
  }

  // Handle archived - treat as regular status (archived flag handled separately in context)
  // Archived status should not exist in workflow, but handle gracefully
  if (rawStatus === 'Archived' || rawStatus === 'archived') {
    // Return a valid workflow status - will be handled by isArchived flag in context
    return 'Assigned'; // Default fallback, archived flag will override tab
  }

  // Use type guard to validate status
  if (rawStatus && isRequirementStatus(rawStatus)) {
    return rawStatus;
  }

  // Fallback for unknown statuses
  console.warn(`Unknown requirement status: ${rawStatus}, defaulting to 'Waiting'`);
  return 'Waiting';
}

/**
 * Maps a Requirement's role flags to a workflow UserRole.
 * 
 * @param req - The requirement object
 * @returns UserRole enum value
 */
export function mapRequirementToRole(req: Requirement): UserRole {
  if (req.isSender === true) {
    return 'sender';
  }
  if (req.isReceiver === true) {
    return 'receiver';
  }
  return 'internal';
}

/**
 * Maps a Requirement to RequirementContext for workflow module.
 * 
 * @param req - The requirement object
 * @param currentUserId - Current user ID for rejection source detection
 * @param role - User role (needed for rejection source detection)
 * @returns RequirementContext object
 */
export function mapRequirementToContext(
  req: Requirement,
  currentUserId?: number,
  role?: UserRole
): RequirementContext {
  const reqType = mapRequirementToType(req);

  // For client work: "fully workspace mapped" means B's workspace_id is set
  // For outsourced: "fully workspace mapped" means B's receiver_workspace_id is set
  const isWorkspaceMapped = reqType === 'client'
    ? !!req.workspace_id  // B's workspace (set at acceptance for client work)
    : !!req.receiver_workspace_id; // B's workspace (set for outsourced)

  const hasQuotedPrice = !!req.quoted_price;

  // Determine rejection source: if updated_user matches currentUserId and role is sender,
  // then sender rejected. Otherwise, if role is receiver and updated_user matches, receiver rejected.
  let isRejectedBySender = false;
  if (req.rawStatus === 'Rejected' && currentUserId && req.updated_user) {
    if (role === 'sender' && Number(req.updated_user) === Number(currentUserId)) {
      isRejectedBySender = true; // Sender rejected the quote
    } else if (role === 'receiver' && Number(req.updated_user) !== Number(currentUserId)) {
      isRejectedBySender = true; // Sender rejected (receiver didn't update it)
    }
  }

  return {
    isWorkspaceMapped,
    isRejectedBySender,
    hasQuotedPrice,
  };
}

/**
 * Maps a Requirement to RequirementType for workflow module.
 * 
 * @param req - The requirement object
 * @returns RequirementType enum value
 */
export function mapRequirementToType(req: Requirement): RequirementType {
  if (req.type === 'outsourced') {
    return 'outsourced';
  }
  if (req.type === 'client') {
    return 'client';
  }
  return 'inhouse';
}

