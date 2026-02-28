
import axiosApi from "../config/axios";
import { ApiResponse } from "../types/api";

export interface Particular {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_rate?: number;
    hsn_sac?: string;
    requirement_id?: number;
}

export interface InvoiceDto {
    id: number;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    bill_from: string;
    bill_to: string;
    bill_to_company?: {
        id: number;
        name: string;
    };
    sub_total: number;
    discount: number;
    tax: number;
    total: number;
    amount_received?: number;
    status: 'draft' | 'pending_approval' | 'sent' | 'overdue' | 'partial' | 'paid' | 'void';
    currency: string;
    tax_type?: string;
    particulars?: Particular[];
    metadata?: Record<string, unknown>;
    memo?: string;
    payment_details?: string;
}

export const getInvoices = async (options: string = ""): Promise<ApiResponse<{ invoices: InvoiceDto[], total: number }>> => {
    const { data } = await axiosApi.get<ApiResponse<{ invoices: InvoiceDto[], total: number }>>(`/invoice?${options}`);
    return data;
};

export const getInvoiceById = async (id: number | string): Promise<ApiResponse<InvoiceDto>> => {
    const { data } = await axiosApi.get<ApiResponse<InvoiceDto>>(`/invoice/${id}`);
    return data;
};

export const createInvoice = async (payload: Record<string, unknown>): Promise<ApiResponse<InvoiceDto>> => {
    const { data: responseData } = await axiosApi.post<ApiResponse<InvoiceDto>>('/invoice/create', payload);
    return responseData;
};

export const updateInvoice = async (id: number | string, payload: Record<string, unknown>): Promise<ApiResponse<InvoiceDto>> => {
    const { data: responseData } = await axiosApi.put<ApiResponse<InvoiceDto>>(`/invoice/update/${id}`, payload);
    return responseData;
};

export const deleteInvoice = async (id: number | string): Promise<ApiResponse<void>> => {
    const { data } = await axiosApi.delete<ApiResponse<void>>(`/invoice/${id}`);
    return data;
};

export const reviseInvoice = async (id: number | string): Promise<ApiResponse<InvoiceDto>> => {
    const { data: responseData } = await axiosApi.post<ApiResponse<InvoiceDto>>(`/invoice/${id}/revise`);
    return responseData;
};

export const recordPayment = async (
    id: number | string,
    payload: { amount: number; payment_date: string; payment_method?: string; reference_number?: string },
): Promise<ApiResponse<void>> => {
    const { data: responseData } = await axiosApi.post<ApiResponse<void>>(`/invoice/${id}/record-payment`, payload);
    return responseData;
};

export const sendInvoiceEmail = async (
    id: number | string,
    payload: { to: string[]; cc?: string[]; custom_message?: string },
): Promise<ApiResponse<{ ok: boolean; sentTo: string[] }>> => {
    const { data: responseData } = await axiosApi.post<ApiResponse<{ ok: boolean; sentTo: string[] }>>(`/invoice/${id}/send-email`, payload);
    return responseData;
};

export const getInvoicePdfBlob = async (id: number | string): Promise<Blob> => {
    const { data } = await axiosApi.get(`/invoice/${id}/pdf`, { responseType: 'blob' });
    return data;
};

export const getNextInvoiceNumber = async (companyId: number): Promise<ApiResponse<{ invoice_number: string }>> => {
    const { data } = await axiosApi.get<ApiResponse<{ invoice_number: string }>>(`/invoice/next-number?company_id=${companyId}`);
    return data;
};

export const getEmailRecipients = async (invoiceId: number): Promise<ApiResponse<{ to: string[]; cc: string[] }>> => {
    const { data } = await axiosApi.get<ApiResponse<{ to: string[]; cc: string[] }>>(`/invoice/${invoiceId}/email-recipients`);
    return data;
};

export const getInvoiceRequirementSummary = async (requirementId: number | string): Promise<ApiResponse<unknown>> => {
    const { data } = await axiosApi.get<ApiResponse<unknown>>(`/invoice/requirement/${requirementId}`);
    return data;
};
