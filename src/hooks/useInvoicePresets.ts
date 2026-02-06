
import { useState } from 'react';

const PRESETS_STORAGE_KEY = 'invoice_payment_presets';

export interface InvoicePaymentPreset {
  id: string;
  name: string;
  content: string;
}

const DEFAULT_PRESETS: InvoicePaymentPreset[] = [
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    content: "Bank: HDFC Bank\nA/C Name: Fynix Digital Pvt Ltd\nA/C No: 50200012345678\nIFSC: HDFC0001234\nBranch: Mumbai"
  },
  {
    id: 'upi',
    name: 'UPI',
    content: "UPI ID: fynix@hdfcbank\nGPay/PhonePe: 9876543210"
  }
];

export const useInvoicePresets = () => {
  const [presets, setPresets] = useState<InvoicePaymentPreset[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error("Failed to parse invoice presets", e);
        }
      }
    }
    return DEFAULT_PRESETS;
  });

  const savePresets = (newPresets: InvoicePaymentPreset[]) => {
    setPresets(newPresets);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
    }
  };

  const addPreset = (preset: InvoicePaymentPreset) => {
    const updated = [...presets, preset];
    savePresets(updated);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    savePresets(updated);
  };

  return {
    presets,
    savePresets,
    addPreset,
    deletePreset,
    isLoaded: true
  };
};
