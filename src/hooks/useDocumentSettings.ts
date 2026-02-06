
import { useState } from 'react';
import { DOCUMENT_TYPES_STORAGE_KEY, DEFAULT_DOCUMENT_TYPES } from '@/constants/documentTypes';

export interface DocumentTypeSetting {
  id: string;
  name: string;
  required: boolean;
}

export const useDocumentSettings = () => {
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeSetting[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DOCUMENT_TYPES_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((doc: any, index: number) => ({
              id: String(doc.id ?? index + 1),
              name: String(doc.name ?? ''),
              required: Boolean(doc.required),
            }));
          }
        } catch (e) {
          console.error("Failed to parse document types", e);
        }
      }
    }
    return DEFAULT_DOCUMENT_TYPES;
  });

  const updateDocumentTypes = (newTypes: DocumentTypeSetting[]) => {
    setDocumentTypes(newTypes);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DOCUMENT_TYPES_STORAGE_KEY, JSON.stringify(newTypes));
    }
  };

  const resetToDefaults = () => {
    setDocumentTypes(DEFAULT_DOCUMENT_TYPES);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DOCUMENT_TYPES_STORAGE_KEY);
    }
  };

  return {
    documentTypes,
    updateDocumentTypes,
    resetToDefaults,
    isLoaded: true
  };
};
