'use client';

import { useState, useRef, Suspense } from "react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useSearchParams } from "next/navigation";
import { App } from "antd";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useLogin } from "@/hooks/useAuth";
import { trimStr } from "@/utils/trim";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthLayout from "@/components/features/auth/AuthLayout";
import { Skeleton } from "@/components/ui/Skeleton";
import { Turnstile } from "@marsidev/react-turnstile";

function LoginForm() {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const loginMutation = useLogin();

  const initialEmail = searchParams.get("email") || "";
  const rawRedirect = searchParams.get("redirect");
  const invite = searchParams.get("invite");
  const redirect = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
    ? rawRedirect
    : invite
      ? `/dashboard/partners?invite=${encodeURIComponent(invite)}`
      : "/dashboard";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileRetries, setTurnstileRetries] = useState(0);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = trimStr(email);
    if (!trimmedEmail || !password) {
      message.error("Please fill in all fields");
      return;
    }

    loginMutation.mutate(
      { email: trimmedEmail, password, redirect, turnstileToken },
      {
        onSuccess: () => {
          message.success("Login successful!");
        },
        onError: (error: unknown) => {
          const errorData = error as { response?: { data?: { message?: string } }; code?: string };
          if (!errorData?.response) {
            message.error("Unable to connect. Please check your internet connection and try again.");
          } else {
            const errorMessage = errorData?.response?.data?.message || "Login failed. Please check your credentials and try again.";
            message.error(errorMessage);
          }
          // Reset Turnstile to get a fresh token — tokens are single-use and consumed by the backend
          turnstileRef.current?.reset();
          setTurnstileToken(null);
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

  return (
    <AuthLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        className="w-full max-w-[420px] space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className="text-3xl font-bold text-[#111111] tracking-tight">
            Welcome Back
          </h2>
          <p className="text-sm font-medium text-[#666666]">
            Enter your details to access your workspace
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div variants={itemVariants} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#999999] uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full h-12 pl-11 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  tabIndex={1}
                  required
                />
                <Mail className="w-5 h-5 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#999999] uppercase tracking-wider">Password</label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs font-semibold text-[#ff3b3b] hover:text-[#E63535]"
                  tabIndex={4}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  className="w-full h-12 pl-11 pr-11 bg-[#FAFAFA] border border-transparent focus:bg-white focus:border-[#ff3b3b] focus:ring-4 focus:ring-[#ff3b3b]/10 rounded-xl transition-all font-medium outline-none text-black"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  tabIndex={2}
                  required
                />
                <Lock className="w-5 h-5 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#111111] p-1 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>

          <div className="pt-2">
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
              onSuccess={(token: string) => {
                setTurnstileToken(token);
                setTurnstileRetries(0);
              }}
              onError={() => {
                setTurnstileToken(null);
                setTurnstileRetries(prev => prev + 1);
                message.error("Security verification failed. Retrying automatically...");
                setTimeout(() => turnstileRef.current?.reset(), 2000);
              }}
              onExpire={() => {
                setTurnstileToken(null);
                turnstileRef.current?.reset();
              }}
              options={{
                theme: 'light',
                size: 'normal',
                retry: 'auto',
                retryInterval: 3000,
              }}
            />
            {turnstileRetries >= 3 && !turnstileToken && (
              <p className="text-xs text-[#999999] mt-2">
                Verification unavailable.{" "}
                <button
                  type="button"
                  onClick={() => { setTurnstileRetries(0); turnstileRef.current?.reset(); }}
                  className="text-[#ff3b3b] font-semibold underline"
                >
                  Try again
                </button>
              </p>
            )}
          </div>

          <motion.div variants={itemVariants} className="pt-2">
            <button
              type="submit"
              disabled={loginMutation.isPending || !turnstileToken}
              className="w-full h-12 bg-[#ff3b3b] hover:bg-[#E63535] text-white rounded-[16px] font-bold text-sm shadow-lg shadow-[#ff3b3b]/25 transition-all hover:shadow-[#ff3b3b]/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              tabIndex={3}
            >
              {loginMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        </form>

        <motion.div variants={itemVariants} className="text-center">
          <p className="text-sm text-[#666666]">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-[#111111] font-bold hover:text-[#ff3b3b] transition-colors"
              tabIndex={5}
            >
              Sign Up
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]"><Skeleton className="h-[480px] w-[400px] rounded-[24px]" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
