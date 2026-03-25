import { describe, it, expect } from 'vitest';
import { mapWorkspaceToDomain } from './workspace';
import { WorkspaceDto } from '../../types/dto/workspace.dto';

const makeDto = (overrides: Partial<WorkspaceDto> = {}): WorkspaceDto => ({
  id: 1,
  name: 'Test Workspace',
  status: 'Active' as any,
  is_active: true,
  total_task: 20,
  total_task_in_progress: 8,
  total_task_delayed: 2,
  total_task_completed: 10,
  ...overrides,
});

describe('mapWorkspaceToDomain', () => {
  it('should default status to Active when missing', () => {
    const result = mapWorkspaceToDomain(makeDto({ status: undefined }));
    expect(result.status).toBe('Active');
  });

  it('should preserve provided status', () => {
    const result = mapWorkspaceToDomain(makeDto({ status: 'Archived' as any }));
    expect(result.status).toBe('Archived');
  });

  it('should default is_active to true when undefined', () => {
    const result = mapWorkspaceToDomain(makeDto({ is_active: undefined }));
    expect(result.is_active).toBe(true);
  });

  it('should map task_count from total_task', () => {
    const result = mapWorkspaceToDomain(makeDto({ total_task: 15 }));
    expect(result.task_count).toBe(15);
  });

  it('should default task_count to 0 when total_task is undefined', () => {
    const result = mapWorkspaceToDomain(makeDto({ total_task: undefined }));
    expect(result.task_count).toBe(0);
  });

  it('should map in_progress_count from total_task_in_progress', () => {
    const result = mapWorkspaceToDomain(makeDto({ total_task_in_progress: 5 }));
    expect(result.in_progress_count).toBe(5);
  });

  it('should map delayed_count from total_task_delayed', () => {
    const result = mapWorkspaceToDomain(makeDto({ total_task_delayed: 3 }));
    expect(result.delayed_count).toBe(3);
  });

  it('should map completed_count from total_task_completed', () => {
    const result = mapWorkspaceToDomain(makeDto({ total_task_completed: 7 }));
    expect(result.completed_count).toBe(7);
  });

  it('should map client from client_user when present', () => {
    const result = mapWorkspaceToDomain(makeDto({
      client: undefined,
      client_user: { name: 'Client User', id: 5 },
    }));
    expect(result.client).toEqual({ id: 5, name: 'Client User' });
  });

  it('should map client from client object when present', () => {
    const result = mapWorkspaceToDomain(makeDto({
      client: { id: 3, name: 'Client Corp' },
      client_user: undefined,
    }));
    expect(result.client).toEqual({ id: 3, name: 'Client Corp' });
  });

  it('should set client to undefined when no client data', () => {
    const result = mapWorkspaceToDomain(makeDto({
      client: undefined,
      client_user: undefined,
    }));
    expect(result.client).toBeUndefined();
  });

  it('should map client_company_name from dto field', () => {
    const result = mapWorkspaceToDomain(makeDto({ client_company_name: 'Corp Inc' }));
    expect(result.client_company_name).toBe('Corp Inc');
  });

  it('should fall back client_company_name to client_user name', () => {
    const result = mapWorkspaceToDomain(makeDto({
      client_company_name: undefined,
      client_user: { name: 'Fallback Name' },
    }));
    expect(result.client_company_name).toBe('Fallback Name');
  });
});
