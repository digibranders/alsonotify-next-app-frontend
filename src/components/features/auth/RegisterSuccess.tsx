'use client';

import dynamic from "next/dynamic";

// Purely decorative, and only on the post-registration screen — a page most
// users see exactly once. No reason to put ~40KB in the auth bundle for every
// visitor who never registers. The placeholder matches the 200x200 wrapper, so
// the copy below it does not move when the animation swaps in.
const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => <div className="w-full h-full" aria-hidden="true" />,
});
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.message || "Something went wrong. Please try again.";
        message.error(errorMessage);
      },
    });
  };

  return (
    <div
      className="flex flex-col items-center justify-center text-center max-w-[420px] w-full mx-auto auth-scale-in"
    >
      <div className="w-[200px] h-[200px] mb-8">
        <Lottie animationData={emailAnimation} loop={true} />
      </div>

      <div
        className="space-y-6 auth-fade-up auth-delay-200"
      >
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-[#111111] tracking-tight">
            Verify your email
          </h2>

          <p className="text-sm text-[#666666] leading-relaxed">
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
            className="inline-flex h-12 px-8 items-center justify-center !bg-[#ff3b3b] hover:!bg-[#E63535] !text-white rounded-[16px] font-bold text-sm shadow-lg shadow-[#ff3b3b]/25 transition-all hover:shadow-[#ff3b3b]/40 w-full"
          >
            {/* Open {email.includes("@gmail.com") ? "Gmail" : "Outlook"} */}
            Verify Email
          </a>

          <Link
            href="/login"
            className="inline-flex h-12 px-8 items-center justify-center bg-transparent hover:bg-[#F5F5F5] text-[#666666] hover:text-[#111111] rounded-[16px] font-bold text-sm transition-all w-full"
          >
            Back to Login
          </Link>
        </div>

        <p className="text-xs text-[#999999]">
          Didn't receive the email? <button onClick={handleResend} disabled={resendEmailMutation.isPending} className="text-[#ff3b3b] hover:text-[#E63535] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{resendEmailMutation.isPending ? "Sending..." : "Click to resend"}</button>
        </p>
      </div>
    </div>
  );
}
