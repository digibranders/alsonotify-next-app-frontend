
import { useQuery } from '@tanstack/react-query';
import { getInvoices, InvoiceDto } from '../services/invoice.ts';
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
    // Keep previous data while fetching new page for smoother transition
    placeholderData: (previousData) => previousData,
  });
};
