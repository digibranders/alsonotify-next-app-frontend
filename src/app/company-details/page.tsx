'use client';

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, User, Check, ArrowRight, Loader2 } from "lucide-react";
import {
  Select,
  Input,
  App,
} from "antd";
import { useCompleteSignup, useVerifyToken } from "@/hooks/useAuth";
import { trimStr } from "@/utils/trim";
import { industryToBusinessType, commonCountries, commonTimezones } from "@/data/defaultData";
import AuthLayout from "@/components/auth/AuthLayout";
import PhoneNumberInput from "@/components/ui/PhoneNumberInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { fileService } from "@/services/file.service";
import { useUpdateProfile, useUpdateCompany } from "@/hooks/useUser";
import { getErrorMessage } from "@/types/api-utils";
// Assuming useUpdateCompany exists, checking file next.

const { Option } = Select;

function CompanyDetailsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const token = searchParams.get("t");
  const completeSignupMutation = useCompleteSignup();
  const { data: userData } = useVerifyToken(token);

  const [currentStep, setCurrentStep] = useState<"company" | "admin">("company");

  const accountType = searchParams.get("type") || "organization";
  const isIndividual = accountType === "individual";

  const [companyData, setCompanyData] = useState({
    companyName: "",
    website: "", // Optional - not sent to API
    industry: "",
    companySize: "", // Optional - not sent to API
    country: "",
    timezone: "",
    logo: null as File | null, // Optional - not sent to API
  });

  const [adminData, setAdminData] = useState({
    firstName: "",
    lastName: "",
    country: "",
    countryCode: "+91",
    phone: "",
    photo: null as File | null,
  });

  // Auto-fill for Individual (only if user manually navigates to this page)
  useEffect(() => {
    if (isIndividual && userData?.success && userData.result) {
      const userName = userData.result.name || "My Account";
      // Omit prev from deps; equality check inside updater prevents unnecessary updates.
      // eslint-disable-next-line
      setCompanyData((prev) => {
        if (prev.companyName === userName && prev.industry === "other" && prev.companySize === "1-10") {
          return prev;
        }
        return {
          ...prev,
          companyName: userName, // Use user's name instead of "My Workspace"
          industry: "other",
          companySize: "1-10",
        };
      });
    }
  }, [isIndividual, userData]);

  // Auto-complete signup for individual accounts when they land on this page via email link
  useEffect(() => {
    if (isIndividual && token && userData?.success && userData.result && !completeSignupMutation.isPending) {
      // Check if user already has a company (already completed signup)
      // If not, auto-complete the signup
      const autoCompleteIndividual = async () => {
        try {
          // Use default values for individual accounts
          const businessType = 21; // Default to "Others"

          // For individual accounts, use user's name as the "company" name (required by backend structure)
          const userName = userData.result.name || "My Account";

          await completeSignupMutation.mutateAsync({
            registerToken: token,
            companyName: userName,
            businessType: String(businessType),
            accountType: "INDIVIDUAL",
            country: "", // Default country for individual accounts
            timezone: "", // Default timezone for individual accounts
          });

          message.success("Account activated successfully!");
          router.push("/dashboard");
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error, "Failed to activate account. Please try again.");
          message.error(errorMessage);
        }
      };

      autoCompleteIndividual();
    }
  }, [isIndividual, token, userData, completeSignupMutation.isPending, completeSignupMutation, message, router]);

  // Pre-fill Admin Details from token data
  useEffect(() => {
    if (userData?.success && userData.result) {
      const { name } = userData.result;
      if (name) {
        const parts = name.split(" ");
        const newFirstName = parts[0] || "";
        const newLastName = parts.slice(1).join(" ") || "";

        // Omit prev from deps; equality check inside updater prevents unnecessary updates.
        // eslint-disable-next-line
        setAdminData((prev) => {
          if (prev.firstName === newFirstName && prev.lastName === newLastName) {
            return prev;
          }
          return {
            ...prev,
            firstName: newFirstName,
            lastName: newLastName,
          };
        });
      }
    }
  }, [userData]);


  const formVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const handleCompanyNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyName = trimStr(companyData.companyName);
    const country = trimStr(companyData.country);
    const timezone = trimStr(companyData.timezone);
    if (!companyName || !companyData.industry || !country || !timezone) {
      message.error("Please fill in all required fields");
      return;
    }

    if (isIndividual) {
      const businessType = industryToBusinessType[companyData.industry] || 21;
      try {
        await completeSignupMutation.mutateAsync({
          registerToken: token,
          companyName,
          businessType: String(businessType),
          accountType: "INDIVIDUAL",
          country,
          timezone,
        });

        // Redirect manually since we removed it from the hook
        router.push("/dashboard");
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error, "Failed to complete signup. Please try again.");
        message.error(errorMessage);
      }
    } else {
      setCurrentStep("admin");
    }
  };

  const updateProfileMutation = useUpdateProfile();
  const updateCompanyMutation = useUpdateCompany();

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyName = trimStr(companyData.companyName);
    const country = trimStr(companyData.country);
    const timezone = trimStr(companyData.timezone);
    const firstName = trimStr(adminData.firstName);
    const lastName = trimStr(adminData.lastName);
    const phone = trimStr(adminData.phone);
    if (!firstName || !lastName) {
      message.error("Please fill in required admin fields");
      return;
    }

    const businessType = industryToBusinessType[companyData.industry] || 21;
    try {
      const response = await completeSignupMutation.mutateAsync({
        registerToken: token,
        companyName,
        businessType: String(businessType),
        accountType: "ORGANIZATION",
        country,
        timezone,
        firstName,
        lastName,
        phone,
      });


      if (response && response.success) {
        const user = response.result.user;
        const companyId = user?.company_id || (user?.companies && user.companies[0]?.id);
        const userId = user?.id;

        // Upload Company Logo if exists
        if (companyData.logo && companyId) {
          try {
            message.loading({ content: 'Uploading company logo...', key: 'logo-upload' });
            const logoResult = await fileService.uploadFile(
              companyData.logo,
              'COMPANY_LOGO',
              companyId
            );
            if (logoResult.download_url) {
              await updateCompanyMutation.mutateAsync({
                name: companyName,
                logo: logoResult.download_url
              });
              message.success({ content: 'Company logo uploaded!', key: 'logo-upload' });
            }
          } catch (err) {
            console.error("Logo upload failed", err);
            message.error({ content: 'Failed to upload logo', key: 'logo-upload' });
          }
        }

        // Upload Admin Photo if exists
        if (adminData.photo && userId) {
          try {
            message.loading({ content: 'Uploading profile photo...', key: 'photo-upload' });
            const photoResult = await fileService.uploadFile(
              adminData.photo,
              'USER_PROFILE_PICTURE',
              userId
            );
            if (photoResult.download_url) {
              await updateProfileMutation.mutateAsync({
                name: user.name,
                profile_pic: photoResult.download_url
              });
              message.success({ content: 'Profile photo uploaded!', key: 'photo-upload' });
            }
          } catch (err) {
            console.error("Photo upload failed", err);
            message.error({ content: 'Failed to upload photo', key: 'photo-upload' });
          }
        }

        router.push("/dashboard");
      } else {
        console.error("Signup response indicated failure or missing data:", response);
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, "Failed to complete signup. Please try again.");
      message.error(errorMessage);
    }
  };

  // Show loading state for individual accounts while auto-completing
  if (isIndividual && token && userData?.success && (completeSignupMutation.isPending || !userData.result)) {
    return (
      <AuthLayout>
        <motion.div
          initial="hidden"
          animate="visible"
          className="w-full max-w-[680px] space-y-8 flex flex-col items-center justify-center min-h-[400px]"
        >
          <Loader2 className="w-8 h-8 animate-spin text-[#ff3b3b] mb-4" />
          <p className="text-[#666666]">Activating your account...</p>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        className="w-full max-w-[680px] space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className="text-3xl font-bold text-[#111111] tracking-tight">
            Complete your profile
          </h2>
          <p className="text-[#666666]">
            Tell us more about your company to get started.
          </p>
        </motion.div>

        {/* Progress Indicator - Only show for Organization */}
        {!isIndividual && (
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors bg-[#ff3b3b] text-white"
              >
                {currentStep === "admin" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  "1"
                )}
              </div>
              <span
                className="text-sm font-medium text-[#111111]"
              >
                Company Details
              </span>
            </div>
            <div className="h-[1px] flex-1 bg-gray-200">
              <div
                className="h-full bg-[#ff3b3b] transition-all duration-500"
                style={{ width: currentStep === "admin" ? "100%" : "0%" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${currentStep === "admin"
                  ? "bg-[#ff3b3b] text-white"
                  : "bg-gray-100 text-gray-400"
                  }`}
              >
                2
              </div>
              <span
                className={`text-sm font-medium ${currentStep === "admin" ? "text-[#111111]" : "text-gray-400"
                  }`}
              >
                Admin Details
              </span>
            </div>
          </motion.div>
        )}

        <form
          onSubmit={currentStep === "company" ? handleCompanyNext : handleComplete}
        >
          <AnimatePresence mode="wait">
            {/* COMPANY DETAILS STEP */}
            {currentStep === "company" && (
              <motion.div
                key="company"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-8"
              >
                {!isIndividual && (
                  <motion.div variants={itemVariants}>
                    {/* Company Logo Upload */}
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-[#F5F5F5] flex items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:border-[#ff3b3b] hover:bg-[#FFF5F5] transition-colors group relative overflow-hidden">
                        <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-[#ff3b3b] transition-colors" />
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setCompanyData({ ...companyData, logo: file });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-[#111111]">Company Logo</h3>
                        <p className="text-sm text-[#666666]">
                          Upload your company logo. Recommended size: 400x400px.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!isIndividual && (
                  <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="company-name" className="text-xs font-bold text-[#999999] uppercase tracking-widest">
                        Company Name <span className="text-[#ff3b3b]">*</span>
                      </label>
                      <input
                        id="company-name"
                        type="text"
                        placeholder="Acme Inc."
                        value={companyData.companyName}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, companyName: e.target.value })
                        }
                        className="w-full h-12 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black px-4"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="website" className="text-xs font-bold text-[#999999] uppercase tracking-widest">
                        Website
                      </label>
                      <input
                        id="website"
                        type="url"
                        placeholder="https://acme.com"
                        value={companyData.website}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, website: e.target.value })
                        }
                        className="w-full h-12 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black px-4"
                      />
                    </div>
                  </motion.div>
                )}

                {!isIndividual && (
                  <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#999999] uppercase tracking-widest">
                        Industry <span className="text-[#ff3b3b]">*</span>
                      </label>
                      <Select
                        showSearch={{
                          filterOption: (input, option) =>
                            (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }}
                        value={companyData.industry}
                        onChange={(v) =>
                          setCompanyData({ ...companyData, industry: String(v) })
                        }
                        placeholder="Select Industry"
                        className="w-full h-12 company-details-select"
                        suffixIcon={<div className="text-gray-400">⌄</div>}
                      >
                        {Object.keys(industryToBusinessType).map((industry) => (
                          <Option key={industry} value={industry}>
                            {industry.charAt(0).toUpperCase() + industry.slice(1)}
                          </Option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#999999] uppercase tracking-widest">
                        Company Size
                      </label>
                      <Select
                        showSearch={{
                          filterOption: (input, option) =>
                            (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }}
                        value={companyData.companySize}
                        onChange={(v) =>
                          setCompanyData({ ...companyData, companySize: String(v) })
                        }
                        placeholder="Select Size"
                        className="w-full h-12 company-details-select"
                        suffixIcon={<div className="text-gray-400">⌄</div>}
                      >
                        <Option value="1-10">1-10 Employees</Option>
                        <Option value="11-50">11-50 Employees</Option>
                        <Option value="51-200">51-200 Employees</Option>
                        <Option value="201-500">201-500 Employees</Option>
                        <Option value="500+">500+ Employees</Option>
                      </Select>
                    </div>
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#999999] uppercase tracking-widest">
                      Country <span className="text-[#ff3b3b]">*</span>
                    </label>
                    <Select
                      showSearch={{
                        filterOption: (input, option) =>
                          (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                      }}
                      value={companyData.country || undefined}
                      onChange={(v) =>
                        setCompanyData({ ...companyData, country: String(v) })
                      }
                      placeholder="Select Country"
                      className="w-full h-12 company-details-select"
                      suffixIcon={<div className="text-gray-400">⌄</div>}
                    >
                      {commonCountries.map((country) => (
                        <Option key={country.code} value={country.name}>
                          {country.name}
                        </Option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#999999] uppercase tracking-widest">
                      Timezone <span className="text-[#ff3b3b]">*</span>
                    </label>
                    <Select
                      showSearch={{
                        filterOption: (input, option) =>
                          (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                      }}
                      value={companyData.timezone || undefined}
                      onChange={(v) =>
                        setCompanyData({ ...companyData, timezone: String(v) })
                      }
                      placeholder="Select Timezone"
                      className="w-full h-12 company-details-select"
                      suffixIcon={<div className="text-gray-400">⌄</div>}
                    >
                      {commonTimezones.map((tz) => (
                        <Option key={tz} value={tz}>
                          {tz}
                        </Option>
                      ))}
                    </Select>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ADMIN DETAILS STEP - Only for Organization (conceptually, or if specific fields needed later) */}
            {currentStep === "admin" && (
              <motion.div
                key="admin"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-8"
              >
                <motion.div variants={itemVariants}>
                  {/* Admin Photo Upload */}
                  <div className="flex items-start gap-6">
                    <div className="w-32 h-32 rounded-full bg-[#F5F5F5] border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-[#ff3b3b] hover:text-[#ff3b3b] transition-colors group relative overflow-hidden">
                      <User className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold">Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setAdminData({ ...adminData, photo: file });
                        }}
                      />
                    </div>

                    {/* Form Fields */}
                    {/* Input Fields */}
                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#999999] uppercase tracking-wider">
                            First Name <span className="text-[#ff3b3b]">*</span>
                          </label>
                          <Input
                            placeholder="e.g. John"
                            value={adminData.firstName}
                            onChange={(e) =>
                              setAdminData({ ...adminData, firstName: e.target.value })
                            }
                            className="h-12 bg-white/50 border-[#EEEEEE] focus:border-[#ff3b3b] focus:ring-1 focus:ring-[#ff3b3b] rounded-xl font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#999999] uppercase tracking-wider">
                            Last Name
                          </label>
                          <Input
                            placeholder="e.g. Doe"
                            value={adminData.lastName}
                            onChange={(e) =>
                              setAdminData({ ...adminData, lastName: e.target.value })
                            }
                            className="h-12 bg-white/50 border-[#EEEEEE] focus:border-[#ff3b3b] focus:ring-1 focus:ring-[#ff3b3b] rounded-xl font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#999999] uppercase tracking-wider">
                            Country <span className="text-[#ff3b3b]">*</span>
                          </label>
                          <Select
                            showSearch
                            placeholder="Select country"
                            value={adminData.country || undefined}
                            onChange={(val) => setAdminData({ ...adminData, country: val })}
                            className="w-full text-left"
                            size="large"
                          >
                            {commonCountries.map((c) => (
                              <Option key={c.code} value={c.name}>
                                {c.name}
                              </Option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#999999] uppercase tracking-widest">
                            Phone Number
                          </label>
                          <PhoneNumberInput
                            placeholder="98765 43210"
                            value={adminData.phone}
                            onChange={(val) =>
                              setAdminData({ ...adminData, phone: val })
                            }
                            className="w-full h-12 bg-[#FAFAFA] border border-transparent focus-within:bg-white focus-within:border-[#ff3b3b] rounded-xl company-details-phone"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.div variants={itemVariants} className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={
                completeSignupMutation.isPending ||
                (currentStep === "company" &&
                  (!companyData.companyName ||
                    !companyData.industry ||
                    !companyData.country ||
                    !companyData.timezone))
              }
              className="h-12 px-8 bg-[#ff3b3b] hover:bg-[#E63535] text-white rounded-[16px] font-bold text-sm shadow-lg shadow-[#ff3b3b]/25 transition-all hover:shadow-[#ff3b3b]/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {completeSignupMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {currentStep === "company" ? "Submitting..." : "Completing..."}
                </>
              ) : (
                <>
                  {currentStep === "company" ? (isIndividual ? "Complete Setup" : "Next Step") : "Complete Setup"}
                  {!isIndividual && currentStep === "admin" && <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>

      <style jsx global>{`
        .company-details-select .ant-select-selector {
          height: 48px !important;
          background-color: #FAFAFA !important;
          border-color: transparent !important;
          border-radius: 12px !important;
          padding: 0 16px !important;
        }
        .company-details-select .ant-select-selection-item {
          line-height: 48px !important;
          font-weight: 500 !important;
          color: #111111 !important;
        }
        .company-details-select .ant-select-selection-placeholder {
          line-height: 48px !important;
          color: #999999 !important;
        }
        .company-details-select.ant-select-focused .ant-select-selector {
          background-color: white !important;
          border-color: #ff3b3b !important;
          box-shadow: 0 0 0 4px rgba(255, 59, 59, 0.1) !important;
        }
        .company-details-select:hover .ant-select-selector {
          background-color: white !important;
        }
        .company-details-select .ant-select-arrow {
          display: none !important;
        }

        :global(.company-details-phone .ant-select-selector) {
          background-color: transparent !important;
          border: 1px solid transparent !important;
          border-right: 0 !important;
          border-radius: 12px 0 0 12px !important;
          height: 48px !important;
          display: flex !important;
          align-items: center !important;
          box-shadow: none !important;
          font-weight: 500 !important;
        }

        :global(.company-details-phone .ant-input) {
          border: 1px solid transparent !important;
          border-left: 0 !important;
          border-radius: 0 12px 12px 0 !important;
          height: 48px !important;
          background-color: transparent !important;
        }

        :global(.company-details-phone:focus-within .ant-select-selector),
        :global(.company-details-phone:focus-within .ant-input) {
          border-color: #ff3b3b !important;
          background-color: white !important;
        }

        :global(.company-details-phone) {
          border-radius: 12px !important;
          overflow: hidden !important;
        }
      `}</style>
    </AuthLayout>
  );
}

export default function CompanyDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]"><Skeleton className="h-[480px] w-[400px] rounded-[24px]" /></div>}>
      <CompanyDetailsForm />
    </Suspense>
  );
}

