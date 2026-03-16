
import axiosApi from "../config/axios";
import { ApiResponse } from "../types/api";
import { WorkspaceDto, ProjectCommentDto, CreateWorkspaceRequestDto, UpdateWorkspaceRequestDto } from "../types/dto/workspace.dto";
import { RequirementDto, CreateRequirementRequestDto, UpdateRequirementRequestDto, RequirementDropdownItem, SubmitForReviewRequestDto, ApproveRequirementRequestDto } from "../types/dto/requirement.dto";

// Create workspace
export const createWorkspace = async (params: CreateWorkspaceRequestDto): Promise<ApiResponse<WorkspaceDto>> => {
  const { data } = await axiosApi.post<ApiResponse<WorkspaceDto>>("/workspace/create", params);
  return data;
};

// Update workspace
export const updateWorkspace = async (params: UpdateWorkspaceRequestDto): Promise<ApiResponse<WorkspaceDto>> => {
  const { data } = await axiosApi.put<ApiResponse<WorkspaceDto>>(`/workspace/update/${params.id}`, params);
  return data;
};

// Delete workspace
export const deleteWorkspace = async (id: number): Promise<ApiResponse<WorkspaceDto>> => {
  const { data } = await axiosApi.delete<ApiResponse<WorkspaceDto>>(`/workspace/delete/${id}`);
  return data;
};

// Reactivate workspace
export const reactivateWorkspace = async (id: number): Promise<ApiResponse<WorkspaceDto>> => {
  const { data } = await axiosApi.patch<ApiResponse<WorkspaceDto>>(`/workspace/reactivate/${id}`);
  return data;
};

// Get workspaces
type TeamWorkspaceDto = {
  workspaces: WorkspaceDto[];
};

export const getWorkspace = async (options: string = ""): Promise<ApiResponse<TeamWorkspaceDto>> => {
  const { data } = await axiosApi.get<ApiResponse<TeamWorkspaceDto>>(`/workspace?${options}`);
  return data;
};

// Get workspace by id
export const getWorkspaceById = async (id: number): Promise<ApiResponse<WorkspaceDto>> => {
  const { data } = await axiosApi.get<ApiResponse<WorkspaceDto>>(`/workspace/${id}`);
  return data;
};

// Search workspaces
export const searchWorkspaces = async (name = ""): Promise<ApiResponse<WorkspaceDto[]>> => {
  const { data } = await axiosApi.get<ApiResponse<WorkspaceDto[]>>(`/workspace/dropdown?name=${name}`);
  return data;
};

// Requirement operations
export const addRequirementToWorkspace = async (params: CreateRequirementRequestDto): Promise<ApiResponse<RequirementDto>> => {
  // WORKAROUND: The backend fails with "column high_priority does not exist" when 'priority' is sent.
  // We strip the 'priority' field from the payload to prevent the crash until the backend is fixed.
  // This results in requirements being created with default priority.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  const { priority, ...safeParams } = params as any;

  const { data } = await axiosApi.post<ApiResponse<RequirementDto>>("/requirement", safeParams as CreateRequirementRequestDto);
  return data;
};

export const updateRequirementById = async (params: UpdateRequirementRequestDto): Promise<ApiResponse<RequirementDto>> => {
  const { data } = await axiosApi.patch<ApiResponse<RequirementDto>>(`/requirement/update/${params.id}`, params);
  return data;
};

export const deleteRequirementById = async (id: number, workspace_id: number): Promise<ApiResponse<RequirementDto>> => {
  const { data } = await axiosApi.patch<ApiResponse<RequirementDto>>(`/workspace/requirement/update/${id}`, {
    is_deleted: true,
    workspace_id: workspace_id,
  });
  return data;
};

export const approveRequirement = async (
  params: ApproveRequirementRequestDto
): Promise<ApiResponse<RequirementDto>> => {
  const { data } = await axiosApi.post<ApiResponse<RequirementDto>>("/requirement/approve", params);
  return data;
};

export const getRequirementsByWorkspaceId = async (workspaceId: number, options: string = ""): Promise<ApiResponse<RequirementDto[]>> => {
  const { data } = await axiosApi.get<ApiResponse<RequirementDto[]>>(`/requirement/${workspaceId}?${options}`);
  return data;
};

export const getCollaborativeRequirements = async (): Promise<ApiResponse<RequirementDto[]>> => {
  const { data } = await axiosApi.get<ApiResponse<RequirementDto[]>>(`/requirement/collaborative`);
  return data;
};

export const getAllRequirements = async (options: string = ""): Promise<ApiResponse<RequirementDto[]>> => {
  const { data } = await axiosApi.get<ApiResponse<RequirementDto[]>>(`/requirement?${options}`);
  return data;
};

// Get requirements dropdown by workspace ID
export const getRequirementsDropdownByWorkspaceId = async (workspaceId: number): Promise<ApiResponse<RequirementDropdownItem[]>> => {
  const { data } = await axiosApi.get<ApiResponse<RequirementDropdownItem[]>>(`/requirement/${workspaceId}/requirement/dropdown`);
  return data;
};

// Comment operations
export const addCommentToProject = async (params: ProjectCommentDto): Promise<ApiResponse<ProjectCommentDto>> => {
  const { data } = await axiosApi.post<ApiResponse<ProjectCommentDto>>(`/comment/create`, params);
  return data;
};

export const updateCommentById = async (comment: string, id: number): Promise<ApiResponse<ProjectCommentDto>> => {
  const { data } = await axiosApi.patch<ApiResponse<ProjectCommentDto>>(`/comment/update/${id}`, { comment });
  return data;
};

export const getCommentById = async (
  id: number,
  type: "PROJECT" | "TASK" | "WORKSPACE"
): Promise<ApiResponse<ProjectCommentDto[]>> => {
  const { data } = await axiosApi.get<ApiResponse<ProjectCommentDto[]>>(`/comment/${type}/${id}`);
  return data;
};

// === WORKFLOW: Submit Requirement for Review ===
export const submitRequirementForReview = async (
  requirementId: number,
  body: SubmitForReviewRequestDto = {}
): Promise<ApiResponse<RequirementDto>> => {
  const { data } = await axiosApi.post<ApiResponse<RequirementDto>>(`/requirement/${requirementId}/submit-for-review`, body);
  return data;
};

// === BILLING: Link Invoice to Requirement ===
export interface BillingInfo {
  billingStatus: 'Not_Billable' | 'Ready_To_Bill' | 'Invoiced' | 'Paid';
  invoiceId: number | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  invoiceTotal: number | null;
}

export const linkInvoiceToRequirement = async (
  requirementId: number,
  invoiceId: number
): Promise<ApiResponse<RequirementDto & { billingInfo: BillingInfo }>> => {
  const { data } = await axiosApi.patch<ApiResponse<RequirementDto & { billingInfo: BillingInfo }>>(
    `/requirement/${requirementId}/link-invoice`,
    { invoice_id: invoiceId }
  );
  return data;
};

export const unlinkInvoiceFromRequirement = async (
  requirementId: number
): Promise<ApiResponse<RequirementDto & { billingInfo: BillingInfo }>> => {
  const { data } = await axiosApi.patch<ApiResponse<RequirementDto & { billingInfo: BillingInfo }>>(
    `/requirement/${requirementId}/unlink-invoice`
  );
  return data;
};

export const getRequirementBillingStatus = async (
  requirementId: number
): Promise<ApiResponse<BillingInfo>> => {
  const { data } = await axiosApi.get<ApiResponse<BillingInfo>>(
    `/requirement/${requirementId}/billing-status`
  );
  return data;
};

export interface PnLChartDataPoint {
  name: string;
  price: number;
  invested: number;
}

export const getRequirementPnLChart = async (
  requirementId: number
): Promise<ApiResponse<PnLChartDataPoint[]>> => {
  const { data } = await axiosApi.get<ApiResponse<PnLChartDataPoint[]>>(
    `/requirement/${requirementId}/pnl-chart`
  );
  return data;
};

export interface TaskPnLItem {
  id: number;
  name: string;
  assigneeName: string;
  hourlyRate: number;
  estimatedHours: number;
  actualHours: number;
  extraHours: number;
  resourceCost: number;
  budgetedCost: number;
  costVariance: number;
  status: string;
}

export interface TaskPnLResult {
  currency: string;
  quotedPrice: number;
  totalResourceCost: number;
  grossProfit: number;
  profitMargin: number;
  totalInvoiced: number;
  totalCollected: number;
  tasks: TaskPnLItem[];
}

export const getRequirementTaskPnL = async (
  requirementId: number
): Promise<ApiResponse<TaskPnLResult>> => {
  const { data } = await axiosApi.get<ApiResponse<TaskPnLResult>>(
    `/requirement/${requirementId}/task-pnl`
  );
  return data;
};

