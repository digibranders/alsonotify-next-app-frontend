'use client';

import React from 'react';
import { FileText, CheckCircle2, Clock, AlertCircle, ArrowRight, Banknote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRequirementAdvanceStatus } from '@/hooks/useInvoice';

interface AdvanceBillingStatusWidgetProps {
    requirementId: number;
    quotedPrice: number;
    currency: string;
    requirementStatus: string;
}

type BillingStatusConfig = {
    label: string;
    color: string;
    bgColor: string;
};

const BILLING_STATUS_CONFIG: Record<string, BillingStatusConfig> = {
    Not_Billable:            { label: 'Not Billable',           color: 'text-[#666666]',  bgColor: 'bg-[#F1F5F9]' },
    Ready_To_Bill:           { label: 'Ready to Bill',          color: 'text-[#0F9D58]',  bgColor: 'bg-[#E8F5E9]' },
    Advance_Payment_Required:{ label: 'Advance Required',       color: 'text-[#FF9800]',  bgColor: 'bg-[#FFF3E0]' },
    Advance_Ready_To_Send:   { label: 'Ready to Send',          color: 'text-[#2196F3]',  bgColor: 'bg-[#E3F2FD]' },
    Advance_Draft:           { label: 'Advance Draft',          color: 'text-[#FF9800]',  bgColor: 'bg-[#FFF3E0]' },
    Advance_Sent:            { label: 'Advance Sent',           color: 'text-[#2196F3]',  bgColor: 'bg-[#E3F2FD]' },
    Advance_Partial:         { label: 'Partial Advance Paid',   color: 'text-[#FF9800]',  bgColor: 'bg-[#FFF3E0]' },
    Advance_Paid_In_Progress:{ label: 'Advance Paid',          color: 'text-[#0F9D58]',  bgColor: 'bg-[#E8F5E9]' },
    Ready_For_Final_Invoice: { label: 'Ready for Final Invoice',color: 'text-blue-600',   bgColor: 'bg-blue-50' },
    Invoiced:                { label: 'Invoiced',               color: 'text-[#2196F3]',  bgColor: 'bg-[#E3F2FD]' },
    Advance_Overdue:         { label: 'Advance Overdue',        color: 'text-[#D14343]',  bgColor: 'bg-red-50' },
    Paid:                    { label: 'Paid',                   color: 'text-[#0F9D58]',  bgColor: 'bg-[#E8F5E9]' },
};

export const AdvanceBillingStatusWidget: React.FC<AdvanceBillingStatusWidgetProps> = ({
    requirementId,
    quotedPrice,
    currency,
    requirementStatus,
}) => {
    const router = useRouter();
    const { data: advanceStatus, isLoading } = useRequirementAdvanceStatus(requirementId);

    const isCompleted = requirementStatus === 'Completed' || requirementStatus === 'completed';

    if (isLoading) {
        return (
            <div className="mb-4 p-4 rounded-[16px] border border-[#EEEEEE] space-y-3 animate-pulse">
                <div className="bg-[#F1F5F9] rounded-[8px] h-4 w-1/3" />
                <div className="bg-[#F1F5F9] rounded-[8px] h-4 w-2/3" />
            </div>
        );
    }

    const status = advanceStatus?.advance_billing_status ?? (isCompleted ? 'Ready_To_Bill' : 'Not_Billable');
    const statusConfig = BILLING_STATUS_CONFIG[status] ?? BILLING_STATUS_CONFIG.Not_Billable;
    const advInvoice = advanceStatus?.advance_invoice;
    const finalInvoice = advanceStatus?.final_invoice;

    const formatAmount = (amount: number) => `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="mb-4 p-4 rounded-[16px] border border-[#EEEEEE] bg-white">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-[#666666]" />
                    <span className="text-sm font-semibold text-[#111111]">Advance Billing</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                </span>
            </div>

            {/* Quoted price */}
            {quotedPrice > 0 && (
                <div className="flex justify-between text-sm mb-3">
                    <span className="text-[#666666]">Quoted Price</span>
                    <span className="font-medium text-[#111111]">{formatAmount(quotedPrice)}</span>
                </div>
            )}

            {/* Advance invoice info */}
            {advInvoice && (
                <div className="bg-[#F9FAFB] border border-[#EEEEEE] rounded-xl p-3 mb-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#666666]" />
                            <span className="text-xs font-medium text-[#666666]">Advance Proforma</span>
                        </div>
                        <button
                            onClick={() => router.push(`/dashboard/finance/invoices/${advInvoice.id}`)}
                            className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5"
                        >
                            {advInvoice.invoice_number} <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-[#666666]">Amount</span>
                        <span className="font-medium text-[#111111]">{formatAmount(advInvoice.advance_amount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-[#666666]">Received</span>
                        <span className={`font-medium ${advInvoice.amount_received > 0 ? 'text-[#0F9D58]' : 'text-[#111111]'}`}>
                            {formatAmount(advInvoice.amount_received)}
                        </span>
                    </div>
                    {advInvoice.amount_pending > 0 && (
                        <div className="flex justify-between text-xs">
                            <span className="text-[#666666]">Pending</span>
                            <span className="font-medium text-[#FF9800]">{formatAmount(advInvoice.amount_pending)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Final invoice info */}
            {finalInvoice && (
                <div className="bg-[#F9FAFB] border border-[#EEEEEE] rounded-xl p-3 mb-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0F9D58]" />
                            <span className="text-xs font-medium text-[#666666]">Final Invoice</span>
                        </div>
                        <button
                            onClick={() => router.push(`/dashboard/finance/invoices/${finalInvoice.id}`)}
                            className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5"
                        >
                            {finalInvoice.invoice_number} <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-[#666666]">Total</span>
                        <span className="font-medium text-[#111111]">{formatAmount(finalInvoice.total)}</span>
                    </div>
                    {finalInvoice.advance_deducted > 0 && (
                        <div className="flex justify-between text-xs">
                            <span className="text-[#666666]">Advance Deducted</span>
                            <span className="font-medium text-[#0F9D58]">- {formatAmount(finalInvoice.advance_deducted)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs">
                        <span className="text-[#666666]">Balance Due</span>
                        <span className={`font-medium ${finalInvoice.balance_due > 0 ? 'text-[#FF9800]' : 'text-[#0F9D58]'}`}>
                            {formatAmount(finalInvoice.balance_due)}
                        </span>
                    </div>
                </div>
            )}

            {/* Status Hints */}
            <div className="mt-2 space-y-2">
                {status === 'Advance_Payment_Required' && (
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-[#666666]">
                        <Clock className="w-3.5 h-3.5" />
                        Advance proforma not yet created
                    </div>
                )}
                {status === 'Advance_Ready_To_Send' && (
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-[#2196F3]">
                        <Clock className="w-3.5 h-3.5" />
                        Proforma ready — send to client
                    </div>
                )}
                {(status === 'Advance_Draft' || status === 'Advance_Sent' || status === 'Advance_Partial') && (
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-[#666666]">
                        <Clock className="w-3.5 h-3.5" />
                        {status === 'Advance_Draft' ? 'Proforma not yet sent' : 'Awaiting advance payment'}
                    </div>
                )}
                {status === 'Advance_Overdue' && (
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-[#D14343]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Advance payment is overdue
                    </div>
                )}
                {status === 'Advance_Paid_In_Progress' && (
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-[#666666]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Work in progress
                    </div>
                )}

                {/* Manage in Finance link */}
                <button
                    onClick={() => router.push('/dashboard/finance')}
                    className="w-full py-1.5 text-xs font-medium text-blue-600 hover:underline flex items-center justify-center gap-1"
                >
                    Manage in Finance <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};
