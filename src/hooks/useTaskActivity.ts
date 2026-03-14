import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getTaskActivities, 
  createTaskActivity, 
  type CreateTaskActivityRequest 
} from "../services/task-activity";
import { queryKeys } from "../lib/queryKeys";

export const useTaskActivities = (taskId: number) => {
  return useQuery({
    queryKey: queryKeys.tasks.activities(taskId),
    queryFn: () => getTaskActivities(taskId),
    enabled: !!taskId,
    staleTime: 10_000,
    refetchInterval: 10_000, // Poll every 10 seconds for near real-time chat
    refetchIntervalInBackground: false, // Pause polling when tab is inactive
  });
};

export const useCreateTaskActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTaskActivityRequest) => createTaskActivity(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tasks.activities(variables.task_id) 
      });
    },
  });
};
