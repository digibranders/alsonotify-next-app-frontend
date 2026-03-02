"use client";

import { Modal, Input, Upload, Button, App, Spin } from "antd";
import { useState, useCallback } from "react";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import { fileService } from "@/services/file.service";
import { Requirement } from "@/types/domain";
import { getErrorMessage } from "@/types/api-utils";

const { TextArea } = Input;

interface SubmitForApprovalModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { remark?: string; attachment_ids?: number[] }) => Promise<void>;
  requirement: Requirement;
}

export const SubmitForApprovalModal = ({
  open,
  onClose,
  onSubmit,
  requirement,
}: SubmitForApprovalModalProps) => {
  const { message } = App.useApp();
  const [remark, setRemark] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    setRemark("");
    setFileList([]);
    onClose();
  }, [onClose]);

  const handleUpload = useCallback(
    async ({ file, onSuccess, onError, onProgress }: { file: any; onSuccess?: (body: any) => void; onError?: (err: any) => void; onProgress?: (event: { percent: number }) => void }) => {
      setUploading(true);
      try {
        const result = await fileService.uploadFile(
          file as File,
          "REQUIREMENT",
          requirement.id,
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
    [requirement.id, message]
  );

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const attachment_ids = fileList
        .filter((f) => f.status === "done")
        .map((f) => f.response?.id)
        .filter(Boolean) as number[];

      await onSubmit({
        remark: remark.trim() || undefined,
        attachment_ids: attachment_ids.length > 0 ? attachment_ids : undefined,
      });
      handleClose();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to submit for approval."));
    } finally {
      setLoading(false);
    }
  }, [fileList, remark, onSubmit, handleClose, message]);

  const contactName = requirement.headerContact || undefined;

  return (
    <Modal
      title={
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold">Submit for Approval</span>
          <span className="text-xs text-gray-500 font-normal">
            Requirement:{" "}
            <span className="font-semibold text-gray-800">
              {requirement.title || requirement.name || "Untitled"}
            </span>
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
        {/* Requirement summary */}
        <div className="rounded-lg bg-gray-50 p-3 text-sm flex flex-col gap-1">
          {requirement.start_date && (
            <div className="flex gap-2 text-gray-600">
              <span className="font-medium">Start:</span>
              <span>{new Date(requirement.start_date).toLocaleDateString()}</span>
            </div>
          )}
          {requirement.end_date && (
            <div className="flex gap-2 text-gray-600">
              <span className="font-medium">Due:</span>
              <span>{new Date(requirement.end_date).toLocaleDateString()}</span>
            </div>
          )}
          {contactName && (
            <div className="flex gap-2 text-gray-600">
              <span className="font-medium">Reviewer:</span>
              <span>{contactName}</span>
            </div>
          )}
        </div>

        {/* Remark */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700">
            Remark / Description{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <TextArea
            rows={4}
            placeholder="Add any notes for the reviewer..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="rounded-lg border-gray-300 focus:border-[#111111] hover:border-[#111111]"
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700">
            Attach Documents{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <Upload
            fileList={fileList}
            onChange={({ fileList: newList }) => setFileList(newList)}
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
            className="bg-[#111111] hover:!bg-[#333333] border-none flex items-center gap-1"
            onClick={handleSubmit}
            loading={loading}
            disabled={uploading}
          >
            Submit for Approval
          </Button>
        </div>
      </div>
    </Modal>
  );
};
