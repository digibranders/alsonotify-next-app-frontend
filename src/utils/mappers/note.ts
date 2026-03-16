import { NoteDto } from '../../types/dto/note.dto';
import { Note, ChecklistItem } from '../../types/domain';

export function mapNoteToDomain(dto: NoteDto): Note {
  return {
    id: dto.id,
    userId: dto.user_id,
    user_id: dto.user_id,
    companyId: dto.company_id,
    company_id: dto.company_id,
    title: dto.title,
    type: (dto.type as 'TEXT_NOTE' | 'CHECKLIST_NOTE'),
    color: dto.color,
    isPinned: dto.is_pinned || false,
    isArchived: dto.is_archived,
    is_archived: dto.is_archived,
    labels: dto.labels,
    createdAt: dto.created_at,
    created_at: dto.created_at,
    updatedAt: dto.updated_at || dto.created_at,
    updated_at: dto.updated_at,
    content: dto.content,
    items: dto.items?.map(i => ({
      ...i,
      isChecked: i.isChecked,
    })) as ChecklistItem[],
  };
}
