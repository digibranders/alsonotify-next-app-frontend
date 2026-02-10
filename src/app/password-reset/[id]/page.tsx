'use client';

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { App } from "antd";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { resetPassword } from "@/services/auth";
import AuthLayout from "@/components/auth/AuthLayout";

export default function PasswordResetPage() {
  const router = useRouter();
  const params = useParams();
  const { message } = App.useApp();
  const resetToken = params?.id as string;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      message.error("Please fill in both password fields");
      return;
    }

    if (password !== confirmPassword) {
      message.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      message.error("Password must be at least 8 characters long");
      return;
    }

    if (!resetToken) {
      message.error("Invalid or missing reset token");
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(resetToken, password);
      if (result.success) {
        setIsSubmitted(true);
        message.success("Your password has been reset successfully!");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        message.error(result.message || "Failed to reset password");
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "Failed to reset password. Please try again.";
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <AuthLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        className="w-full max-w-[420px] space-y-8"
      >
        {isSubmitted ? (
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-[#28a745] mx-auto" />
            <h2 className="text-3xl font-bold text-[#111111] tracking-tight">
              Password Reset!
            </h2>
            <p className="text-[#666666]">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <motion.div variants={itemVariants} className="mt-8">
              <button
                onClick={() => router.push("/login")}
                className="w-full h-12 bg-[#ff3b3b] hover:bg-[#E63535] text-white rounded-[16px] font-bold text-[15px] shadow-lg shadow-[#ff3b3b]/25 transition-all hover:shadow-[#ff3b3b]/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                Back to Login
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h2 className="text-3xl font-bold text-[#111111] tracking-tight">
                Reset Password
              </h2>
              <p className="text-[#666666]">
                Enter your new password below.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div variants={itemVariants} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#999999] uppercase tracking-widest">
                    New Password <span className="text-[#ff3b3b]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full h-12 pl-11 pr-11 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#111111] p-1 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#999999] uppercase tracking-widest">
                    Confirm New Password <span className="text-[#ff3b3b]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full h-12 pl-11 pr-11 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#111111] p-1 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.div variants={itemVariants} className="mt-8">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 px-8 bg-[#ff3b3b] hover:bg-[#E63535] text-white rounded-[16px] font-bold text-[15px] shadow-lg shadow-[#ff3b3b]/25 transition-all hover:shadow-[#ff3b3b]/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          </>
        )}
      </motion.div>
    </AuthLayout>
  );
}

