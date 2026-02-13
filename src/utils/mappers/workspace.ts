import { WorkspaceDto } from '../../types/dto/workspace.dto';
import { Workspace, WorkspaceStatus } from '../../types/domain';

export function mapWorkspaceToDomain(dto: WorkspaceDto): Workspace {
  return {
    ...dto,
    status: (dto.status || 'Active') as WorkspaceStatus,
    is_active: dto.is_active ?? true,

    task_count: dto.total_task ?? 0,
    in_progress_count: dto.total_task_in_progress ?? 0,
    delayed_count: dto.total_task_delayed ?? 0,
    completed_count: dto.total_task_completed ?? 0,

    client: dto.client || dto.client_user ? {
      id: dto.client_user?.id || dto.client?.id || 0,
      name: dto.client_user?.name || dto.client?.name || ''
    } : undefined,

    client_company_name: dto.client_company_name || dto.client_user?.name,
  };
}

export const mapWorkspaceDtoToDomain = mapWorkspaceToDomain;
