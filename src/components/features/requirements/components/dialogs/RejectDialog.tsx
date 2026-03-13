'use client';

import { useState } from 'react';
import { Modal, Input, App } from 'antd';

const { TextArea } = Input;

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

/**
 * Dialog for rejecting requirements with a reason.
 * The rejected requirement will be moved to drafts.
 */
export function RejectDialog({
  open,
  onOpenChange,
  onConfirm
}: RejectDialogProps) {
  const { message: messageApi } = App.useApp();
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason) {
      messageApi.error("Please enter a reason");
      return;
    }
    onConfirm(reason);
    setReason('');
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      onOk={handleConfirm}
      title="Reject Requirement"
      okText="Reject"
      cancelText="Cancel"
      okButtonProps={{ className: 'bg-[#ff3b3b] hover:bg-[#d93232]' }}
      width="min(400px, 95vw)"
      centered
    >
      <div className="space-y-4 py-4">
        <p className="text-xs text-[#666666] font-medium">
          Please provide a reason for rejecting this requirement. It will be moved to drafts.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#111111]">Reason</label>
          <TextArea
            placeholder="e.g. Budget too low, Out of scope..."
            className="min-h-[100px] rounded-lg resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
      </div>
    </Modal>
  );
}
