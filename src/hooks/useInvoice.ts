
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInvoices, getInvoiceById, createInvoice, updateInvoice,
  reviseInvoice, recordPayment, sendInvoiceEmail,
  updateInvoiceStatus, getRequirementBillingStatus, Particular,
} from '../services/invoice';
import { toQueryParams } from '../utils/queryParams';

export type InvoiceStatusValue =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'overdue'
  | 'partial'
  | 'paid'
  | 'void';

export interface CreateInvoicePayload {
  bill_from: number;
  bill_to: number;
  issue_date: string;
  due_date: string;
  currency: string;
  particulars: Particular[];
  sub_total: number;
  discount: number;
  tax: number;
  tax_type?: string;
  total: number;
  memo?: string;
  payment_details?: string;
  metadata?: { invoiceDetails?: Array<{ requirement_id: number; billed_amount: number }> };
}

export interface UpdateInvoicePayload {
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  bill_from?: number;
  bill_to?: number;
  particulars?: Particular[];
  sub_total?: number;
  discount?: number;
  tax?: number;
  tax_type?: string;
  total?: number;
  memo?: string;
  payment_details?: string;
  currency?: string;
}

export const useInvoices = (filters: Record<string, unknown> = {}) => {
  const queryString = toQueryParams(filters);

  return useQuery({
    queryKey: ['invoices', queryString],
    queryFn: async () => {
      const response = await getInvoices(queryString);
      return response.result || { invoices: [], total: 0 };
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useInvoice = (id: number | string) => {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await getInvoiceById(Number(id));
      return res.result;
    },
    enabled: !!id,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoicePayload) => createInvoice(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateInvoicePayload }) =>
      updateInvoice(id, data as Record<string, unknown>),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
};

export const useVoidInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => updateInvoiceStatus(id, 'void'),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
};

export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number | string; status: InvoiceStatusValue }) =>
      updateInvoiceStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
};

export const useReviseInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number | string }) => reviseInvoice(id),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: { amount: number; date: string; method: string; reference?: string };
    }) => recordPayment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
  });
};

export const useSendInvoiceEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number | string;
      data: { to: string[]; cc?: string[]; custom_message?: string };
    }) => sendInvoiceEmail(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
};

export const useRequirementBillingStatus = (requirementId?: number | string) => {
  return useQuery({
    queryKey: ['requirement-billing-status', requirementId],
    queryFn: async () => {
      if (!requirementId) return null;
      const res = await getRequirementBillingStatus(requirementId);
      return res.result;
    },
    enabled: !!requirementId,
  });
};
