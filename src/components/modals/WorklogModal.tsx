import { useState } from "react";
import { Button, Input, App } from 'antd';
import { FileText } from 'lucide-react';
import { FormLayout } from "../common/FormLayout";

const { TextArea } = Input;

interface WorklogModalProps {
  onSubmit: (description: string) => void;
  onCancel: () => void;
  title?: string;
  actionType?: 'stuck' | 'complete';
}

export function WorklogModal({
  onSubmit,
  onCancel,
  title,
  actionType = 'complete'
}: WorklogModalProps) {
  const { message } = App.useApp();
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!description.trim()) {
      message.error("Worklog description is required");
      return;
    }

    setIsSubmitting(true);
    onSubmit(description.trim());
    // Note: The parent component should handle resetting isSubmitting
  };

  const modalTitle = title || (actionType === 'stuck' ? 'Mark as Stuck' : 'Mark as Complete');
  const submitLabel = actionType === 'stuck' ? 'Mark Stuck' : 'Mark Complete';

  return (
    <FormLayout
      title={modalTitle}
      subtitle={actionType === 'stuck' 
        ? 'Add a worklog describing what\'s blocking you.' 
        : 'Add a worklog describing what you completed.'}
      icon={FileText}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 px-6 rounded-lg border border-[#EEEEEE] text-[#666666] font-semibold text-sm hover:bg-[#F7F7F7] hover:border-[#DDDDDD] transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            className={`h-11 px-6 rounded-lg text-white font-semibold text-sm transition-all shadow-sm border-none ${
              actionType === 'stuck' 
                ? 'bg-gradient-to-r from-[#ff3b3b] to-[#cc2f2f] hover:from-[#cc2f2f] hover:to-[#aa2525]' 
                : 'bg-[#111111] hover:bg-[#000000]'
            }`}
          >
            {submitLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Worklog Description */}
        <div className="space-y-2">
          <span className="text-[0.8125rem] font-bold text-[#111111]">
            Worklog Description <span className="text-red-500">*</span>
          </span>
          <TextArea
            placeholder={actionType === 'stuck' 
              ? "Describe what's blocking you or what challenge you're facing..."
              : "Describe what you completed or worked on..."}
            className="min-h-[120px] rounded-lg border-[#EEEEEE] focus:border-[#111111] font-normal text-sm resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={1000}
            showCount
          />
        </div>
      </div>
    </FormLayout>
  );
}

