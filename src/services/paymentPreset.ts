import axiosApi from "../config/axios";
import { ApiResponse } from "../types/api";

export interface PaymentPresetDto {
    id: number;
    company_id: number;
    name: string;
    content: string;
    is_default: boolean;
    is_active: boolean;
}

export const getPaymentPresets = async (): Promise<ApiResponse<PaymentPresetDto[]>> => {
    const { data } = await axiosApi.get('/payment-preset');
    return data;
};

export const createPaymentPreset = async (payload: { name: string; content: string; is_default?: boolean }): Promise<ApiResponse<PaymentPresetDto>> => {
    const { data } = await axiosApi.post('/payment-preset', payload);
    return data;
};

export const updatePaymentPreset = async (id: number, payload: Partial<PaymentPresetDto>): Promise<ApiResponse<PaymentPresetDto>> => {
    const { data } = await axiosApi.put(`/payment-preset/${id}`, payload);
    return data;
};

export const deletePaymentPreset = async (id: number): Promise<ApiResponse<any>> => {
    const { data } = await axiosApi.delete(`/payment-preset/${id}`);
    return data;
};
