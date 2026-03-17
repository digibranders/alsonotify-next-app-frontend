import { useQuery } from "@tanstack/react-query";
import { getProgressSummary } from "../services/dashboard";

export const useProgressSummary = (startDate: string | null, endDate: string | null) => {
  return useQuery({
    queryKey: ['dashboard', 'progress-summary', startDate, endDate],
    queryFn: () => getProgressSummary(startDate!, endDate!),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
};
