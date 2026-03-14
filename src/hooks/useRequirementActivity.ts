import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRequirementActivities,
  createRequirementActivity,
  type CreateRequirementActivityRequest
} from "../services/requirement-activity";
import { queryKeys } from "../lib/queryKeys";


export const useRequirementActivities = (requirementId: number) => {

  const query = useQuery({
    queryKey: queryKeys.requirements.activities(requirementId),
    queryFn: () => getRequirementActivities(requirementId),
    enabled: !!requirementId,
    staleTime: 10_000,
    refetchInterval: 10_000, // Poll every 10 seconds for near real-time activity updates
    refetchIntervalInBackground: false, // Pause polling when tab is inactive to save resources
  });

  // WebSocket logic removed in favor of simple REST polling - Senior Engineering Decision
  // This avoids complex connection state management for a simple timeline view.

  return query;
};

export const useCreateRequirementActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateRequirementActivityRequest) => createRequirementActivity(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.requirements.activities(variables.requirement_id)
      });
    },
  });
};
