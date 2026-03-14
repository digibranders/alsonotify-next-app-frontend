
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
        address_line_1?: string;
        address_line_2?: string;
        city?: string;
        state?: string;
        zipcode?: string;
        country?: string;
        email?: string;
        tax_id?: string;
    };
    bill_from_company?: {
        id: number;
        name: string;
        address_line_1?: string;
        address_line_2?: string;
        city?: string;
        state?: string;
        zipcode?: string;
        country?: string;
        email?: string;
        tax_id?: string;
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
    invoice_type?: 'TAX' | 'PROFORMA';
    advance_deducted?: number;
    proforma_ref_id?: number | null;
    advance_percentage?: number | null;
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

export const updateInvoiceStatus = async (
    id: number | string,
    status: 'draft' | 'pending_approval' | 'sent' | 'overdue' | 'partial' | 'paid' | 'void',
): Promise<ApiResponse<void>> => {
    const { data } = await axiosApi.patch<ApiResponse<void>>(`/invoice/${id}/status`, { status });
    return data;
};

export const reviseInvoice = async (id: number | string): Promise<ApiResponse<InvoiceDto>> => {
    const { data: responseData } = await axiosApi.post<ApiResponse<InvoiceDto>>(`/invoice/${id}/revise`);
    return responseData;
};

export const recordPayment = async (
    id: number | string,
    payload: { amount: number; date: string; method: string; reference?: string },
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

export const getNextInvoiceNumber = async (companyId: number, invoiceType: string = 'TAX'): Promise<ApiResponse<{ invoice_number: string }>> => {
    const { data } = await axiosApi.get<ApiResponse<{ invoice_number: string }>>(`/invoice/next-number?companyId=${companyId}&invoiceType=${invoiceType}`);
    return data;
};

export const convertProformaToTaxInvoice = async (id: number | string): Promise<ApiResponse<InvoiceDto>> => {
    const { data: responseData } = await axiosApi.post<ApiResponse<InvoiceDto>>(`/invoice/${id}/convert-to-tax`);
    return responseData;
};

export const getEmailRecipients = async (invoiceId: number): Promise<ApiResponse<{ to: string[]; cc: string[] }>> => {
    const { data } = await axiosApi.get<ApiResponse<{ to: string[]; cc: string[] }>>(`/invoice/${invoiceId}/email-recipients`);
    return data;
};

export const getRequirementBillingStatus = async (requirementId: number | string): Promise<ApiResponse<{ billingStatus: string; invoiceId: number | null; invoiceNumber: string | null; invoiceStatus: string | null; invoiceTotal: number | null }>> => {
    const { data } = await axiosApi.get(`/requirements/${requirementId}/billing-status`);
    return data;
};
export const getTaxPreview = async (billFromCompanyId: number, billToCompanyId: number): Promise<ApiResponse<{
    taxLines: { name: string; rate: number }[];
    taxLabel: string;
    totalRate: number;
    senderCountry: string;
    receiverCountry: string;
}>> => {
    const { data } = await axiosApi.get<ApiResponse<{
        taxLines: { name: string; rate: number }[];
        taxLabel: string;
        totalRate: number;
        senderCountry: string;
        receiverCountry: string;
    }>>(`/invoice/tax-preview?billFromCompanyId=${billFromCompanyId}&billToCompanyId=${billToCompanyId}`);
    return data;
};

// =============================================================================
// Advance Billing — Types & API Functions
// =============================================================================

export interface RequirementAdvanceStatusResponse {
    requirement_id: number;
    quoted_price: number;
    advance_invoice: {
        id: number;
        invoice_number: string;
        status: string;
        advance_amount: number;
        advance_percentage: number | null;
        amount_received: number;
        amount_pending: number;
        due_date: string;
    } | null;
    final_invoice: {
        id: number;
        invoice_number: string;
        status: string;
        total: number;
        amount_received: number;
        advance_deducted: number;
        balance_due: number;
    } | null;
    billing_summary: {
        total_quoted: number;
        advance_invoiced: number;
        advance_received: number;
        final_invoiced: number;
        final_received: number;
        total_received: number;
        balance_remaining: number;
    };
    advance_billing_status: string;
}

export interface CreateAdvanceProformaPayload {
    advance_type: 'percentage' | 'flat';
    advance_percentage?: number;
    advance_amount?: number;
    currency: string;
    due_date: string;
    payment_details?: string;
    memo?: string;
    tax_type?: string;
    particulars?: Particular[];
}

export interface CreateFinalInvoicePayload {
    due_date: string;
    payment_details?: string;
    memo?: string;
    tax_type?: string;
    apply_advance?: boolean;
    custom_total?: number;
    particulars?: Particular[];
}

export const getRequirementAdvanceStatus = async (requirementId: number): Promise<ApiResponse<RequirementAdvanceStatusResponse>> => {
    const { data } = await axiosApi.get<ApiResponse<RequirementAdvanceStatusResponse>>(
        `/invoice/requirement/${requirementId}/advance-status`
    );
    return data;
};

export const createAdvanceProforma = async (
    requirementId: number,
    payload: CreateAdvanceProformaPayload,
): Promise<ApiResponse<InvoiceDto>> => {
    const { data } = await axiosApi.post<ApiResponse<InvoiceDto>>(
        `/invoice/requirement/${requirementId}/create-advance-proforma`,
        payload,
    );
    return data;
};

export const createFinalInvoice = async (
    requirementId: number,
    payload: CreateFinalInvoicePayload,
): Promise<ApiResponse<InvoiceDto>> => {
    const { data } = await axiosApi.post<ApiResponse<InvoiceDto>>(
        `/invoice/requirement/${requirementId}/create-final-invoice`,
        payload,
    );
    return data;
};
