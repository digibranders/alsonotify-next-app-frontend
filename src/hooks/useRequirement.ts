
import { useQuery } from '@tanstack/react-query';
import { getCollaborativeRequirements } from '../services/workspace';

export const useCollaborativeRequirements = () => {
  return useQuery({
    queryKey: ['collaborative-requirements'],
    queryFn: async () => {
      const response = await getCollaborativeRequirements();
      return response.result || [];
    },
  });
};
