import { describe, it, expect } from 'vitest';
import { mapRequirementToDomain } from './requirement';
import { RequirementDto } from '../../types/dto/requirement.dto';

const makeDto = (overrides: Partial<RequirementDto> = {}): RequirementDto => ({
  id: 1,
  name: 'Test Requirement',
  description: 'A description',
  status: 'Draft' as any,
  start_date: '2025-01-01',
  end_date: '2025-06-30',
  is_high_priority: true,
  workspace: { id: 10, name: 'Workspace Alpha' },
  total_tasks: 10,
  completed_tasks: 5,
  created_at: '2025-01-01T00:00:00Z',
  quoted_price: 5000,
  pricing_model: 'hourly' as any,
  receiver_workspace_id: 20,
  ...overrides,
});

describe('mapRequirementToDomain', () => {
  it('should map id directly', () => {
    const result = mapRequirementToDomain(makeDto({ id: 42 }));
    expect(result.id).toBe(42);
  });

  it('should map title and name from DTO name', () => {
    const result = mapRequirementToDomain(makeDto({ name: 'Feature Y' }));
    expect(result.title).toBe('Feature Y');
    expect(result.name).toBe('Feature Y');
  });

  it('should default title to Untitled Requirement when name is empty', () => {
    const result = mapRequirementToDomain(makeDto({ name: null }));
    expect(result.title).toBe('Untitled Requirement');
  });

  it('should flatten workspace name from workspace object', () => {
    const result = mapRequirementToDomain(makeDto({ workspace: { id: 10, name: 'WS' } }));
    expect(result.workspace).toBe('WS');
  });

  it('should handle workspace as string', () => {
    const result = mapRequirementToDomain(makeDto({ workspace: 'String WS' as any }));
    expect(result.workspace).toBe('String WS');
  });

  it('should use valid status from DTO', () => {
    const result = mapRequirementToDomain(makeDto({ status: 'In_Progress' as any }));
    expect(result.status).toBe('In_Progress');
  });

  it('should default to Draft for invalid status', () => {
    const result = mapRequirementToDomain(makeDto({ status: 'InvalidStatus' as any }));
    expect(result.status).toBe('Draft');
  });

  it('should calculate progress from total_tasks and completed_tasks', () => {
    const result = mapRequirementToDomain(makeDto({
      progress: undefined,
      total_tasks: 10,
      completed_tasks: 5,
    }));
    expect(result.progress).toBe(50);
  });

  it('should use progress from DTO when provided', () => {
    const result = mapRequirementToDomain(makeDto({ progress: 75 }));
    expect(result.progress).toBe(75);
  });

  it('should default progress to 0 when no tasks', () => {
    const result = mapRequirementToDomain(makeDto({
      progress: undefined,
      total_tasks: undefined,
      total_task: undefined,
      completed_tasks: undefined,
      tasks_completed: undefined,
    }));
    expect(result.progress).toBe(0);
  });

  it('should map tasksCompleted and tasksTotal', () => {
    const result = mapRequirementToDomain(makeDto({
      completed_tasks: 3,
      total_tasks: 8,
    }));
    expect(result.tasksCompleted).toBe(3);
    expect(result.tasksTotal).toBe(8);
  });

  it('should fall back to total_task and tasks_completed fields', () => {
    const result = mapRequirementToDomain(makeDto({
      completed_tasks: undefined,
      tasks_completed: 2,
      total_tasks: undefined,
      total_task: 6,
    }));
    expect(result.tasksCompleted).toBe(2);
    expect(result.tasksTotal).toBe(6);
  });

  it('should map company from sender_company when company is missing', () => {
    const result = mapRequirementToDomain(makeDto({
      company: null,
      sender_company: { name: 'Sender Inc', id: 1 },
    }));
    expect(result.company).toBe('Sender Inc');
  });

  it('should map dueDate from end_date', () => {
    const result = mapRequirementToDomain(makeDto({ end_date: '2025-12-31' }));
    expect(result.dueDate).toBe('2025-12-31');
  });

  it('should set is_high_priority defaulting to false', () => {
    const result = mapRequirementToDomain(makeDto({ is_high_priority: undefined }));
    expect(result.is_high_priority).toBe(false);
  });

  it('should map receiver_project_id from receiver_workspace_id', () => {
    const result = mapRequirementToDomain(makeDto({ receiver_workspace_id: 99 }));
    expect(result.receiver_project_id).toBe(99);
  });

  it('should map quotedPrice and pricingModel', () => {
    const result = mapRequirementToDomain(makeDto({
      quoted_price: 1500,
      pricing_model: 'project' as any,
    }));
    expect(result.quotedPrice).toBe(1500);
    expect(result.pricingModel).toBe('project');
  });

  it('should set assignedTo to empty array', () => {
    const result = mapRequirementToDomain(makeDto());
    expect(result.assignedTo).toEqual([]);
  });
});
