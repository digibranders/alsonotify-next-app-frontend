// Google Keep-style Note Types with strict type separation
import { NoteTypeDto, ChecklistItemDto, NoteDto, CreateNoteDto, UpdateNoteDto } from './dto/note.dto';

export type NoteType = NoteTypeDto;
export type ChecklistItem = ChecklistItemDto;
export type Note = NoteDto;
export type NoteCreate = CreateNoteDto;
export type NoteUpdate = UpdateNoteDto;

// Type conversion helpers
// Helper to strip HTML and decode entities
function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html; // Server-side fallback
  
  const tmp = document.createElement('DIV');
  // Replace block tags with newlines to preserve structure
  let processed = html.replace(/<(div|p|br|li|h[1-6])[^>]*>/gi, '\n');
  tmp.innerHTML = processed;
  return tmp.textContent || tmp.innerText || '';
}

export function convertTextToChecklist(content: string): ChecklistItem[] {
  if (!content || content.trim() === '') {
    return [createEmptyChecklistItem(0)];
  }
  
  // Strip HTML tags if looks like HTML (contains < and >)
  const isHtml = /<[^>]+>/.test(content);
  const plainText = isHtml ? stripHtml(content) : content;
  
  const lines = plainText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) {
    return [createEmptyChecklistItem(0)];
  }
  
  return lines.map((line, index) => ({
    id: `item-${Date.now()}-${index}`,
    text: line.trim(),
    isChecked: false,
    order: index,
    indentLevel: 0,
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export function convertChecklistToText(items: ChecklistItem[]): string {
  if (!items || items.length === 0) {
    return '';
  }
  
  // Separate checked and unchecked
  const unchecked = items.filter(item => !item.isChecked).sort((a, b) => a.order - b.order);
  const checked = items.filter(item => item.isChecked).sort((a, b) => a.order - b.order);
  
  // Combine: unchecked first, then checked
  const allItems = [...unchecked, ...checked];
  
  // Convert to text lines (preserve indent with spaces or dashes)
  return allItems.map(item => {
    const indent = '  '.repeat(item.indentLevel);
    const prefix = item.isChecked ? '- [x] ' : '';
    return `${indent}${prefix}${item.text}`;
  }).join('\n');
}

export function createEmptyChecklistItem(order: number, indentLevel: number = 0): ChecklistItem {
  return {
    id: `item-${Date.now()}-${order}-${Math.random()}`,
    text: '',
    isChecked: false,
    order,
    indentLevel,
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function isNoteEmpty(note: { title: string; content?: string; items?: ChecklistItem[] }): boolean {
  const titleEmpty = !note.title || note.title.trim() === '';
  
  if (note.content) {
    // Strip HTML tags and check if empty
    const textContent = note.content.replace(/<[^>]*>/g, '').trim();
    return titleEmpty && textContent === '';
  }
  
  if (note.items) {
    // Check if all items are empty
    const hasNonEmptyItem = note.items.some(item => item.text && item.text.trim() !== '');
    return titleEmpty && !hasNonEmptyItem;
  }
  
  return titleEmpty;
}
