import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTaskById,
  updateTaskStatusById,
  getWorkLogByTaskId,
  provideEstimate,
  startWorkLog,
  updateWorklog,
  getAssignedTaskDetail,
  requestRevision,
  updateTaskMemberStatus,
} from "../services/task";

// ... imports remain the same

export const useUpdateMemberStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: string }) => updateTaskMemberStatus(taskId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
      // Sync notification panel — strip stale CTAs and refetch
      clearStaleNotificationActions(queryClient, 'taskId', variables.taskId);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
};

import { CreateTaskRequestDto, UpdateTaskRequestDto } from '@/types/dto/task.dto';

// Re-export useClients for convenience
// useClients removed
export { usePartners } from "./useUser";

import { mapTaskDtoToDomain } from "../utils/mappers/task";
import { queryKeys } from "../lib/queryKeys";
import { clearStaleNotificationActions } from "../utils/notificationCacheUtils";

export const useTasks = (options: string = "") => {
  return useQuery({
    queryKey: queryKeys.tasks.list({ options }),
    queryFn: () => getTasks(options),
    select: (data) => ({
      ...data,
      result: data.result ? data.result.map(mapTaskDtoToDomain) : []
    }),
  });
};

export const useTask = (id: number) => {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => getTaskById(id),
    enabled: !!id,
    select: (data) => ({
      ...data,
      result: data.result ? mapTaskDtoToDomain(data.result) : undefined
    })
  });
};



// ...

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTaskRequestDto) => createTask(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateTaskRequestDto) => updateTask(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTaskById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, assigned_reviewer_id }: { id: number; status: string; assigned_reviewer_id?: number }) => updateTaskStatusById(id, status, assigned_reviewer_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assigned() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      // Invalidate requirement queries (use allRoot to match any filter/pagination variant)
      queryClient.invalidateQueries({ queryKey: queryKeys.requirements.allRoot() });
      // Sync notification panel — strip stale CTAs and refetch
      clearStaleNotificationActions(queryClient, 'taskId', variables.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
};


export const useWorklogs = (taskId: number, limit = 50, skip = 0) => {
  return useQuery({
    queryKey: queryKeys.tasks.worklogs(taskId, limit, skip),
    queryFn: () => getWorkLogByTaskId(taskId, limit, skip),
    enabled: !!taskId,
  });
};

export const useProvideEstimate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, hours }: { id: number; hours: number }) => provideEstimate(id, hours),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      // Sync notification panel — strip stale CTAs and refetch
      clearStaleNotificationActions(queryClient, 'taskId', variables.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
};

export const useStartWorkLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ task_id, start_datetime }: { task_id: number; start_datetime: string }) =>
      startWorkLog(task_id, start_datetime),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.task_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.worklogsRoot(variables.task_id) });
    },
  });
};

export const useUpdateWorkLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: { id: number; task_id: number; start_datetime: string; end_datetime: string; description: string }) =>
      updateWorklog(params, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.task_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.worklogsRoot(variables.task_id) });
    },
  });
};

export const useTaskTimer = (taskId: number) => {
  return useQuery({
    queryKey: queryKeys.tasks.timer(taskId),
    queryFn: () => getAssignedTaskDetail(taskId),
    enabled: !!taskId,
  });
};

export const useRequestRevision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, revisionNotes }: { id: number; revisionNotes: string }) => requestRevision(id, revisionNotes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.listRoot() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      // Sync notification panel — strip stale CTAs and refetch
      clearStaleNotificationActions(queryClient, 'taskId', variables.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
};

