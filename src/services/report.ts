import axiosApi from "../config/axios";

export interface RequirementReport {
    id: number;
    requirement: string;
    partner: string;
    manager: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
    allottedHrs: number;
    engagedHrs: number;
    extraHrs: number;
    revenue: number;
    revision: number;
    type?: string;
    priority?: string;
    department?: string;
}

export interface ReportKPI {
    totalRequirements: number;
    onTimeCompleted: number;
    delayedCompleted: number;
    inProgress: number;
    delayed: number;
    totalExtraHrs: number;
    efficiency: number;
}

export interface RequirementReportsResponse {
    kpi: ReportKPI;
    data: RequirementReport[];
}

interface GetRequirementReportsParams {
    search?: string;
    partner_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    type?: string;
    priority?: string;
    department_id?: string;
    limit?: number;
    skip?: number;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    result: T;
}

export const getRequirementReports = async (params: GetRequirementReportsParams): Promise<RequirementReportsResponse> => {
    const queryParams: Record<string, any> = {};
    if (params.search) queryParams.search = params.search;
    if (params.partner_id && params.partner_id !== 'All') queryParams.partner_id = params.partner_id;
    if (params.status && params.status !== 'All') queryParams.status = params.status;
    if (params.type && params.type !== 'All') queryParams.type = params.type;
    if (params.priority && params.priority !== 'All') queryParams.priority = params.priority;
    if (params.department_id && params.department_id !== 'All') queryParams.department_id = params.department_id;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;

    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.skip !== undefined) queryParams.skip = params.skip;

    const response = await axiosApi.get<ApiResponse<RequirementReportsResponse>>('/report/requirements', {
        params: queryParams
    });

    return response.data.result;
};

export interface TaskReport {
    id: number;
    task: string;
    requirement: string;
    leader: string;
    assigned: string;
    allottedHrs: number;
    engagedHrs: number;
    extraHrs: number;
    status: string;
    dueDate?: string | null;
}

export interface TaskReportsResponse {
    kpi: {
        totalTasks: number;
        onTimeCompleted: number;
        delayedCompleted: number;
        inProgress: number;
        delayed: number;
        totalExtraHrs: number;
        efficiency: number;
    };
    data: TaskReport[];
}

interface GetTaskReportsParams {
    search?: string;
    leader_id?: string;
    assigned_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    skip?: number;
}

export const getTaskReports = async (params: GetTaskReportsParams): Promise<TaskReportsResponse> => {
    const queryParams: Record<string, any> = {};
    if (params.search) queryParams.search = params.search;
    if (params.leader_id && params.leader_id !== 'All') queryParams.leader_id = params.leader_id;
    if (params.assigned_id && params.assigned_id !== 'All') queryParams.assigned_id = params.assigned_id;
    if (params.status && params.status !== 'All') queryParams.status = params.status;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;

    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.skip !== undefined) queryParams.skip = params.skip;

    const response = await axiosApi.get<ApiResponse<TaskReportsResponse>>('/report/tasks', {
        params: queryParams
    });

    return response.data.result;
};


export interface EmployeeReport {
    id: number;
    member: string;
    designation: string;
    department: string;
    department_id: number | null;
    role: string;
    utilization: number;
    efficiency: number;
    hourlyCost: number; // This is the RATE
    investment: number; // This is the TOTAL COST
    revenue: number;
    profit: number;
    margin: number;
    engagedHrs: number;
    taskStats: {
        assigned: number;
        completed: number;
        inProgress: number;
        delayed: number;
    };
}

export interface EmployeeKPI {
    totalInvestment: number;
    totalRevenue: number;
    netProfit: number;
    avgRatePerHr: number;
    avgOccupancy: number;
    avgEfficiency: number;
    totalCount: number;
}

export interface EmployeeReportsResponse {
    kpi: EmployeeKPI;
    data: EmployeeReport[];
}

interface GetEmployeeReportsParams {
    search?: string;
    department_id?: string;
    member_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    skip?: number;
}

export const getEmployeeReports = async (params: GetEmployeeReportsParams): Promise<EmployeeReportsResponse> => {
    const queryParams: Record<string, any> = {};
    if (params.search) queryParams.search = params.search;
    if (params.department_id && params.department_id !== 'All') queryParams.department_id = params.department_id;
    if (params.member_id && params.member_id !== 'All') queryParams.member_id = params.member_id;
    if (params.start_date) queryParams.start_date = params.start_date;
    if (params.end_date) queryParams.end_date = params.end_date;

    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.skip !== undefined) queryParams.skip = params.skip;

    const response = await axiosApi.get<ApiResponse<EmployeeReportsResponse>>('/report/employees', {
        params: queryParams
    });

    return response.data.result;
};

export interface MemberWorklog {
    id: string;
    date: string;
    task: string;
    details: string;
    startTime: string;
    endTime: string;
    engagedTime: string;
}

export const getMemberWorklogs = async (memberId: string, startDate?: string, endDate?: string): Promise<MemberWorklog[]> => {
    const queryParams: Record<string, any> = { member_id: memberId };
    if (startDate) queryParams.start_date = startDate;
    if (endDate) queryParams.end_date = endDate;

    const response = await axiosApi.get<ApiResponse<MemberWorklog[]>>('/report/member/worklogs', {
        params: queryParams
    });

    return response.data.result;
};
