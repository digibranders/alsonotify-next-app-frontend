import axios from 'axios';
import axiosApi from '../config/axios';
import { ApiResponse } from '../types/api';

export type FileContextType = 'REQUIREMENT' | 'TASK' | 'COMMENT' | 'EMPLOYEE_DOCUMENT' | 'COMPANY_LOGO' | 'USER_PROFILE_PICTURE';

export interface UploadUrlResponse {
  upload_url: string;
  file_key: string;
  fields: Record<string, string>;
}

export interface FileAttachmentDto {
  id: number;
  file_key: string;
  file_name: string;
  file_size: number;
  file_type: string;
  download_url?: string;
  created_at: string;
  document_type_name?: string;
}

export const fileService = {
  /**
   * Main method to handle the entire upload flow
   * 1. Get Presigned URL
   * 2. Upload to S3
   * 3. Confirm with Backend
   */
  uploadFile: async (
    file: File,
    contextType: FileContextType,
    contextId?: number,
    onProgress?: (percent: number) => void
  ): Promise<FileAttachmentDto> => {
    try {
      // 1. Get Presigned URL
      const { data: urlResponse } = await axiosApi.post<ApiResponse<UploadUrlResponse>>('/files/upload-url', {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        context_type: contextType,
        context_id: contextId || null
      });

      if (!urlResponse.success || !urlResponse.result) {
        throw new Error(urlResponse.message || 'Failed to generate upload URL');
      }

      const { upload_url, file_key } = urlResponse.result;

      // 2. Upload to S3
      // Note: We use raw axios here to avoid the base URL and interceptors of axiosApi
      try {
        await axios.put(upload_url, file, {
          headers: {
            'Content-Type': file.type,
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(percent);
            }
          },
        });
      } catch (uploadError: any) {
        console.error('S3 Upload Error Details:', {
          message: uploadError.message,
          code: uploadError.code,
          name: uploadError.name,
          response: uploadError.response
        });

        if (uploadError.message === 'Network Error') {
          throw new Error('Upload blocked by browser or network. Please check: 1. CORS is configured on S3 bucket. 2. No ad-blockers/extensions are blocking the request.', { cause: uploadError });
        }

        throw new Error(`S3 Upload Failed: ${uploadError.message}`, { cause: uploadError });
      }

      // 3. Confirm with Backend
      const { data: confirmResponse } = await axiosApi.post<ApiResponse<FileAttachmentDto>>('/files/confirm', {
        file_key,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        context_type: contextType,
        context_id: contextId || null
      });

      if (!confirmResponse.success || !confirmResponse.result) {
        throw new Error(confirmResponse.message || 'Failed to confirm file upload');
      }

      return confirmResponse.result;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  },

  /**
   * List files for a given context (e.g., all files attached to a requirement)
   */
  listFiles: async (
    contextType: FileContextType,
    contextId: number
  ): Promise<FileAttachmentDto[]> => {
    const { data } = await axiosApi.get<ApiResponse<FileAttachmentDto[]>>('/files/list', {
      params: { context_type: contextType, context_id: contextId }
    });
    if (!data.success) {
      throw new Error(data.message || 'Failed to list files');
    }
    return data.result ?? [];
  },

  /**
   * Helper to download a file given its ID
   */
  getDownloadUrl: async (fileId: number): Promise<string> => {
    const { data } = await axiosApi.get<ApiResponse<{ download_url: string }>>(`/files/download/${fileId}`);
    if (!data.success || !data.result) {
      throw new Error(data.message || 'Failed to get download URL');
    }
    return data.result.download_url;
  },

  /**
   * Specialized upload for Employee Documents
   * (Standard confirmation creates a duplicate FileAttachment, so we use a custom endpoint)
   */
  uploadEmployeeDocument: async (
    file: File,
    userId: number,
    documentTypeName: string,
    notes?: string,
    expiryDate?: string
  ) => {
    try {
      // 1. Get Presigned URL
      const { data: urlResponse } = await axiosApi.post<ApiResponse<UploadUrlResponse>>('/files/upload-url', {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        context_type: 'EMPLOYEE_DOCUMENT',
        context_id: userId
      });

      if (!urlResponse.success || !urlResponse.result) {
        throw new Error(urlResponse.message || 'Failed to generate upload URL');
      }

      const { upload_url, file_key } = urlResponse.result;

      // 2. Upload to S3
      try {
        await axios.put(upload_url, file, {
          headers: {
            'Content-Type': file.type,
          }
        });
      } catch (uploadError: any) {
        console.error('S3 Employee Upload Error Details:', {
          message: uploadError.message,
          code: uploadError.code,
          name: uploadError.name,
          response: uploadError.response
        });

        if (uploadError.message === 'Network Error') {
          throw new Error('Upload blocked by browser or network. Check S3 CORS config.', { cause: uploadError });
        }
        throw uploadError;
      }

      // 3. Confirm with Backend via Employee Document Endpoint
      const { data: confirmResponse } = await axiosApi.post('/files/employee-documents/upload', {
        user_id: userId,
        document_type_name: documentTypeName,
        file_key,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        notes,
        expiry_date: expiryDate
      });

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.message || 'Failed to confirm document upload');
      }

      return confirmResponse.result;
    } catch (error) {
      console.error('Employee document upload failed:', error);
      throw error;
    }
  }
};
