'use client';

import { motion } from "framer-motion";
import Lottie from "lottie-react";
import Link from "next/link";
import emailAnimation from "@/assets/email-sent-animation.json";

import { App } from "antd";
import { useResendVerificationEmail } from "@/hooks/useAuth";

interface RegisterSuccessProps {
  email: string;
}

export default function RegisterSuccess({ email }: RegisterSuccessProps) {
  const { message } = App.useApp();
  const resendEmailMutation = useResendVerificationEmail();

  const handleResend = () => {
    resendEmailMutation.mutate(email, {
      onSuccess: (data) => {
        if (data.success) {
          message.success("Verification email sent successfully!");
        } else {
          message.error(data.message || "Failed to resend verification email.");
        }
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.message || "Something went wrong. Please try again.";
        message.error(errorMessage);
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center text-center max-w-[420px] w-full mx-auto"
    >
      <div className="w-[200px] h-[200px] mb-8">
        <Lottie animationData={emailAnimation} loop={true} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="space-y-6"
      >
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-[#111111] tracking-tight">
            Verify your email
          </h2>
          
          <p className="text-[15px] text-[#666666] leading-relaxed">
            We've sent a verification link to <span className="font-bold text-[#111111]">{email}</span>.
            <br />
            Please check your inbox to activate your account.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <a 
            href={email.includes("@gmail.com") ? "https://mail.google.com" : "https://outlook.live.com/mail/"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 px-8 items-center justify-center !bg-[#ff3b3b] hover:!bg-[#E63535] !text-white rounded-[16px] font-bold text-[15px] shadow-lg shadow-[#ff3b3b]/25 transition-all hover:shadow-[#ff3b3b]/40 w-full"
          >
            Open {email.includes("@gmail.com") ? "Gmail" : "Outlook"}
          </a>
          
          <Link 
            href="/login"
            className="inline-flex h-12 px-8 items-center justify-center bg-transparent hover:bg-[#F5F5F5] text-[#666666] hover:text-[#111111] rounded-[16px] font-bold text-[15px] transition-all w-full"
          >
            Back to Login
          </Link>
        </div>

        <p className="text-[13px] text-[#999999]">
          Didn't receive the email? <button onClick={handleResend} disabled={resendEmailMutation.isPending} className="text-[#ff3b3b] hover:text-[#E63535] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{resendEmailMutation.isPending ? "Sending..." : "Click to resend"}</button>
        </p>
      </motion.div>
    </motion.div>
  );
}
