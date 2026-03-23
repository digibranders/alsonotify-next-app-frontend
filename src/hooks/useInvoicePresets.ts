import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPaymentPresets, createPaymentPreset, deletePaymentPreset, PaymentPresetDto
} from '../services/paymentPreset';

export interface InvoicePaymentPreset {
  id: string | number;
  name: string;
  content: string;
}

export const useInvoicePresets = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, isSuccess } = useQuery({
    queryKey: ['paymentPresets'],
    queryFn: async () => {
      const response = await getPaymentPresets();
      return response.result || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: createPaymentPreset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymentPresets'] })
  });

  // const updateMutation = useMutation({
  //   mutationFn: ({ id, payload }: { id: number, payload: Partial<PaymentPresetDto> }) => updatePaymentPreset(id, payload),
  //   onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymentPresets'] })
  // });

  const deleteMutation = useMutation({
    mutationFn: deletePaymentPreset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymentPresets'] })
  });

  // Map backend DTO to the expected shape (mostly just ensuring id type safety)
  const presets: InvoicePaymentPreset[] = (data || []).map((p: PaymentPresetDto) => ({
    id: p.id,
    name: p.name,
    content: p.content,
  }));

  const addPreset = (preset: InvoicePaymentPreset) => {
    createMutation.mutate({ name: preset.name, content: preset.content });
  };

  const removePreset = (id: string | number) => {
    // Only delete if it's a numeric ID attached to the backend
    if (typeof id === 'number' || !isNaN(Number(id))) {
      deleteMutation.mutate(Number(id));
    }
  };

  // Backwards compatibility method
  const savePresets = (_newPresets: InvoicePaymentPreset[]) => {
    console.warn("savePresets is deprecated with API migration. Please use addPreset/editPreset directly.");
  };

  return {
    presets,
    savePresets,
    addPreset,
    deletePreset: removePreset,
    isLoaded: isSuccess,
    isLoading
  };
};
