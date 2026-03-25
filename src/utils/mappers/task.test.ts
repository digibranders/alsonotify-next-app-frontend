import { describe, it, expect } from 'vitest';
import { mapTaskToDomain } from './task';
import { TaskDto } from '../../types/dto/task.dto';

const makeDto = (overrides: Partial<TaskDto> = {}): TaskDto => ({
  id: 1,
  title: 'Test Task',
  name: 'Test Task',
  status: 'Assigned',
  start_date: '2025-01-01',
  end_date: '2025-01-31',
  estimated_time: 10,
  time_spent: 3,
  total_seconds_spent: 10800,
  is_high_priority: true,
  member_user: { id: 2, name: 'John Doe' },
  company: { id: 1, name: 'Acme Corp' },
  task_requirement: { id: 5, name: 'Feature X' },
  leader_user: { id: 3, name: 'Jane Lead' },
  ...overrides,
});

describe('mapTaskToDomain', () => {
  it('should stringify the id', () => {
    const result = mapTaskToDomain(makeDto({ id: 42 }));
    expect(result.id).toBe('42');
    expect(result.taskId).toBe('42');
  });

  it('should use valid status from DTO', () => {
    const result = mapTaskToDomain(makeDto({ status: 'In_Progress' as any }));
    expect(result.status).toBe('In_Progress');
  });

  it('should default to Assigned for invalid status', () => {
    const result = mapTaskToDomain(makeDto({ status: 'InvalidStatus' as any }));
    expect(result.status).toBe('Assigned');
  });

  it('should default to Assigned when status is missing', () => {
    const result = mapTaskToDomain(makeDto({ status: undefined }));
    expect(result.status).toBe('Assigned');
  });

  it('should resolve assignedTo from member_user', () => {
    const result = mapTaskToDomain(makeDto({ member_user: { id: 2, name: 'Alice' } }));
    expect(result.assignedTo).toBe('Alice');
  });

  it('should resolve assignedTo from task_members when member_user is missing', () => {
    const result = mapTaskToDomain(makeDto({
      member_user: null,
      task_members: [{
        id: 1, user_id: 2, status: 'active', estimated_time: null,
        queue_order: 0, execution_mode: 'parallel', is_current_turn: true,
        seconds_spent: 0, active_worklog_start_time: null,
        user: { id: 2, name: 'Bob' },
      }],
    }));
    expect(result.assignedTo).toBe('Bob');
  });

  it('should default assignedTo to Unassigned', () => {
    const result = mapTaskToDomain(makeDto({ member_user: null, task_members: undefined }));
    expect(result.assignedTo).toBe('Unassigned');
  });

  it('should resolve client from company name', () => {
    const result = mapTaskToDomain(makeDto({ company: { id: 1, name: 'Acme' } }));
    expect(result.client).toBe('Acme');
  });

  it('should resolve project from task_requirement name', () => {
    const result = mapTaskToDomain(makeDto({ task_requirement: { id: 5, name: 'Project Alpha' } }));
    expect(result.project).toBe('Project Alpha');
  });

  it('should resolve leader from leader_user', () => {
    const result = mapTaskToDomain(makeDto({ leader_user: { id: 3, name: 'Leader Jane' } }));
    expect(result.leader).toBe('Leader Jane');
  });

  it('should fall back to manager_user for leader', () => {
    const result = mapTaskToDomain(makeDto({
      leader_user: null,
      manager_user: { id: 4, name: 'Manager Sam' },
    }));
    expect(result.leader).toBe('Manager Sam');
  });

  it('should use Untitled when name is missing', () => {
    const result = mapTaskToDomain(makeDto({ name: '' }));
    expect(result.name).toBe('Untitled');
  });

  it('should compute estTime and timeSpent as numbers', () => {
    const result = mapTaskToDomain(makeDto({ estimated_time: 5, time_spent: 2 }));
    expect(result.estTime).toBe(5);
    expect(result.timeSpent).toBe(2);
  });

  it('should default estTime and timeSpent to 0 when null', () => {
    const result = mapTaskToDomain(makeDto({ estimated_time: null, time_spent: undefined }));
    expect(result.estTime).toBe(0);
    expect(result.timeSpent).toBe(0);
  });

  it('should set is_high_priority defaulting to false', () => {
    const result = mapTaskToDomain(makeDto({ is_high_priority: undefined }));
    expect(result.is_high_priority).toBe(false);
  });

  it('should format timelineDate from end_date', () => {
    const result = mapTaskToDomain(makeDto({ end_date: '2025-06-15' }));
    expect(result.timelineDate).toBe('Jun 15');
  });

  it('should set timelineDate to N/A when no end_date', () => {
    const result = mapTaskToDomain(makeDto({ end_date: null }));
    expect(result.timelineDate).toBe('N/A');
  });

  it('should set timelineLabel to Overdue when status is Delayed', () => {
    const result = mapTaskToDomain(makeDto({ status: 'Delayed' as any }));
    expect(result.timelineLabel).toBe('Overdue');
  });
});
