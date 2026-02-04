/**
 * Task/Timer/Worklog API client. Canonical contract: alsonotify-backend-new/docs/api/task-timer-worklog-api.md
 */
import axiosApi from "../config/axios";
import { ApiResponse } from "../types/api";
import { ApiError, NetworkError, getErrorMessage, isAxiosError } from "../types/errors";
import { TaskDto, WorklogDto, AssignedTaskDetailDto, CreateTaskRequestDto, UpdateTaskRequestDto, ActiveTimerResponseDto, RevisionResponseDto } from "../types/dto/task.dto";

/**
 * Validate task ID
 */
function validateTaskId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(`Invalid task ID: ${id}`, 400);
  }
}

/**
 * Validate pagination parameters
 */
function validatePagination(limit: number, skip: number): void {
  if (!Number.isInteger(skip) || skip < 0) {
    throw new ApiError(`Invalid skip parameter: ${skip}`, 400);
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > 1000) {
    throw new ApiError(`Invalid limit parameter: ${limit}. Must be between 1 and 1000`, 400);
  }
}

/**
 * Create a new task
 */
export const createTask = async (params: CreateTaskRequestDto): Promise<ApiResponse<TaskDto>> => {
  try {
    // Backend expects 'name'
    const taskName = params.name;

    // Validate name/title field
    if (!taskName || (typeof taskName === 'string' && taskName.trim().length === 0)) {
      throw new ApiError('Task title is required', 400);
    }

    const { name: _name, ...restParams } = params;
    const payload = {
      ...restParams,
      name: taskName,
    };

    const { data } = await axiosApi.post<ApiResponse<TaskDto>>("/task/create", payload);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Update an existing task
 */
export const updateTask = async (params: UpdateTaskRequestDto): Promise<ApiResponse<TaskDto>> => {
  try {
    validateTaskId(params.id);

    const { data } = await axiosApi.put<ApiResponse<TaskDto>>(`/task/update/${params.id}`, params);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Update task status
 */
export const updateTaskStatusById = async (id: number, status: string): Promise<ApiResponse<TaskDto>> => {
  try {
    validateTaskId(id);

    if (!status || status.trim().length === 0) {
      throw new ApiError('Task status is required', 400);
    }

    const { data } = await axiosApi.post<ApiResponse<TaskDto>>(`/task/${id}/update/${status}`);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Delete a task
 */
export const deleteTaskById = async (id: number): Promise<ApiResponse<TaskDto>> => {
  try {
    validateTaskId(id);

    const { data } = await axiosApi.delete<ApiResponse<TaskDto>>(`/task/delete/${id}`);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Get tasks with optional query parameters
 */
export const getTasks = async (options: string = ""): Promise<ApiResponse<TaskDto[]>> => {
  try {
    const { data } = await axiosApi.get<ApiResponse<TaskDto[]>>(`/task?${options}`);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Get task by ID
 */
export const getTaskById = async (id: number): Promise<ApiResponse<TaskDto>> => {
  try {
    validateTaskId(id);

    const { data } = await axiosApi.get<ApiResponse<TaskDto>>(`/task/${id}`);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    // Normalizing name (ensure name is set, fallback to title)
    if (data.result) {
      data.result.name = data.result.name || data.result.title;
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Create a worklog/activity for a task
 */
export const createActivity = async (params: Partial<WorklogDto>): Promise<ApiResponse<WorklogDto>> => {
  try {
    if (!params.task_id) {
      throw new ApiError('Task ID is required (task_id)', 400);
    }

    validateTaskId(params.task_id);

    const { data } = await axiosApi.post<ApiResponse<WorklogDto>>("/task/worklog/create", params);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Get worklogs for a task
 */
export const getWorkLogByTaskId = async (
  taskId: number,
  limit = 25,
  skip = 0
): Promise<ApiResponse<WorklogDto[]>> => {
  try {
    validateTaskId(taskId);
    validatePagination(limit, skip);

    const { data } = await axiosApi.get<ApiResponse<WorklogDto[]>>(
      `/task/${taskId}/worklog?limit=${limit}&skip=${skip}`
    );

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Get tasks assigned to the current logged-in user
 */
export const getAssignedTasks = async (): Promise<ApiResponse<TaskDto[]>> => {
  try {
    const { data } = await axiosApi.get<ApiResponse<TaskDto[]>>(`/task/assigned`);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Get assigned task detail with timer information
 * Returns: estimated_time, worked_time, active worklog, etc.
 */
export const getAssignedTaskDetail = async (taskId: number): Promise<ApiResponse<AssignedTaskDetailDto>> => {
  try {
    validateTaskId(taskId);

    const { data } = await axiosApi.get<ApiResponse<AssignedTaskDetailDto>>(`/task/${taskId}/timer`);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Start a worklog/timer for a task
 */
export const startWorkLog = async (task_id: number, start_datetime: string): Promise<ApiResponse<WorklogDto>> => {
  try {
    validateTaskId(task_id);

    const { data } = await axiosApi.post<ApiResponse<WorklogDto>>(`/task/worklog/create`, {
      task_id,
      start_datetime
    });

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Update a worklog
 */
export interface UpdateWorklogPayload {
  task_id: number;
  start_datetime: string;
  end_datetime: string;
  description: string;
}

export const updateWorklog = async (params: UpdateWorklogPayload, worklogId: number): Promise<ApiResponse<WorklogDto>> => {
  try {
    validateTaskId(params.task_id);

    if (!worklogId || worklogId <= 0) {
      throw new ApiError(`Invalid worklog ID: ${worklogId}`, 400);
    }

    const { data } = await axiosApi.put<ApiResponse<WorklogDto>>(`/task/worklog/update/${worklogId}`, params);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {

    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Provide estimate for a task (Time Handshake)
 */
export const provideEstimate = async (id: number, hours: number): Promise<ApiResponse<void>> => {
  try {
    validateTaskId(id);

    if (typeof hours !== 'number' || hours < 0) {
      throw new ApiError('Hours must be a positive number', 400);
    }

    const { data } = await axiosApi.post<ApiResponse<void>>(`/task/${id}/estimate`, { hours });

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }

    throw new NetworkError(getErrorMessage(error));
  }
};

export const getCurrentActiveTimer = async (): Promise<ApiResponse<ActiveTimerResponseDto>> => {
  try {
    const { data } = await axiosApi.get<ApiResponse<ActiveTimerResponseDto>>('/task/active-timer');
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isAxiosError(error)) {
      // Network-level failure (no response): treat as no active timer so timer sync does not crash the UI
      if (!error.response) {
        return { success: true, message: '', result: null };
      }
      const statusCode = error.response.status ?? 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }
    // Other (e.g. Axios network error): treat as no active timer
    return { success: true, message: '', result: null };
  }
};

/**
 * Request a revision for a task
 */
export const requestRevision = async (id: number, revisionNotes: string, estimatedTime?: number): Promise<ApiResponse<RevisionResponseDto>> => {
  try {
    validateTaskId(id);
    const { data } = await axiosApi.post<ApiResponse<RevisionResponseDto>>(`/task/${id}/revision`, { revisionNotes, estimatedTime });
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }
    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Update task member status (Baton Passing)
 */
export const updateTaskMemberStatus = async (taskId: number, status: string): Promise<ApiResponse<{ computedStatus: string }>> => {
  try {
    validateTaskId(taskId);
    if (!status) throw new ApiError('Status is required', 400);

    const { data } = await axiosApi.put<ApiResponse<{ computedStatus: string }>>(`/task/${taskId}/member-status/${status}`);

    if (!data || typeof data !== 'object') {
      throw new ApiError('Invalid response format from server', 500);
    }

    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }
    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Reorder task members
 */
export const reorderTaskMembers = async (taskId: number, memberIds: number[]): Promise<ApiResponse<void>> => {
  try {
    validateTaskId(taskId);
    const { data } = await axiosApi.patch<ApiResponse<void>>(`/task/${taskId}/reorder`, { memberIds });
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }
    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Manual baton override (Leader only)
 */
export const overrideBaton = async (taskId: number, userId: number): Promise<ApiResponse<void>> => {
  try {
    validateTaskId(taskId);
    const { data } = await axiosApi.post<ApiResponse<void>>(`/task/${taskId}/members/${userId}/give-baton`);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }
    throw new NetworkError(getErrorMessage(error));
  }
};

/**
 * Reclaim baton (Member only)
 */
export const reclaimBaton = async (taskId: number): Promise<ApiResponse<void>> => {
  try {
    validateTaskId(taskId);
    const { data } = await axiosApi.post<ApiResponse<void>>(`/task/${taskId}/reclaim-baton`);
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = getErrorMessage(error);
      throw new ApiError(message, statusCode, error.response?.data);
    }
    throw new NetworkError(getErrorMessage(error));
  }
};
