/**
 * Common Types for Workflow Module
 *
 * Shared types used across requirement and task workflows.
 * These types are foundational and imported by other workflow type files.
 */

/**
 * Tab type for UI navigation in requirements/tasks views.
 * Maps to the tab filters shown in RequirementsPage and TasksPage.
 */
export type Tab = 'draft' | 'pending' | 'active' | 'completed' | 'delayed' | 'archived';

/**
 * Modal types for workflow actions.
 * Determines which modal dialog to open based on the action being performed.
 *
 * - quotation: Submit or review a price quote
 * - reject: Reject a requirement or quote with reason
 * - mapping: Map a requirement to a workspace
 * - edit: Edit requirement details
 * - client_accept: Accept client work and map workspace (combined action for B)
 * - none: No modal needed, direct API action
 */
export type ModalType = 'quotation' | 'reject' | 'mapping' | 'edit' | 'submit_approval' | 'approval' | 'revision' | 'client_accept' | 'none';
