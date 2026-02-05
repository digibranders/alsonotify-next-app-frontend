import axiosApi from "../config/axios";
import { ApiResponse } from "../types/api";

/**
 * Initiates Microsoft Admin Consent flow
 */
export async function connectAdmin() {
    const { data } = await axiosApi.get<ApiResponse<{ url: string }>>("/integration/connect/admin");
    if (data.result?.url) {
        window.location.href = data.result.url;
    }
}

/**
 * Gets the current integration status for the company
 */
export async function getIntegrationStatus() {
    const { data } = await axiosApi.get<ApiResponse<any>>("/integration/status");
    return data;
}

/**
 * Disconnects the organization integration
 */
export async function disconnectIntegration() {
    const { data } = await axiosApi.post<ApiResponse<any>>("/integration/disconnect");
    return data;
}
