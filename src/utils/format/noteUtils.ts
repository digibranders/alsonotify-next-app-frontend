/**
 * Utility functions for note operations
 */

import { NoteType } from '../../types/notes';

/**
 * Normalize note type for filtering and display
 * Handles both frontend (TEXT_NOTE, CHECKLIST_NOTE) and backend ('text', 'checklist') formats
 */
export function normalizeNoteType(type: string | NoteType): 'text' | 'checklist' {
  if (type === 'TEXT_NOTE' || type === 'text') {
    return 'text';
  }
  return 'checklist';
}

/**
 * Check if a note is a text note
 */
export function isTextNote(type: string | NoteType): boolean {
  return normalizeNoteType(type) === 'text';
}

/**
 * Check if a note is a checklist note
 */
export function isChecklistNote(type: string | NoteType): boolean {
  return normalizeNoteType(type) === 'checklist';
}

