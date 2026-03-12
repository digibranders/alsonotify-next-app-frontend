import { useState } from "react";
import { Modal, Input, Typography } from "antd";
import { CheckCircle, XCircle } from "lucide-react";

const { Text } = Typography;

interface ReviewDecisionModalProps {
  open: boolean;
  decision: 'Approve' | 'RequestChanges' | null;
  taskName?: string;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  loading?: boolean;
}

export function ReviewDecisionModal({
  open,
  decision,
  taskName,
  onClose,
  onConfirm,
  loading,
}: ReviewDecisionModalProps) {
  const [notes, setNotes] = useState("");

  const isApprove = decision === 'Approve';
  const title = isApprove ? "Approve Task" : "Request Changes";
  const okText = isApprove ? "Approve" : "Send Feedback";
  const placeholder = isApprove
    ? "Optional: add approval notes or remarks..."
    : "Describe what needs to be changed or improved...";
  const okButtonStyle = isApprove
    ? { backgroundColor: '#16a34a', borderColor: '#16a34a' }
    : { backgroundColor: '#dc2626', borderColor: '#dc2626' };

  const handleConfirm = () => {
    if (!isApprove && !notes.trim()) return; // notes required for changes
    onConfirm(notes.trim());
    setNotes("");
  };

  const handleCancel = () => {
    setNotes("");
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          {isApprove ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span>{title}</span>
        </div>
      }
      open={open}
      onOk={handleConfirm}
      onCancel={handleCancel}
      okText={okText}
      cancelText="Cancel"
      confirmLoading={loading}
      okButtonProps={{
        style: okButtonStyle,
        disabled: !isApprove && !notes.trim(),
      }}
    >
      <div className="py-4 space-y-4">
        {taskName && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <Text className="text-xs text-gray-500">Reviewing task:</Text>
            <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{taskName}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {isApprove ? "Notes (optional)" : "Feedback (required)"}
          </label>
          <Input.TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full"
            autoFocus
          />
          {!isApprove && !notes.trim() && (
            <p className="text-xs text-red-500 mt-1">
              Please describe what changes are needed.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
