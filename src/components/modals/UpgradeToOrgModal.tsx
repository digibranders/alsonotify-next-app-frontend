import { Modal, Form, Input, Select, Button, message } from "antd";
import { useUpgradeToOrg } from "@/hooks/useAuth";
import { industryToBusinessType, commonCountries, commonTimezones } from "@/data/defaultData";

import { useEffect } from "react";
import { AxiosError } from "axios";
import { UserDto } from "@/types/dto/user.dto";
import { Employee } from "@/types/domain";

interface UpgradeToOrgModalProps {
  visible: boolean;
  onCancel: () => void;
  currentUser: UserDto | Employee | null;
}

export default function UpgradeToOrgModal({ visible, onCancel, currentUser }: UpgradeToOrgModalProps) {
  const [form] = Form.useForm();
  const { mutate: upgrade, isPending } = useUpgradeToOrg();

  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = (values: any) => {
    if (!currentUser) {
      message.error("User details not found. Please try refreshing the page.");
      return;
    }

    const nameParts = currentUser.name?.split(" ") || [];
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    
    // Get phone number from user profile or base user object
    const phone = currentUser.mobile_number || currentUser.phone || currentUser.user_profile?.mobile_number || currentUser.user_profile?.phone || "";

    // Map the selected industry string to the businessType number
    const businessTypeNumber = industryToBusinessType[values.businessType] || 21; // Default to 'Others' if not found

    upgrade(
      {
        companyName: values.companyName,
        businessType: businessTypeNumber,
        country: values.country,
        timezone: values.timezone,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
      },
      {
        onSuccess: () => {
          message.success("Account upgraded successfully!");
          onCancel();
          // The page might reload or context update will handle the UI change
          globalThis.location.reload(); // Force reload to ensure all states (like sidebar) update correctly
        },
        onError: (error: Error | AxiosError) => {
           const axiosError = error as AxiosError<{ message: string }>;
           message.error(axiosError.response?.data?.message || "Failed to upgrade account.");
        },
      }
    );
  };

  return (
    <Modal
      title="Upgrade to Organization"
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <div className="mb-4 text-gray-500">
        Upgrade your account to create and manage an organization. This will promote you to Admin.
      </div>
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item
          name="companyName"
          label={<span className="text-xs font-bold">Company Name <span className="text-[#ff3b3b]">*</span></span>}
          rules={[{ required: true, message: "Please enter company name" }]}
        >
          <Input placeholder="Enter company name" />
        </Form.Item>

        <Form.Item
          name="businessType"
          label={<span className="text-xs font-bold">Business Type <span className="text-[#ff3b3b]">*</span></span>}
          rules={[{ required: true, message: "Select business type" }]}
        >
          <Select placeholder="Select business type" showSearch>
            {Object.keys(industryToBusinessType).map((industry) => (
              <Select.Option key={industry} value={industry}>
                 {industry.charAt(0).toUpperCase() + industry.slice(1)}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="country"
            label={<span className="text-xs font-bold">Country <span className="text-[#ff3b3b]">*</span></span>}
            rules={[{ required: true, message: "Select country" }]}
          >
            <Select showSearch placeholder="Select country" optionFilterProp="children">
              {commonCountries.map((c) => (
                <Select.Option key={c.code} value={c.name}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="timezone"
            label={<span className="text-xs font-bold">Timezone <span className="text-[#ff3b3b]">*</span></span>}
            rules={[{ required: true, message: "Select timezone" }]}
          >
            <Select showSearch placeholder="Select timezone">
              {commonTimezones.map((tz) => (
                <Select.Option key={tz} value={tz}>
                  {tz}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending} className="bg-black">
            Upgrade Account
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
