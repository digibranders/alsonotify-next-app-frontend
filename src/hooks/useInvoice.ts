
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInvoices, getInvoiceById, createInvoice, updateInvoice,
  deleteInvoice, reviseInvoice, recordPayment, sendInvoiceEmail,
  getInvoiceRequirementSummary
} from '../services/invoice';
import { toQueryParams } from '../utils/queryParams';

export const useInvoices = (filters: Record<string, unknown> = {}) => {
  const queryString = toQueryParams(filters);

  return useQuery({
    queryKey: ['invoices', queryString],
    queryFn: async () => {
      const response = await getInvoices(queryString);
      // Backend now returns { invoices: [], total: number } in result
      // But type definition in invoice.ts might need update if we want strict typing
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
    mutationFn: (data: any) => createInvoice(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => updateInvoice(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    }
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
  });
};

export const useReviseInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => reviseInvoice(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => recordPayment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    }
  });
};

export const useSendInvoiceEmail = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => sendInvoiceEmail(id, data),
  });
};

export const useInvoiceRequirementSummary = (requirementId?: number | string) => {
  return useQuery({
    queryKey: ['invoice-requirement-summary', requirementId],
    queryFn: async () => {
      if (!requirementId) return null;
      const res = await getInvoiceRequirementSummary(requirementId);
      return res.result;
    },
    enabled: !!requirementId,
  });
};
