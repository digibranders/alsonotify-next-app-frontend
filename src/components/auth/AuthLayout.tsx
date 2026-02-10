'use client';

import { ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import BrandLogo from "@/assets/images/logo-white.png";
import { useRouter } from "next/navigation";

// SVG Path for the Star
const STAR_PATH = "M453.287 175.698L518.817 377.379H730.877L559.317 502.024L820.419 814.622L453.287 579.059L256.831 744.136L347.258 502.024L175.698 377.379H387.757L453.287 175.698Z";

interface AuthLayoutProps {
    children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    const router = useRouter();

    return (
        <div className="min-h-screen w-full flex bg-white font-['Manrope',sans-serif] overflow-hidden" data-auth-layout>
            {/* LEFT SIDE - Brand & Visuals (50% Width) */}
            <div className="hidden lg:flex flex-1 bg-[#111111] relative flex-col justify-between p-16 text-white isolate overflow-hidden">

                {/* Animated Background Stars */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Star 1 - Top Right */}
                    <motion.div
                        animate={{
                            opacity: [0.4, 0.7, 0.4],
                            scale: [1, 1.15, 1],
                            rotate: [0, 5, 0]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[-100px] right-[-100px] w-[700px] h-[700px] text-[#FF3B3B] opacity-40 blur-[90px]"
                    >
                        <svg viewBox="0 0 996 990" className="w-full h-full fill-current">
                            <path d={STAR_PATH} />
                        </svg>
                    </motion.div>

                    {/* Star 2 - Bottom Left */}
                    <motion.div
                        animate={{
                            opacity: [0.3, 0.6, 0.3],
                            scale: [1, 1.2, 1],
                            rotate: [0, -5, 0]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute bottom-[-150px] left-[-150px] w-[600px] h-[600px] text-[#FF3B3B] opacity-30 blur-[80px]"
                    >
                        <svg viewBox="0 0 996 990" className="w-full h-full fill-current">
                            <path d={STAR_PATH} />
                        </svg>
                    </motion.div>
                </div>

                {/* Brand Header */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="cursor-pointer" onClick={() => router.push('/')}>
                        <Image
                            src={BrandLogo}
                            alt="Alsonotify"
                            width={120}
                            height={29}
                            className="h-[32px] w-auto object-contain"
                            draggable={false}
                            priority
                        />
                    </div>
                </div>

                {/* Main Text Content */}
                <div className="relative z-10 max-w-xl space-y-8 my-auto">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-[56px] font-extrabold leading-[1.1] tracking-tight"
                    >
                        Manage projects, clients, and tasks all in <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ffce64] via-[#ff5b52] to-[#ffffff]">one place.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-[18px] text-[#999999] leading-relaxed max-w-md"
                    >
                        Streamline your agency operations with the platform designed for modern teams. Track profitability, manage resources, and scale your business.
                    </motion.p>
                </div>

                {/* Footer Links */}
                <div className="relative z-10 flex items-center gap-8 text-xs font-medium text-[#666666] uppercase tracking-wider">
                    <span>© 2025 Alsonotify Inc.</span>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="text-[#666666] hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="text-[#666666] hover:text-white transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - Form (50% Width) */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 bg-white relative overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
