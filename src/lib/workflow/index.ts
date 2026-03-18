/**
 * Workflow Module - Public API
 *
 * Centralized workflow logic for requirements and tasks.
 * Import from '@/lib/workflow' to access all workflow functionality.
 *
 * @example
 * import {
 *   type RequirementStatus,
 *   type UserRole,
 *   isTransitionValid,
 *   getAllowedTransitions,
 *   getRequirementCTAConfig,
 *   getRequirementTab,
 * } from '@/lib/workflow';
 *
 * // Check if a transition is valid
 * if (isTransitionValid('Waiting', 'Submitted', 'receiver')) {
 *   // Allow the action
 * }
 *
 * // Get CTA configuration for a requirement
 * const ctaConfig = getRequirementCTAConfig('Waiting', 'receiver', context);
 */

// =============================================================================
// Type Exports
// =============================================================================

// Common types for UI navigation and modals
export type { Tab, ModalType } from './types/common.types';

// Requirement status and role types
export type {
  RequirementStatus,
  SpecialStatus,
  RequirementFlags,
  UserRole,
  ActionType,
  ActionConfig,
  RequirementCTAConfig,
  RequirementContext,
} from './types/requirement.types';

// Requirement status constants
export { REQUIREMENT_STATUSES } from './types/requirement.types';

// Task status and execution types
export type {
  TaskStatus,
  MemberStatus,
  ExecutionMode,
  TaskActionType,
  TaskActionConfig,
  TaskCTAConfig,
  TaskMemberInfo,
  TaskInfo,
} from './types/task.types';

// Task status constants
export { TASK_STATUSES } from './types/task.types';

// Requirement tab determination types
export type { RequirementType, TabContext } from './requirement/requirementTab';

// Task CTA context types
export type { TaskCTAContext } from './task/taskCTA';

// Modal configuration types
export type {
  FieldType,
  PricingModel,
  ModalContext,
  FieldDefinition,
  FieldValidation,
  ModalFieldConfig,
  RejectAction,
} from './requirement/requirementModal';

// =============================================================================
// Constant Exports
// =============================================================================

// Requirement state machine transition maps
export {
  INTERNAL_TRANSITIONS,
  SENDER_TRANSITIONS,
  RECEIVER_TRANSITIONS,
} from './requirement/requirementWorkflow';

// Task state machine transition map
export { TASK_TRANSITIONS } from './task/taskWorkflow';

// =============================================================================
// Function Exports
// =============================================================================

// Requirement state transition validation
export {
  isTransitionValid,
  getAllowedTransitions,
  isRequirementStatus,
} from './requirement/requirementWorkflow';

// Task state transition validation
export {
  isTaskTransitionValid,
  getAllowedTaskTransitions,
  isTaskStatus,
} from './task/taskWorkflow';

// Status aggregation and rollup
export {
  aggregateMemberStatuses,
  deriveRequirementStatusFromTasks,
} from './rollup/statusRollup';

// Requirement tab determination
export { getRequirementTab } from './requirement/requirementTab';

// Requirement CTA configuration
export { getRequirementCTAConfig } from './requirement/requirementCTA';

// Modal field configurations
export {
  getQuotationModalConfig,
  getRejectModalConfig,
  getMappingModalConfig,
  getEditModalConfig,
  filterFieldsByContext,
  validateField,
} from './requirement/requirementModal';


// Task CTA configuration
export { getTaskCTAConfig, getTaskTab } from './task/taskCTA';

// Task UI Configuration (Colors, Icons, Labels)
export { getTaskStatusUI } from './task/taskUI';
export type { TaskUIConfig } from './task/taskUI';

// Requirement overdue detection
export { isRequirementOverdue, getOverdueRequirementIds } from './requirement/requirementOverdue';
