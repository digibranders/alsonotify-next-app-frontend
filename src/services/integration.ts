import axiosApi from "../config/axios";
import { ApiResponse } from "../types/api";

const ALLOWED_OAUTH_HOSTS = [
    "login.microsoftonline.com",
    "login.microsoft.com",
];

function isAllowedOAuthUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && ALLOWED_OAUTH_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith("." + h));
    } catch {
        return false;
    }
}

/**
 * Initiates Microsoft Admin Consent flow
 */
export async function connectAdmin() {
    const { data } = await axiosApi.get<ApiResponse<{ url: string }>>("/integration/connect/admin");
    if (data.result?.url) {
        if (!isAllowedOAuthUrl(data.result.url)) {
            throw new Error("Unexpected OAuth redirect URL");
        }
        window.location.href = data.result.url;
    }
}

/**
 * Gets the current integration status for the company
 */
export async function getIntegrationStatus() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await axiosApi.get<ApiResponse<any>>("/integration/status");
    return data;
}

/**
 * Disconnects the organization integration
 */
export async function disconnectIntegration() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await axiosApi.post<ApiResponse<any>>("/integration/disconnect");
    return data;
}
