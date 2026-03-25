import { describe, it, expect } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
  describe('auth', () => {
    it('should return auth user key', () => {
      expect(queryKeys.auth.user()).toEqual(['auth', 'user']);
    });

    it('should return verifyToken key with token', () => {
      expect(queryKeys.auth.verifyToken('abc')).toEqual(['auth', 'verifyToken', 'abc']);
    });
  });

  describe('users', () => {
    it('should return all users key', () => {
      expect(queryKeys.users.all()).toEqual(['users']);
    });

    it('should return user detail key with id', () => {
      const key = queryKeys.users.detail(1);
      expect(key).toEqual(['users', 'detail', 1]);
    });

    it('should return me key', () => {
      expect(queryKeys.users.me()).toEqual(['users', 'me']);
    });

    it('should return employees key with options and search', () => {
      const key = queryKeys.users.employees('page=1', 'john');
      expect(key[0]).toBe('users');
      expect(key[1]).toBe('employees');
      expect(key[2]).toBe('page=1');
      expect(key[3]).toEqual({ search: 'john' });
    });
  });

  describe('tasks', () => {
    it('should return all tasks key', () => {
      expect(queryKeys.tasks.all()).toEqual(['tasks']);
    });

    it('should return task detail key containing detail and id', () => {
      const key = queryKeys.tasks.detail(1);
      expect(key).toEqual(['tasks', 'detail', 1]);
    });

    it('should return list key with filters', () => {
      const key = queryKeys.tasks.list({ status: 'active' });
      expect(key[0]).toBe('tasks');
      expect(key[1]).toBe('list');
      expect(key[2]).toEqual({ status: 'active' });
    });

    it('should return worklogs key', () => {
      const key = queryKeys.tasks.worklogs(5, 10, 0);
      expect(key[0]).toBe('tasks');
      expect(key[1]).toBe('worklogs');
      expect(key[2]).toBe(5);
    });
  });

  describe('workspaces', () => {
    it('should return all workspaces key', () => {
      expect(queryKeys.workspaces.all()).toEqual(['workspaces']);
    });

    it('should return workspace detail key', () => {
      expect(queryKeys.workspaces.detail(3)).toEqual(['workspaces', 'detail', 3]);
    });
  });

  describe('requirements', () => {
    it('should return all requirements key', () => {
      const key = queryKeys.requirements.all();
      expect(key[0]).toBe('requirements');
      expect(key[1]).toBe('all');
    });

    it('should return byWorkspace key', () => {
      expect(queryKeys.requirements.byWorkspace(7)).toEqual(['requirements', 'workspace', 7]);
    });
  });

  describe('notes', () => {
    it('should return all notes key', () => {
      expect(queryKeys.notes.all()).toEqual(['notes']);
    });

    it('should return list key with filters', () => {
      const key = queryKeys.notes.list({ archived: false });
      expect(key).toEqual(['notes', 'list', { archived: false }]);
    });
  });

  describe('notifications', () => {
    it('should return notifications key with default tab', () => {
      expect(queryKeys.notifications.all()).toEqual(['notifications', 'all']);
    });

    it('should return notifications key with custom tab', () => {
      expect(queryKeys.notifications.all('unread')).toEqual(['notifications', 'unread']);
    });
  });
});
