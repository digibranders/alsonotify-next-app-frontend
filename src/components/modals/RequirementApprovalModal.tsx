"use client";

import { Modal, Input, Rate, Button, App } from "antd";
import { useState, useCallback } from "react";
import { Requirement } from "@/types/domain";

const { TextArea } = Input;

interface RequirementApprovalModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { rating?: number; remark?: string }) => Promise<void>;
  requirement: Requirement;
}

export const RequirementApprovalModal = ({
  open,
  onClose,
  onSubmit,
  requirement,
}: RequirementApprovalModalProps) => {
  const { message } = App.useApp();
  const [rating, setRating] = useState<number>(5);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    setRating(5);
    setRemark("");
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      await onSubmit({
        rating: rating > 0 ? rating : undefined,
        remark: remark.trim() || undefined,
      });
      handleClose();
    } catch (err: any) {
      message.error(err.message || "Failed to approve requirement.");
    } finally {
      setLoading(false);
    }
  }, [rating, remark, onSubmit, handleClose, message]);

  const submittedBy =
    requirement.leader_user?.name ||
    (typeof requirement.created_user === "object"
      ? requirement.created_user?.name
      : null) ||
    "Team";

  return (
    <Modal
      title={
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold">Approve Requirement</span>
          <span className="text-xs text-gray-500 font-medium">
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
      width="min(500px, 95vw)"
      centered
    >
      <div className="flex flex-col gap-4 py-4">
        {/* Submission summary */}
        <div className="rounded-lg bg-gray-50 p-3 text-sm flex flex-col gap-1">
          <div className="flex gap-2 text-gray-600">
            <span className="font-medium">Submitted by:</span>
            <span>{submittedBy}</span>
          </div>
          {requirement.submission_remark && (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-600">Submission Note:</span>
              <span className="text-gray-700 italic">
                &quot;{requirement.submission_remark}&quot;
              </span>
            </div>
          )}
        </div>

        {/* Star rating */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Quality Rating{" "}
            <span className="text-gray-400 font-medium">(optional)</span>
          </label>
          <Rate value={rating} onChange={setRating} />
          {rating > 0 && (
            <span className="ml-3 text-sm text-gray-500">{rating} / 5</span>
          )}
        </div>

        {/* Feedback */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700">
            Feedback{" "}
            <span className="text-gray-400 font-medium">(optional)</span>
          </label>
          <TextArea
            rows={4}
            placeholder="Any comments for the team..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="rounded-lg border-gray-300 focus:border-[#111111] hover:border-[#111111]"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="primary"
            className="bg-[#111111] hover:!bg-[#333333] border-none"
            onClick={handleSubmit}
            loading={loading}
          >
            Approve
          </Button>
        </div>
      </div>
    </Modal>
  );
};
