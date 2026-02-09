import { useEffect } from 'react';
import { Modal, Input, Select, Form, DatePicker, App } from 'antd';
import { X, Calendar } from 'lucide-react';
import { FormLayout } from '../common/FormLayout';
import { trimStr } from '@/utils/trim';
import dayjs from "dayjs";
import type { Dayjs } from 'dayjs';
import { useApplyForLeave } from "../../hooks/useLeave";

const { Option } = Select;

interface ApplyLeaveFormValues {
  start_date: Dayjs;
  end_date: Dayjs;
  day_type: string;
  leave_type: string;
  reason: string;
}

interface LeaveApplyModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  availableLeaveTypes: string[];
  initialDate?: dayjs.Dayjs | null;
}

export function LeaveApplyModal({
  open,
  onCancel,
  onSuccess,
  availableLeaveTypes = ['Sick Leave', 'Casual Leave', 'Vacation'],
  initialDate = null
}: LeaveApplyModalProps) {
  const [form] = Form.useForm<ApplyLeaveFormValues>();
  const applyLeaveMutation = useApplyForLeave();
  const { message } = App.useApp();

  const DAY_TYPES = ['Full Day', 'First Half', 'Second Half'];

  // Update form when initialDate changes
  useEffect(() => {
    if (open && initialDate) {
      form.setFieldsValue({
        start_date: initialDate,
        end_date: initialDate
      });
    }
  }, [open, initialDate, form]);

  const handleApplyLeave = async (values: ApplyLeaveFormValues) => {
    try {
      await applyLeaveMutation.mutateAsync({
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
        day_type: values.day_type,
        leave_type: values.leave_type,
        reason: trimStr(values.reason),
      });
      message.success("Leave applied successfully!");
      form.resetFields();
      if (onSuccess) onSuccess();
      onCancel();
    } catch (error) {
      // Error handled by mutation usually, but we can add a fallback
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      centered
      className="rounded-[16px] overflow-hidden"
      destroyOnHidden
      closeIcon={<X className="w-5 h-5 text-[#666666]" />}
      styles={{
        body: { 
          padding: 0,
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <FormLayout
        title="Apply Leave"
        subtitle="Apply for leave request to your manager."
        icon={Calendar}
        onCancel={handleCancel}
        onSubmit={() => form.submit()}
        isLoading={applyLeaveMutation.isPending}
        submitLabel="Save"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleApplyLeave}
          className="mt-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="start_date"
              label={<span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Start Date</span>}
              rules={[{ required: true, message: 'Please select start date' }]}
            >
              <DatePicker
                className="w-full h-11 rounded-lg border-[#EEEEEE] font-['Manrope:Medium',sans-serif]"
                placeholder="Select date"
                format="YYYY-MM-DD"
              />
            </Form.Item>

            <Form.Item
              name="end_date"
              label={<span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">End Date</span>}
              rules={[{ required: true, message: 'Please select end date' }]}
            >
              <DatePicker
                className="w-full h-11 rounded-lg border-[#EEEEEE] font-['Manrope:Medium',sans-serif]"
                placeholder="Select date"
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="day_type"
            label={<span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Day Type</span>}
            rules={[{ required: true, message: 'Please select day type' }]}
          >
            <Select
              className="w-full h-11"
              placeholder="Select day type"
            >
              {DAY_TYPES.map((dayType) => (
                <Option key={dayType} value={dayType}>
                  {dayType}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="leave_type"
            label={<span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Leave Type</span>}
            rules={[{ required: true, message: 'Please select leave type' }]}
          >
            <Select
              className="w-full h-11"
              placeholder="Select leave type"
            >
              {availableLeaveTypes.map((leaveType) => (
                <Option key={leaveType} value={leaveType}>
                  {leaveType}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label={<span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">Reason</span>}
            rules={[{ required: true, message: 'Please enter reason' }]}
          >
            <Input
              className="h-11 rounded-lg border-[#EEEEEE] font-['Manrope:Medium',sans-serif]"
              placeholder="Type or select a reason"
            />
          </Form.Item>
        </Form>
      </FormLayout>
    </Modal>
  );
}
