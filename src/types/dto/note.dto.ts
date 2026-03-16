export type NoteTypeDto = "TEXT_NOTE" | "CHECKLIST_NOTE";

export interface ChecklistItemDto {
  id: string;
  text: string;
  isChecked: boolean;
  order: number;
  indentLevel: number; // 0..N
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDto {
  id: number;
  user_id: number;
  company_id: number;
  title: string;
  type: NoteTypeDto;
  color: string;
  is_pinned: boolean;
  is_archived: boolean;
  labels?: string[];
  created_at: string;
  updated_at?: string;
  // Type-specific fields (mutually exclusive)
  content?: string; // HTML content for TEXT_NOTE only
  items?: ChecklistItemDto[]; // For CHECKLIST_NOTE only
}

export interface CreateNoteDto {
  title: string;
  type: NoteTypeDto;
  color?: string;
  content?: string; // For TEXT_NOTE
  items?: ChecklistItemDto[]; // For CHECKLIST_NOTE
}

export interface UpdateNoteDto {
  title?: string;
  type?: NoteTypeDto;
  color?: string;
  is_archived?: boolean;
  content?: string; // For TEXT_NOTE
  items?: ChecklistItemDto[]; // For CHECKLIST_NOTE
}
