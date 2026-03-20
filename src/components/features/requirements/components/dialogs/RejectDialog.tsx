'use client';

import { useState } from 'react';
import { Modal, Input, App } from 'antd';

const { TextArea } = Input;

export type RejectVariant = 'reject_quote' | 'request_revision' | 'decline_requirement' | 'generic';

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  variant?: RejectVariant;
}

const VARIANT_CONFIG: Record<RejectVariant, {
  title: string;
  description: string;
  okText: string;
  placeholder: string;
  okClassName: string;
}> = {
  reject_quote: {
    title: 'Reject Quote',
    description: 'Please provide a reason for rejecting this quote. The partner will be able to revise and resubmit.',
    okText: 'Reject Quote',
    placeholder: 'e.g. Budget too high, Timeline not feasible...',
    okClassName: 'bg-[#ff3b3b] hover:bg-[#d93232]',
  },
  request_revision: {
    title: 'Request Revision',
    description: 'Please describe what changes are needed. The requirement will be sent back for revision.',
    okText: 'Request Revision',
    placeholder: 'e.g. Deliverables incomplete, Quality needs improvement...',
    okClassName: 'bg-[#F59E0B] hover:bg-[#D97706]',
  },
  decline_requirement: {
    title: 'Decline Requirement',
    description: 'Please provide a reason for declining this requirement. The sender will be notified.',
    okText: 'Decline',
    placeholder: 'e.g. Out of scope, No capacity...',
    okClassName: 'bg-[#ff3b3b] hover:bg-[#d93232]',
  },
  generic: {
    title: 'Reject Requirement',
    description: 'Please provide a reason for rejecting this requirement.',
    okText: 'Reject',
    placeholder: 'e.g. Budget too low, Out of scope...',
    okClassName: 'bg-[#ff3b3b] hover:bg-[#d93232]',
  },
};

/**
 * Context-aware dialog for rejecting/declining requirements or requesting revisions.
 */
export function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
  variant = 'generic'
}: RejectDialogProps) {
  const { message: messageApi } = App.useApp();
  const [reason, setReason] = useState('');
  const config = VARIANT_CONFIG[variant];

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
      title={config.title}
      okText={config.okText}
      cancelText="Cancel"
      okButtonProps={{ className: config.okClassName }}
      width="min(400px, 95vw)"
      centered
    >
      <div className="space-y-4 py-4">
        <p className="text-xs text-[#666666] font-medium">
          {config.description}
        </p>
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#111111]">Reason</label>
          <TextArea
            placeholder={config.placeholder}
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
