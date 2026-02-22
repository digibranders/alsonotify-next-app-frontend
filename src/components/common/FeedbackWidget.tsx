'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Button, App } from 'antd';
import { Lightbulb, Bug, Sparkles, MessageCircle, X } from 'lucide-react';
import { useCreateFeedback } from '@/hooks/useFeedback';
import { FeedbackType } from '@/services/feedback';

const { TextArea } = Input;

interface FeedbackFormValues {
  description: string;
}

const FEEDBACK_TYPE_OPTIONS: {
  label: string;
  description: string;
  value: FeedbackType;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    label: 'Feature Request',
    description: 'Suggest a new feature or enhancement.',
    value: FeedbackType.FEATURE,
    icon: <Lightbulb className="w-5 h-5" />,
    color: '#F59E0B',
  },
  {
    label: 'Bug Report',
    description: 'Report something not working correctly.',
    value: FeedbackType.BUG,
    icon: <Bug className="w-5 h-5" />,
    color: '#EF4444',
  },
  {
    label: 'Improvement',
    description: 'Improve an existing feature or workflow.',
    value: FeedbackType.IMPROVEMENT,
    icon: <Sparkles className="w-5 h-5" />,
    color: '#10B981',
  },
  {
    label: 'Other',
    description: "Anything else you'd like to share.",
    value: FeedbackType.OTHER,
    icon: <MessageCircle className="w-5 h-5" />,
    color: '#6366F1',
  },
];

interface FeedbackWidgetProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackWidget({ open, onClose }: FeedbackWidgetProps) {
  const { message } = App.useApp();
  const [selectedType, setSelectedType] = useState<FeedbackType>(FeedbackType.FEATURE);
  const [form] = Form.useForm<FeedbackFormValues>();
  const { mutateAsync, isPending } = useCreateFeedback();

  const handleClose = () => {
    form.resetFields();
    setSelectedType(FeedbackType.FEATURE);
    onClose();
  };

  const handleSubmit = async (values: FeedbackFormValues) => {
    try {
      const trimmedDescription = values.description.trim();
      if (!trimmedDescription) {
        message.error('Please enter a description');
        return;
      }

      const categoryLabel = FEEDBACK_TYPE_OPTIONS.find(opt => opt.value === selectedType)?.label || selectedType;
      
      await mutateAsync({
        title: categoryLabel,
        description: trimmedDescription,
        type: selectedType,
      });
      message.success('Thank you for your feedback! 🙌');
      handleClose();
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (err as { message?: string })?.message || 'Failed to submit feedback';
      message.error(errorMessage);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width="min(520px, 95vw)"
      centered
      closable={false}
      className="feedback-modal [&_.ant-modal-content]:!rounded-2xl [&_.ant-modal-content]:overflow-hidden"
      styles={{
        body: { padding: 0 },
      }}
    >
      <div className="bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE]">
          <div>
            <h2 className="text-lg font-bold text-[#111111] mb-1">
              Give us feedback
            </h2>
            <p className="text-[0.8125rem] font-normal text-[#666666]">
              Tell us how we can make AlsoNotify better for you.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[#F7F7F7] hover:bg-[#EEEEEE] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#666666]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <Form<FeedbackFormValues>
            layout="vertical"
            form={form}
            onFinish={handleSubmit}
          >
            {/* Category Selection */}
            <div className="mb-5">
              <label className="block text-[0.8125rem] font-bold text-[#111111] mb-3">
                Category
              </label>
              <div className="grid grid-cols-2 gap-3">
                {FEEDBACK_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedType(opt.value)}
                    className={`
                      p-3 rounded-xl border-2 text-left transition-all
                      ${selectedType === opt.value
                        ? 'border-[#ff3b3b] bg-[#FEF2F2]'
                        : 'border-[#EEEEEE] bg-white hover:border-[#CCCCCC]'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${opt.color}15`, color: opt.color }}
                      >
                        {opt.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[0.8125rem] font-bold text-[#111111] mb-0.5">
                          {opt.label}
                        </div>
                        <div className="text-[0.6875rem] font-normal text-[#666666] leading-tight">
                          {opt.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <Form.Item
              name="description"
              label={
                <span className="text-[0.8125rem] font-bold text-[#111111]">
                  Details <span className="text-[#ff3b3b]">*</span>
                </span>
              }
              rules={[{ required: true, whitespace: true, message: 'Please describe your feedback' }]}
            >
              <TextArea
                rows={6}
                placeholder="Describe the bug or idea with as much detail as possible..."
                className="rounded-xl border-[#EEEEEE] font-medium py-3"
              />
            </Form.Item>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                type="text"
                onClick={handleClose}
                className="h-11 px-6 text-sm font-semibold text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-xl transition-all"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isPending}
                className="h-11 px-6 text-sm font-semibold bg-[#111111] hover:bg-[#333333] rounded-xl border-none"
              >
                Submit Feedback
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </Modal>
  );
}
