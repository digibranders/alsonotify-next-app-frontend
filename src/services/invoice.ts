
import axiosApi from "../config/axios";
import { ApiResponse } from "../types/api";

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
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void';
  currency: string;
  particulars?: any[];
  metadata?: any;
}

export const getInvoices = async (options: string = ""): Promise<ApiResponse<{ invoices: InvoiceDto[], total: number }>> => {
  const { data } = await axiosApi.get<ApiResponse<{ invoices: InvoiceDto[], total: number }>>(`/invoice?${options}`);
  return data;
};

export const getInvoiceById = async (id: number): Promise<ApiResponse<InvoiceDto>> => {
  const { data } = await axiosApi.get<ApiResponse<InvoiceDto>>(`/invoice/${id}`);
  return data;
};

export const createInvoice = async (data: any): Promise<ApiResponse<InvoiceDto>> => {
  const { data: responseData } = await axiosApi.post<ApiResponse<InvoiceDto>>(`/invoice`, data);
  return responseData;
};

export const updateInvoice = async (id: number | string, data: any): Promise<ApiResponse<InvoiceDto>> => {
  const { data: responseData } = await axiosApi.put<ApiResponse<InvoiceDto>>(`/invoice/${id}`, data);
  return responseData;
};

export const deleteInvoice = async (id: number | string): Promise<ApiResponse<void>> => {
  const { data } = await axiosApi.delete<ApiResponse<void>>(`/invoice/${id}`);
  return data;
};

export const reviseInvoice = async (id: number | string, data: any): Promise<ApiResponse<InvoiceDto>> => {
  const { data: responseData } = await axiosApi.post<ApiResponse<InvoiceDto>>(`/invoice/${id}/revise`, data);
  return responseData;
};

export const recordPayment = async (id: number | string, data: any): Promise<ApiResponse<void>> => {
  const { data: responseData } = await axiosApi.post<ApiResponse<void>>(`/invoice/${id}/payment`, data);
  return responseData;
};

export const sendInvoiceEmail = async (id: number | string, data: any): Promise<ApiResponse<void>> => {
  const { data: responseData } = await axiosApi.post<ApiResponse<void>>(`/invoice/${id}/send`, data);
  return responseData;
};

export const getInvoicePdfBlob = async (id: number | string): Promise<Blob> => {
  const { data } = await axiosApi.get(`/invoice/${id}/pdf`, { responseType: 'blob' });
  return data;
};

export const getInvoiceRequirementSummary = async (requirementId: number | string): Promise<ApiResponse<any>> => {
  const { data } = await axiosApi.get<ApiResponse<any>>(`/invoice/requirement/${requirementId}`);
  return data;
};

