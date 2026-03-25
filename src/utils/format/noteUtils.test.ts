import { describe, it, expect } from 'vitest';
import { normalizeNoteType, isTextNote, isChecklistNote } from './noteUtils';

describe('noteUtils', () => {
  describe('normalizeNoteType', () => {
    it('should normalize text types', () => {
      expect(normalizeNoteType('text')).toBe('text');
      expect(normalizeNoteType('TEXT_NOTE')).toBe('text');
    });

    it('should normalize checklist types', () => {
      expect(normalizeNoteType('checklist')).toBe('checklist');
      expect(normalizeNoteType('CHECKLIST_NOTE')).toBe('checklist');
    });

    it('should default to checklist for unknown types', () => {
      expect(normalizeNoteType('unknown')).toBe('checklist');
    });
  });

  describe('isTextNote', () => {
    it('should return true for text type', () => {
      expect(isTextNote('text')).toBe(true);
      expect(isTextNote('TEXT_NOTE')).toBe(true);
    });

    it('should return false for checklist type', () => {
      expect(isTextNote('checklist')).toBe(false);
    });
  });

  describe('isChecklistNote', () => {
    it('should return true for checklist type', () => {
      expect(isChecklistNote('checklist')).toBe(true);
      expect(isChecklistNote('CHECKLIST_NOTE')).toBe(true);
    });

    it('should return false for text type', () => {
      expect(isChecklistNote('text')).toBe(false);
    });
  });
});
