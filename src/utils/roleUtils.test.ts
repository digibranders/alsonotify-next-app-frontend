import { describe, it, expect } from 'vitest';
import { getRoleFromUser } from './roleUtils';

describe('roleUtils', () => {
  describe('getRoleFromUser', () => {
    describe('null/undefined handling', () => {
      it('should return Employee for null user', () => {
        expect(getRoleFromUser(null)).toBe('Employee');
      });

      it('should return Employee for undefined user', () => {
        expect(getRoleFromUser(undefined)).toBe('Employee');
      });
    });

    describe('role.name based detection', () => {
      it('should return Admin when role name contains "admin" (case insensitive)', () => {
        expect(getRoleFromUser({ role: { name: 'Admin' } })).toBe('Admin');
        expect(getRoleFromUser({ role: { name: 'ADMIN' } })).toBe('Admin');
        expect(getRoleFromUser({ role: { name: 'Super Admin' } })).toBe('Admin');
        expect(getRoleFromUser({ role: { name: 'administrator' } })).toBe('Admin');
      });

      it('should return Manager when role name contains "manager"', () => {
        expect(getRoleFromUser({ role: { name: 'Manager' } })).toBe('Manager');
        expect(getRoleFromUser({ role: { name: 'Project Manager' } })).toBe('Manager');
        expect(getRoleFromUser({ role: { name: 'MANAGER' } })).toBe('Manager');
      });

      it('should return Head when role name contains "Head"', () => {
        expect(getRoleFromUser({ role: { name: 'Head' } })).toBe('Head');
        expect(getRoleFromUser({ role: { name: 'Head of Department' } })).toBe('Head');
      });

      it('should return HR when role name is exactly "hr"', () => {
        expect(getRoleFromUser({ role: { name: 'HR' } })).toBe('HR');
      });

      it('should return Finance when role name is exactly "finance"', () => {
        expect(getRoleFromUser({ role: { name: 'Finance' } })).toBe('Finance');
      });

      it('should return Coordinator when role name contains "coordinator"', () => {
        expect(getRoleFromUser({ role: { name: 'Coordinator' } })).toBe('Coordinator');
        expect(getRoleFromUser({ role: { name: 'Project Coordinator' } })).toBe('Coordinator');
      });

      it('should check admin before hr (HR Admin returns Admin)', () => {
        // "HR Admin" contains "admin", checked first in fuzzy match logic?
        // Code: if (roleLower.includes('admin')) return 'Admin';
        expect(getRoleFromUser({ role: { name: 'HR Admin' } })).toBe('Admin');
      });

      it('should check manager before hr (HR Manager returns Manager)', () => {
        // "HR Manager" contains "manager", checked first
        expect(getRoleFromUser({ role: { name: 'HR Manager' } })).toBe('Manager');
      });
    });

    describe('user_employee.role.name based detection', () => {
      it('should detect role from user_employee.role.name', () => {
        expect(getRoleFromUser({ user_employee: { role: { name: 'Admin' } } })).toBe('Admin');
        expect(getRoleFromUser({ user_employee: { role: { name: 'Manager' } } })).toBe('Manager');
        // 'Leader' is legacy, might default to Employee if not explicitly handled by string.
        // Let's test valid Head string
        expect(getRoleFromUser({ user_employee: { role: { name: 'Head' } } })).toBe('Head');
      });
    });

    describe('role_id fallback', () => {
      it('should return Admin for role_id 1', () => {
        expect(getRoleFromUser({ role_id: 1 })).toBe('Admin');
      });

      it('should return Employee for role_id 2', () => {
        expect(getRoleFromUser({ role_id: 2 })).toBe('Employee');
      });

      it('should return HR for role_id 3', () => {
        expect(getRoleFromUser({ role_id: 3 })).toBe('HR');
      });

      it('should return Admin for role_id 4', () => {
        expect(getRoleFromUser({ role_id: 4 })).toBe('Admin');
      });

      it('should return Department Head for role_id 5', () => {
        expect(getRoleFromUser({ role_id: 5 })).toBe('Head');
      });

      it('should return Finance for role_id 6', () => {
        expect(getRoleFromUser({ role_id: 6 })).toBe('Finance');
      });

      it('should return Manager for role_id 7', () => {
        expect(getRoleFromUser({ role_id: 7 })).toBe('Manager');
      });

      it('should return Coordinator for role_id 8', () => {
        expect(getRoleFromUser({ role_id: 8 })).toBe('Coordinator');
      });

      it('should use user_employee.role_id as fallback', () => {
        expect(getRoleFromUser({ user_employee: { role_id: 1 } })).toBe('Admin');
        expect(getRoleFromUser({ user_employee: { role_id: 7 } })).toBe('Manager');
      });

      it('should use role.id as fallback', () => {
        expect(getRoleFromUser({ role: { id: 1 } })).toBe('Admin');
        expect(getRoleFromUser({ role: { id: 5 } })).toBe('Head'); // Updated from Leader
      });
    });

    describe('missing optional fields handling', () => {
      it('should not throw on empty user object', () => {
        expect(() => getRoleFromUser({})).not.toThrow();
        expect(getRoleFromUser({})).toBe('Employee');
      });

      it('should not throw when role is null', () => {
        expect(() => getRoleFromUser({ role: null })).not.toThrow();
        expect(getRoleFromUser({ role: null })).toBe('Employee');
      });

      it('should not throw when user_employee is null', () => {
        expect(() => getRoleFromUser({ user_employee: null })).not.toThrow();
        expect(getRoleFromUser({ user_employee: null })).toBe('Employee');
      });

      it('should not throw when user_employee.role is null', () => {
        expect(() => getRoleFromUser({ user_employee: { role: null } })).not.toThrow();
        expect(getRoleFromUser({ user_employee: { role: null } })).toBe('Employee');
      });

      it('should not throw with deeply nested missing fields', () => {
        const user = {
          role: undefined,
          role_id: undefined,
          user_employee: {
            role: undefined,
            role_id: undefined,
          },
        };
        expect(() => getRoleFromUser(user)).not.toThrow();
        expect(getRoleFromUser(user)).toBe('Employee');
      });
    });

    describe('unknown role handling', () => {
      it('should return Employee for unknown role_id', () => {
        expect(getRoleFromUser({ role_id: 999 })).toBe('Employee');
        expect(getRoleFromUser({ role_id: 0 })).toBe('Employee');
        expect(getRoleFromUser({ role_id: -1 })).toBe('Employee');
      });

      it('should return Employee for unknown role name', () => {
        expect(getRoleFromUser({ role: { name: 'Unknown Role' } })).toBe('Employee');
        expect(getRoleFromUser({ role: { name: 'Custom' } })).toBe('Employee');
      });
    });

    describe('priority order', () => {
      it('should prioritize role.name over role_id', () => {
        // role.name says Manager but role_id says Admin
        const user = { role: { name: 'Manager' }, role_id: 1 };
        expect(getRoleFromUser(user)).toBe('Manager');
      });

      it('should prioritize role.name over user_employee.role_id', () => {
        const user = { role: { name: 'Head' }, user_employee: { role_id: 1 } };
        expect(getRoleFromUser(user)).toBe('Head'); // Updated from Leader
      });
    });
  });
});
