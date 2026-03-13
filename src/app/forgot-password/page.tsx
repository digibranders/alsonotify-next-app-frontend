'use client';

import { useState } from "react";
import { App } from "antd";
import { Mail, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { useForgotPassword } from "@/hooks/useAuth";
import { trimStr } from "@/utils/trim";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthLayout from "@/components/auth/AuthLayout";

export default function ForgotPasswordPage() {
    const { message } = App.useApp();
    const forgotPasswordMutation = useForgotPassword();
    const [email, setEmail] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedEmail = trimStr(email);
        if (!trimmedEmail) {
            message.error("Please enter your email address");
            return;
        }

        forgotPasswordMutation.mutate(trimmedEmail, {
            onSuccess: (data) => {
                if (data.success) {
                    setIsSubmitted(true);
                    message.success("Reset link sent!");
                } else {
                    message.error(data.message || "Failed to send reset link");
                }
            },
            onError: (error: any) => {
                const errorMessage = error?.response?.data?.message || "Something went wrong. Please try again.";
                message.error(errorMessage);
            },
        });
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
                        {isSubmitted ? "Check your inbox" : "Forgot Password?"}
                    </h2>
                    <p className="text-sm font-medium text-[#666666]">
                        {isSubmitted
                            ? `We've sent a password reset link to ${email}`
                            : "Enter your email address and we'll send you a link to reset your password."
                        }
                    </p>
                </motion.div>

                {!isSubmitted ? (
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
                                        required
                                    />
                                    <Mail className="w-5 h-5 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="pt-2">
                            <button
                                type="submit"
                                disabled={forgotPasswordMutation.isPending}
                                className="w-full h-12 bg-[#ff3b3b] hover:bg-[#E63535] text-white rounded-[16px] font-bold text-sm shadow-lg shadow-[#ff3b3b]/25 transition-all hover:shadow-[#ff3b3b]/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {forgotPasswordMutation.isPending ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Send Reset Link
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </form>
                ) : (
                    <motion.div variants={itemVariants} className="pt-2">
                        <Link href="/login">
                            <button
                                className="w-full h-12 bg-[#ff3b3b] hover:bg-[#E63535] text-white rounded-[16px] font-bold text-sm shadow-lg shadow-[#ff3b3b]/25 transition-all hover:shadow-[#ff3b3b]/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                            >
                                Back to Login
                            </button>
                        </Link>
                    </motion.div>
                )}

                {!isSubmitted && (
                    <motion.div variants={itemVariants} className="text-center">
                        <Link
                            href="/login"
                            className="flex items-center justify-center gap-2 text-sm text-[#666666] font-semibold hover:text-[#111111] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </Link>
                    </motion.div>
                )}
            </motion.div>
        </AuthLayout>
    );
}
