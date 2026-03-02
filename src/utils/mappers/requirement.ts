import { RequirementDto } from '../../types/dto/requirement.dto';
import { Requirement, RequirementStatus } from '../../types/domain';

export function mapRequirementToDomain(dto: RequirementDto): Requirement {
  return {
    ...dto,
    id: dto.id,
    title: dto.name || 'Untitled Requirement',
    name: dto.name || 'Untitled Requirement',
    description: dto.description || '',

    // Flattened for UI display
    workspace: typeof dto.workspace === 'string' ? dto.workspace : (dto.workspace?.name || ''),
    company: dto.company || dto.sender_company?.name || null,
    client: dto.client || null,
    assignedTo: [], // Not present in DTO
    dueDate: dto.end_date || '',
    createdDate: dto.created_at || '',
    startDate: dto.start_date || undefined,
    is_high_priority: dto.is_high_priority ?? false,

    status: (dto.status as RequirementStatus) || 'draft',
    rawStatus: dto.status,
    progress: dto.total_task ? Math.round(((dto.tasks_completed || 0) / dto.total_task) * 100) : 0,
    tasksCompleted: dto.tasks_completed || 0,
    tasksTotal: dto.total_task || 0,

    receiver_project_id: dto.receiver_workspace_id, // Map from workspace ID

    // Legacy fields preserved via spread or explicit
    quotedPrice: dto.quoted_price,
    pricingModel: dto.pricing_model as 'hourly' | 'project',
  } as Requirement;
}

export const mapRequirementDtoToDomain = mapRequirementToDomain;
