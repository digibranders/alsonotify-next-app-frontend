"use client";

import { Modal, Input, Upload, Button, Checkbox, App, Spin } from "antd";
import { useState, useEffect, useCallback } from "react";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import { fileService, FileAttachmentDto } from "@/services/file.service";

const { TextArea } = Input;

interface RequirementRevisionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { feedback?: string; attachment_ids?: number[] }) => Promise<void>;
  requirementName: string;
  requirementId: number;
}

export const RequirementRevisionModal = ({
  open,
  onClose,
  onSubmit,
  requirementName,
  requirementId,
}: RequirementRevisionModalProps) => {
  const { message } = App.useApp();
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingFiles, setExistingFiles] = useState<FileAttachmentDto[]>([]);
  const [selectedExistingIds, setSelectedExistingIds] = useState<number[]>([]);
  const [newFileList, setNewFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);

  // Fetch existing requirement documents when modal opens
  useEffect(() => {
    if (!open || !requirementId) return;

    setFilesLoading(true);
    fileService
      .listFiles("REQUIREMENT", requirementId)
      .then((files) => setExistingFiles(files))
      .catch(() => setExistingFiles([]))
      .finally(() => setFilesLoading(false));
  }, [open, requirementId]);

  const handleClose = useCallback(() => {
    setFeedback("");
    setSelectedExistingIds([]);
    setNewFileList([]);
    onClose();
  }, [onClose]);

  const handleUpload = useCallback(
    async ({ file, onSuccess, onError, onProgress }: { file: any; onSuccess?: (body: any) => void; onError?: (err: any) => void; onProgress?: (event: { percent: number }) => void }) => {
      setUploading(true);
      try {
        const result = await fileService.uploadFile(
          file as File,
          "REQUIREMENT",
          requirementId,
          (percent) => onProgress?.({ percent })
        );
        onSuccess?.(result);
      } catch (err: any) {
        onError?.(err);
        message.error(`Upload failed: ${err.message}`);
      } finally {
        setUploading(false);
      }
    },
    [requirementId, message]
  );

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const newUploadedIds = newFileList
        .filter((f) => f.status === "done")
        .map((f) => f.response?.id)
        .filter(Boolean) as number[];

      const allAttachmentIds = [...selectedExistingIds, ...newUploadedIds];

      await onSubmit({
        feedback: feedback.trim() || undefined,
        attachment_ids: allAttachmentIds.length > 0 ? allAttachmentIds : undefined,
      });
      handleClose();
    } catch (err: any) {
      message.error(err.message || "Failed to submit revision request.");
    } finally {
      setLoading(false);
    }
  }, [feedback, selectedExistingIds, newFileList, onSubmit, handleClose, message]);

  const toggleExistingFile = useCallback((fileId: number) => {
    setSelectedExistingIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  }, []);

  return (
    <Modal
      title={
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold">Request Revision</span>
          <span className="text-xs text-gray-500 font-normal">
            Requirement:{" "}
            <span className="font-semibold text-gray-800">{requirementName}</span>
          </span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width="min(560px, 95vw)"
      centered
    >
      <div className="flex flex-col gap-4 py-4">
        {/* Feedback */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700">
            Feedback / Requested Changes{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <TextArea
            rows={5}
            placeholder="Describe exactly what needs to be changed or improved..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="rounded-lg border-gray-300 focus:border-[#111111] hover:border-[#111111]"
          />
        </div>

        {/* Tag existing documents */}
        {filesLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spin size="small" /> Loading existing documents...
          </div>
        ) : existingFiles.length > 0 ? (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Reference Existing Documents{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
              {existingFiles.map((file) => (
                <Checkbox
                  key={file.id}
                  checked={selectedExistingIds.includes(file.id)}
                  onChange={() => toggleExistingFile(file.id)}
                >
                  <span className="text-sm text-gray-700">{file.file_name}</span>
                </Checkbox>
              ))}
            </div>
          </div>
        ) : null}

        {/* Upload new documents */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700">
            Attach New Documents{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <Upload
            fileList={newFileList}
            onChange={({ fileList }) => setNewFileList(fileList)}
            customRequest={handleUpload}
            beforeUpload={(file) => {
              const isLt50M = file.size / 1024 / 1024 <= 50;
              if (!isLt50M) {
                message.error('File must be smaller than 50MB!');
                return Upload.LIST_IGNORE;
              }
              return true;
            }}
            multiple
          >
            <Button icon={<UploadOutlined />} disabled={uploading}>
              {uploading ? <Spin size="small" /> : "Upload Files"}
            </Button>
          </Upload>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
          <Button onClick={handleClose} disabled={loading || uploading}>
            Cancel
          </Button>
          <Button
            type="primary"
            className="bg-[#111111] hover:!bg-[#333333] border-none"
            onClick={handleSubmit}
            loading={loading}
            disabled={uploading}
          >
            Request Revision
          </Button>
        </div>
      </div>
    </Modal>
  );
};
