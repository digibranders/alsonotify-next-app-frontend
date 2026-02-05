import { useState, useEffect } from "react";
import { Input, Select, App } from "antd";
import { Briefcase } from "lucide-react";
import { FormLayout } from "../common/FormLayout";

const { Option } = Select;

export interface ClientFormData {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  countryCode: string;
  phone: string;
  country: string;
  requirements: string;
  onboarding: string;
}

interface ClientFormProps {
  initialData?: ClientFormData;
  onSubmit: (data: ClientFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const defaultFormData: ClientFormData = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  countryCode: "+91",
  phone: "",
  country: "",
  requirements: "0",
  onboarding: new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-"),
};

export function ClientForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}: ClientFormProps) {
  const { message } = App.useApp();
  const [formData, setFormData] = useState<ClientFormData>(defaultFormData);

  useEffect(() => {
    if (initialData) {
      const nameParts = ((initialData as any).name || "").split(" ");
      let phone = initialData.phone || "";
      let countryCode = initialData.countryCode || "+91";

      if (phone && phone.startsWith("+")) {
        // Try to match 
        const codes = ["+91", "+1", "+44", "+61", "+971"];
        const matched = codes.find(c => phone.startsWith(c));
        if (matched) {
          countryCode = matched;
          phone = phone.slice(matched.length).trim();
        }
      }

      setFormData({
        ...defaultFormData,
        ...initialData,
        firstName: initialData.firstName || nameParts[0] || "",
        lastName: initialData.lastName || nameParts.slice(1).join(" ") || "",
        phone,
        countryCode
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [initialData]);

  // Email regex for validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validate form and return true if valid, false otherwise
  const validateForm = (): boolean => {
    const trimmedEmail = formData.email.trim();
    const trimmedFirstName = formData.firstName.trim();

    // Email is always required
    if (!trimmedEmail) {
      message.error("Email address is required");
      return false;
    }

    // Validate email format
    if (!emailRegex.test(trimmedEmail)) {
      message.error("Please enter a valid email address");
      return false;
    }

    // First name is required when editing
    if (isEditing && !trimmedFirstName) {
      message.error("First name is required");
      return false;
    }

    return true;
  };

  // Check if form is valid (for button disabled state)
  const isFormValid = (): boolean => {
    const trimmedEmail = formData.email.trim();
    const trimmedFirstName = formData.firstName.trim();

    // Email must be present and valid
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return false;
    }

    // First name required when editing
    if (isEditing && !trimmedFirstName) {
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    // Trim values before submitting
    const trimmedData: ClientFormData = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      company: formData.company.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      country: formData.country.trim(),
    };

    onSubmit(trimmedData);
  };

  return (
    <FormLayout
      title={isEditing ? 'Edit Client Details' : 'Invite Client'}
      subtitle={isEditing ? 'Update client profile and contact information.' : 'An invitation link will be sent to this email for the client to complete their profile.'}
      icon={Briefcase}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Update Client" : "Send Invitation"}
      submitDisabled={!isFormValid()}
    >
      {!isEditing ? (
        // Simplified Add Flow: Only Email
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              className="text-[12px] font-bold text-[#111111] block"
            >
              Client Email Address <span className="text-[#ff3b3b]">*</span>
            </label>
            <Input
              placeholder="email@company.com"
              className="h-11 rounded-lg border border-[#EEEEEE]"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
        </div>
      ) : (
        // Full Edit Flow
        <>
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#111111] block">
                  First Name <span className="text-[#ff3b3b]">*</span>
                </label>
                <Input
                  placeholder="John"
                  className="h-11 rounded-lg border border-[#EEEEEE]"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#111111] block">
                  Last Name
                </label>
                <Input
                  placeholder="Doe"
                  className="h-11 rounded-lg border border-[#EEEEEE]"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                className="text-[12px] font-bold text-[#111111] block"
              >
                Business Name
              </label>
              <Select
                value={formData.company}
                onChange={(v) => setFormData({ ...formData, company: String(v) })}
                className="w-full h-11"
                placeholder="Select company"
                suffixIcon={<div className="text-gray-400">⌄</div>}
              >
                <Option value="Triem Security">Triem Security</Option>
                <Option value="Eventus Security">Eventus Security</Option>
                <Option value="TechCorp Inc.">TechCorp Inc.</Option>
                <Option value="Digibranders">Digibranders</Option>
              </Select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-1.5">
              <label
                className="text-[12px] font-bold text-[#111111] block"
              >
                Email <span className="text-[#ff3b3b]">*</span>
              </label>
              <Input
                placeholder="email@company.com"
                className="h-11 rounded-lg border border-[#EEEEEE]"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-[12px] font-bold text-[#111111] block"
              >
                Contact (Phone)
              </label>
              <div className="flex gap-2">
                <Select
                  className="w-[85px] h-11"
                  value={formData.countryCode}
                  onChange={(v) => setFormData({ ...formData, countryCode: String(v) })}
                  suffixIcon={<div className="text-gray-400">⌄</div>}
                >
                  <Option value="+91">+91 IN</Option>
                  <Option value="+1">+1 US</Option>
                  <Option value="+44">+44 UK</Option>
                  <Option value="+61">+61 AU</Option>
                  <Option value="+971">+971 AE</Option>
                </Select>
                <Input
                  placeholder="8698027152"
                  className="flex-1 h-11 rounded-lg border border-[#EEEEEE]"
                  value={formData.phone}
                  maxLength={15}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })
                  }
                />
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-1.5">
              <label
                className="text-[12px] font-bold text-[#111111] block"
              >
                Country
              </label>
              <Select
                value={formData.country}
                onChange={(v) => setFormData({ ...formData, country: String(v) })}
                className="w-full h-11"
                placeholder="Select country"
                suffixIcon={<div className="text-gray-400">⌄</div>}
              >
                <Option value="USA">USA</Option>
                <Option value="India">India</Option>
                <Option value="UK">UK</Option>
                <Option value="UAE">UAE</Option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label
                className="text-[12px] font-bold text-[#111111] block"
              >
                Onboarding Date
              </label>
              <Input
                placeholder="DD-MMM-YYYY"
                className="h-11 rounded-lg border border-[#EEEEEE]"
                value={formData.onboarding}
                onChange={(e) =>
                  setFormData({ ...formData, onboarding: e.target.value })
                }
              />
            </div>
          </div>

          {/* Row 4 */}
          <div className="space-y-1.5 mb-6">
            <label
              className="text-[12px] font-bold text-[#111111] block"
            >
              Requirements (Count)
            </label>
            <Input
              type="number"
              placeholder="Number of requirements"
              className="h-11 rounded-lg border border-[#EEEEEE]"
              value={formData.requirements}
              onChange={(e) =>
                setFormData({ ...formData, requirements: e.target.value })
              }
            />
          </div>
        </>
      )}
    </FormLayout>
  );
}
