import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWorkspace,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getRequirementsByWorkspaceId,
  addRequirementToWorkspace,
  updateRequirementById,
  deleteRequirementById,
  approveRequirement,
  getCollaborativeRequirements,
  reactivateWorkspace,
  getAllRequirements,
  submitRequirementForReview,
} from "../services/workspace";
import { WorkspaceDto, CreateWorkspaceRequestDto, UpdateWorkspaceRequestDto } from "../types/dto/workspace.dto";
import { RequirementDto, CreateRequirementRequestDto, UpdateRequirementRequestDto, RequirementDropdownItem, ApproveRequirementRequestDto, SubmitForReviewRequestDto } from "../types/dto/requirement.dto";
import { getTasks } from "../services/task";
export { usePartners } from "./useUser";

import { ApiResponse } from "../types/api";
import { Workspace, Task, Requirement } from "../types/domain";
import { mapWorkspaceDtoToDomain } from "../utils/mappers/workspace";
import { queryKeys } from "../lib/queryKeys";

// Workspaces
const selectWorkspaces = (data: ApiResponse<{ workspaces: WorkspaceDto[] }>): ApiResponse<{ workspaces: Workspace[] }> => {
  if (!data) return data as any;
  return {
    ...data,
    result: {
      ...data.result,
      workspaces: data.result && data.result.workspaces ? data.result.workspaces.map(mapWorkspaceDtoToDomain) : []
    }
  };
};

export const useWorkspaces = (options: string = "") => {
  return useQuery({
    queryKey: queryKeys.workspaces.list(options),
    queryFn: () => getWorkspace(options),
    select: selectWorkspaces
  });
};

import { mapTaskDtoToDomain } from "../utils/mappers/task";

const selectWorkspaceTasks = (data: ApiResponse<any[]>): ApiResponse<Task[]> => ({
  ...data,
  result: data.result ? data.result.map(mapTaskDtoToDomain) : []
});

export const useWorkspaceTasks = (workspaceId: number) => {
  return useQuery({
    queryKey: queryKeys.tasks.byWorkspace(workspaceId),
    queryFn: () => getTasks(`workspace_id=${workspaceId}`),
    enabled: !!workspaceId,
    select: selectWorkspaceTasks
  });
};

const selectWorkspace = (data: ApiResponse<WorkspaceDto>): ApiResponse<Workspace> => ({
  ...data,
  result: data.result ? mapWorkspaceDtoToDomain(data.result) : undefined as any
});

export const useWorkspace = (id: number) => {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(id),
    queryFn: () => getWorkspaceById(id),
    enabled: !!id,
    select: selectWorkspace
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateWorkspaceRequestDto) => createWorkspace(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.listRoot() });
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: UpdateWorkspaceRequestDto) => updateWorkspace({ id, ...params } as UpdateWorkspaceRequestDto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(variables.id) });
    },
  });
};

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.listRoot() });
    },
  });
};

import { mapRequirementDtoToDomain } from "../utils/mappers/requirement";

const selectRequirements = (data: ApiResponse<RequirementDto[]>): ApiResponse<Requirement[]> => {
  if (!data) return data as any;
  return {
    ...data,
    result: data.result ? data.result.map(mapRequirementDtoToDomain) : []
  };
};



// Requirements
export const useRequirements = (workspaceId: number) => {
  return useQuery({
    queryKey: queryKeys.requirements.byWorkspace(workspaceId),
    queryFn: () => getRequirementsByWorkspaceId(workspaceId),
    enabled: !!workspaceId,
    select: selectRequirements
  });
};

export const useWorkspaceRequirementsDropdown = (workspaceId?: number) => {
  return useQuery<RequirementDropdownItem[]>({
    queryKey: ['requirements', 'dropdown', 'all', workspaceId],
    queryFn: async (): Promise<RequirementDropdownItem[]> => {
      if (workspaceId) {
        // Single workspace — use the per-workspace endpoint
        const { getRequirementsDropdownByWorkspaceId } = await import('../services/workspace');
        const res = await getRequirementsDropdownByWorkspaceId(workspaceId);
        return res.success && res.result ? res.result : [];
      }
      // All workspaces — single backend call instead of N+1
      const { getAllRequirementsDropdown } = await import('../services/workspace');
      const res = await getAllRequirementsDropdown();
      return res.success && res.result ? res.result : [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAllRequirements = (options: string = "") => {
  return useQuery({
    queryKey: queryKeys.requirements.all(options),
    queryFn: () => getAllRequirements(options),
    select: selectRequirements,
    staleTime: 2 * 60 * 1000, // 2 minutes (was 30s — too aggressive for list data)
    refetchInterval: 2 * 60 * 1000,
  });
};

export const useCollaborativeRequirements = () => {
  return useQuery({
    queryKey: queryKeys.requirements.collaborative(),
    queryFn: () => getCollaborativeRequirements(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
};

export const useCreateRequirement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateRequirementRequestDto) => addRequirementToWorkspace(params),
    onSuccess: (_, variables) => {
      if (variables.workspace_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.requirements.byWorkspace(variables.workspace_id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(variables.workspace_id) });
      }
      // Invalidate all requirements queries
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all() });
    },
  });
};

export const useUpdateRequirement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateRequirementRequestDto) => updateRequirementById(params),
    onSuccess: (_, variables) => {
      if (variables.workspace_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.requirements.byWorkspace(variables.workspace_id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(variables.workspace_id) });
      }
      // Invalidate all requirements queries (both list and workspace-scoped)
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all() });
      // Also invalidate all workspace-scoped requirement queries to ensure UI refresh
      queryClient.invalidateQueries({ queryKey: ['requirements', 'workspace'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.collaborative() });
    },
  });
};

export const useDeleteRequirement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, workspace_id }: { id: number; workspace_id: number }) =>
      deleteRequirementById(id, workspace_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.byWorkspace(variables.workspace_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(variables.workspace_id) });
      // Invalidate all requirements queries
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all() });
    },
  });
};

export const useApproveRequirement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ApproveRequirementRequestDto) => approveRequirement(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all() });
      // Invalidate all workspace-scoped requirement queries to ensure UI refresh
      queryClient.invalidateQueries({ queryKey: ['requirements', 'workspace'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.collaborative() });
    },
  });
};
export const useSubmitForReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requirementId, body }: { requirementId: number; body?: SubmitForReviewRequestDto }) =>
      submitRequirementForReview(requirementId, body ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.all() });
      // Invalidate all workspace-scoped requirement queries to ensure UI refresh
      queryClient.invalidateQueries({ queryKey: ['requirements', 'workspace'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.collaborative() });
    },
  });
};

export const useReactivateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reactivateWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.listRoot() });
    },
  });
};
