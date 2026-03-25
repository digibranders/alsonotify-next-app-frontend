import { describe, it, expect } from 'vitest';
import { mapNoteToDomain } from './note';
import { NoteDto } from '../../types/dto/note.dto';

const makeDto = (overrides: Partial<NoteDto> = {}): NoteDto => ({
  id: 1,
  user_id: 10,
  company_id: 20,
  title: 'Test Note',
  type: 'TEXT_NOTE',
  color: '#ffffff',
  is_pinned: true,
  is_archived: false,
  labels: ['work', 'important'],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
  content: '<p>Hello</p>',
  ...overrides,
});

describe('mapNoteToDomain', () => {
  it('should map basic fields', () => {
    const result = mapNoteToDomain(makeDto());
    expect(result.id).toBe(1);
    expect(result.title).toBe('Test Note');
    expect(result.type).toBe('TEXT_NOTE');
    expect(result.color).toBe('#ffffff');
  });

  it('should map user and company ids in both formats', () => {
    const result = mapNoteToDomain(makeDto({ user_id: 10, company_id: 20 }));
    expect(result.userId).toBe(10);
    expect(result.user_id).toBe(10);
    expect(result.companyId).toBe(20);
    expect(result.company_id).toBe(20);
  });

  it('should map isPinned from is_pinned', () => {
    const result = mapNoteToDomain(makeDto({ is_pinned: true }));
    expect(result.isPinned).toBe(true);
  });

  it('should default isPinned to false when is_pinned is falsy', () => {
    const result = mapNoteToDomain(makeDto({ is_pinned: false }));
    expect(result.isPinned).toBe(false);
  });

  it('should map isArchived and is_archived', () => {
    const result = mapNoteToDomain(makeDto({ is_archived: true }));
    expect(result.isArchived).toBe(true);
    expect(result.is_archived).toBe(true);
  });

  it('should map date fields in both camel and snake case', () => {
    const result = mapNoteToDomain(makeDto({
      created_at: '2025-03-01T00:00:00Z',
      updated_at: '2025-03-02T00:00:00Z',
    }));
    expect(result.createdAt).toBe('2025-03-01T00:00:00Z');
    expect(result.created_at).toBe('2025-03-01T00:00:00Z');
    expect(result.updatedAt).toBe('2025-03-02T00:00:00Z');
    expect(result.updated_at).toBe('2025-03-02T00:00:00Z');
  });

  it('should use created_at as fallback for updatedAt when updated_at is missing', () => {
    const result = mapNoteToDomain(makeDto({ updated_at: undefined, created_at: '2025-01-01T00:00:00Z' }));
    expect(result.updatedAt).toBe('2025-01-01T00:00:00Z');
  });

  it('should map content for TEXT_NOTE', () => {
    const result = mapNoteToDomain(makeDto({ content: '<p>Some content</p>' }));
    expect(result.content).toBe('<p>Some content</p>');
  });

  it('should map labels', () => {
    const result = mapNoteToDomain(makeDto({ labels: ['tag1', 'tag2'] }));
    expect(result.labels).toEqual(['tag1', 'tag2']);
  });

  it('should map checklist items for CHECKLIST_NOTE', () => {
    const result = mapNoteToDomain(makeDto({
      type: 'CHECKLIST_NOTE',
      items: [
        {
          id: 'item-1',
          text: 'Do something',
          isChecked: true,
          order: 0,
          indentLevel: 0,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ],
    }));
    expect(result.items).toHaveLength(1);
    expect(result.items![0].isChecked).toBe(true);
    expect(result.items![0].text).toBe('Do something');
  });

  it('should handle undefined items gracefully', () => {
    const result = mapNoteToDomain(makeDto({ items: undefined }));
    expect(result.items).toBeUndefined();
  });
});
