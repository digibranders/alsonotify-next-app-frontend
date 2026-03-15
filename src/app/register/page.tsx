'use client';

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { App } from "antd";
import { Lock, Eye, EyeOff, Mail, User, Building2, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useRegister } from "@/hooks/useAuth";
import { trimStr } from "@/utils/trim";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthLayout from "@/components/features/auth/AuthLayout";
import RegisterSuccess from "@/components/features/auth/RegisterSuccess";
import { Skeleton } from "@/components/ui/Skeleton";
import { Turnstile } from "@marsidev/react-turnstile";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const registerMutation = useRegister();
  const [isSuccess, setIsSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const inviteToken = searchParams.get("invite") ?? null;
  const inviteEmail = searchParams.get("email") ?? null;
  const inviteName = searchParams.get("name") ?? null;

  const [formData, setFormData] = useState(() => {
    const nameParts = (inviteName || "").trim().split(/\s+/).filter(Boolean);
    return {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: inviteEmail || "",
      password: "",
      accountType: "Organization" as "Individual" | "Organization",
    };
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const firstName = trimStr(formData.firstName);
    const lastName = trimStr(formData.lastName);
    const email = trimStr(formData.email);
    if (!firstName || !email || !formData.password) {
      message.error("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 8) {
      message.error("Password must be at least 8 characters long");
      return;
    }

    registerMutation.mutate(
      {
        firstName,
        lastName,
        email,
        password: formData.password,
        token: inviteToken,
        accountType: formData.accountType.toUpperCase(),
        turnstileToken,
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            if (inviteToken) {
              message.success("Registration successful!");
              router.push(`/company-details?t=${data.result.token}&type=${formData.accountType.toLowerCase()}`);
            } else {
              setIsSuccess(true);
            }
          } else {
            message.error(data.message || "Registration failed");
          }
        },
        onError: (error: unknown) => {
          const errorData = error as { response?: { data?: { message?: string } } };
          const errorMessage = errorData?.response?.data?.message || "Something went wrong. Please try again.";
          message.error(errorMessage);
        },
      }
    );
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout>
        <RegisterSuccess email={formData.email} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        className="w-full max-w-[420px] space-y-8"
      >
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className="text-3xl font-bold text-[#111111] tracking-tight">
            Create Account
          </h2>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Type Selector */}
          <motion.div variants={itemVariants} className="space-y-3">
            <label className="text-xs font-medium text-[#999999] uppercase tracking-wider">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['Organization', 'Individual'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: type })}
                  className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${formData.accountType === type
                    ? 'border-[#ff3b3b] bg-[#FFF5F5]/50'
                    : 'border-transparent bg-[#FAFAFA] hover:bg-[#F0F0F0]'
                    }`}
                >
                  <div className={`p-2 rounded-full ${formData.accountType === type ? 'bg-[#ff3b3b] text-white' : 'bg-white text-[#999999]'}`}>
                    {type === 'Individual' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-bold ${formData.accountType === type ? 'text-[#ff3b3b]' : 'text-[#666666]'}`}>{type}</span>
                  {formData.accountType === type && (
                    <div className="absolute top-3 right-3 text-[#ff3b3b]">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#999999] uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  placeholder="John"
                  className="w-full h-12 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black px-4"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#999999] uppercase tracking-wider">Last Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Doe"
                  className="w-full h-12 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black px-4"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#999999] uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full h-12 pl-11 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black disabled:opacity-60 disabled:cursor-not-allowed"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!inviteEmail}
                  required
                />
                <Mail className="w-5 h-5 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#999999] uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-11 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <Lock className="w-5 h-5 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#111111] p-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
                onSuccess={(token: string) => setTurnstileToken(token)}
                options={{
                  theme: 'light',
                  size: 'normal',
                }}
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="pt-2">
            <button
              type="submit"
              disabled={registerMutation.isPending || !turnstileToken}
              className="w-full h-12 bg-[#ff3b3b] hover:bg-[#E63535] text-white rounded-[16px] font-bold text-sm shadow-lg shadow-[#ff3b3b]/25 transition-all hover:shadow-[#ff3b3b]/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {registerMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        </form>

        <motion.div variants={itemVariants} className="text-center">
          <p className="text-sm text-[#666666]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#111111] font-bold hover:text-[#ff3b3b] transition-colors"
            >
              Sign In
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]"><Skeleton className="h-[480px] w-[400px] rounded-[24px]" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}

