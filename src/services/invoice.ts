
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
