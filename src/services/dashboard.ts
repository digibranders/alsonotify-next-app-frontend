import axiosApi from "../config/axios";
import { ApiResponse } from "../types/api";

export interface ProgressSummaryResult {
  requirements: {
    total: number;
    completed: number;
    delayed: number;
    in_progress: number;
  };
  task_hours_allotted: number;
}

export const getProgressSummary = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<ProgressSummaryResult>> => {
  const { data } = await axiosApi.get<ApiResponse<ProgressSummaryResult>>(
    `/dashboard/progress-summary?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  );
  return data;
};
