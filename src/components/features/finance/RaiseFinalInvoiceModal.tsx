'use client';

import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getTaxPreview } from '@/services/invoice';
import { useCreateFinalInvoice } from '@/hooks/useInvoice';
import { RequirementAdvanceStatusResponse } from '@/services/invoice';
import { toast } from 'sonner';
import dayjs from 'dayjs';

interface RaiseFinalInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    requirementId: number;
    requirementTitle: string;
    advanceStatus: RequirementAdvanceStatusResponse;
    receiverCompanyId: number;
    senderCompanyId: number;
}

export const RaiseFinalInvoiceModal: React.FC<RaiseFinalInvoiceModalProps> = ({
    isOpen,
    onClose,
    requirementId,
    requirementTitle,
    advanceStatus,
    receiverCompanyId,
    senderCompanyId,
}) => {
    const [dueDate, setDueDate] = useState<string>(dayjs().add(14, 'day').format('YYYY-MM-DD'));
    const [paymentDetails, setPaymentDetails] = useState<string>('');
    const [memo, setMemo] = useState<string>('');
    const [applyAdvance, setApplyAdvance] = useState<boolean>(true);

    const { mutateAsync: createFinal, isPending } = useCreateFinalInvoice();

    const { data: taxPreview } = useQuery({
        queryKey: ['tax-preview', receiverCompanyId, senderCompanyId],
        queryFn: () => getTaxPreview(receiverCompanyId, senderCompanyId),
        enabled: !!receiverCompanyId && !!senderCompanyId,
        select: (res) => res.result,
    });

    const quotedPrice = advanceStatus.quoted_price;
    const advanceReceived = applyAdvance ? (advanceStatus.advance_invoice?.amount_received ?? 0) : 0;
    const taxableAmount = Math.max(0, quotedPrice - advanceReceived);
    const taxRate = taxPreview?.totalRate ?? 0;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const finalTotal = taxableAmount + taxAmount;

    const currency = advanceStatus.advance_invoice
        ? (advanceStatus.advance_invoice as { currency?: string }).currency ?? 'INR'
        : 'INR';

    const formatAmount = (amount: number) =>
        `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const isAutoPaid = finalTotal <= 0;

    const handleCreate = async () => {
        if (!dueDate) {
            toast.error('Please select a due date');
            return;
        }
        try {
            await createFinal({
                requirementId,
                data: {
                    due_date: dueDate,
                    payment_details: paymentDetails || undefined,
                    memo: memo || undefined,
                    apply_advance: applyAdvance,
                    tax_type: taxPreview?.taxLabel || undefined,
                },
            });
            toast.success('Final invoice created successfully');
            onClose();
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create final invoice');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-[520px] overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-[#0F9D58]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#111111] tracking-tight">Raise Final Invoice</h2>
                            <p className="text-sm text-[#666666]">{requirementTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-[#666666]" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Auto-paid banner */}
                    {isAutoPaid && (
                        <div className="flex items-start gap-3 p-3 bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl">
                            <Info className="w-4 h-4 text-[#0F9D58] mt-0.5 shrink-0" />
                            <p className="text-xs text-[#0F9D58] font-medium">
                                The advance received fully covers the quoted price. This invoice will be created with zero balance due.
                            </p>
                        </div>
                    )}

                    {/* Breakdown Card */}
                    <div className="bg-[#F9FAFB] border border-[#EEEEEE] rounded-xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-3">Invoice Breakdown</p>
                        <div className="flex justify-between text-sm">
                            <span className="text-[#666666]">Quoted Price</span>
                            <span className="font-medium text-[#111111]">{formatAmount(quotedPrice)}</span>
                        </div>
                        {advanceStatus.advance_invoice && (
                            <div className="flex justify-between text-sm">
                                <span className="text-[#666666]">Less Advance Received</span>
                                <span className={`font-medium ${applyAdvance ? 'text-[#0F9D58]' : 'text-[#999999] line-through'}`}>
                                    - {formatAmount(advanceStatus.advance_invoice.amount_received)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm border-t border-[#EEEEEE] pt-2">
                            <span className="text-[#666666]">Taxable Amount</span>
                            <span className="font-medium text-[#111111]">{formatAmount(taxableAmount)}</span>
                        </div>
                        {taxRate > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-[#666666]">{taxPreview?.taxLabel || 'Tax'} ({taxRate}%)</span>
                                <span className="font-medium text-[#111111]">{formatAmount(taxAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-[#EEEEEE] pt-2">
                            <span className="text-sm font-bold text-[#111111]">Final Total</span>
                            <span className="text-sm font-bold text-[#111111]">{formatAmount(finalTotal)}</span>
                        </div>
                    </div>

                    {/* Apply Advance Toggle */}
                    {advanceStatus.advance_invoice && advanceStatus.advance_invoice.amount_received > 0 && (
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={applyAdvance}
                                onChange={e => setApplyAdvance(e.target.checked)}
                                className="w-4 h-4 rounded border-[#EEEEEE] text-[#111111] focus:ring-[#111111]"
                            />
                            <span className="text-sm text-[#111111]">
                                Deduct advance received ({formatAmount(advanceStatus.advance_invoice.amount_received)}) from final invoice
                            </span>
                        </label>
                    )}

                    {/* Due Date */}
                    <div>
                        <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Due Date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
                            min={dayjs().format('YYYY-MM-DD')}
                        />
                    </div>

                    {/* Payment Details */}
                    <div>
                        <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Payment Details (Optional)</label>
                        <textarea
                            value={paymentDetails}
                            onChange={e => setPaymentDetails(e.target.value)}
                            placeholder="Bank account details, UPI ID, etc."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] resize-none"
                        />
                    </div>

                    {/* Memo */}
                    <div>
                        <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Memo (Optional)</label>
                        <textarea
                            value={memo}
                            onChange={e => setMemo(e.target.value)}
                            placeholder="Additional notes for the client..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-[#EEEEEE] rounded-lg focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#EEEEEE] bg-gray-50 flex items-center justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="px-5 py-2.5 text-sm font-bold text-[#111111] hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={isPending || !dueDate}
                        className="px-6 py-2.5 text-sm font-bold bg-[#111111] text-white rounded-full hover:bg-black shadow-[0_4px_14px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isPending ? 'Creating...' : 'Create Final Invoice'}
                    </button>
                </div>
            </div>
        </div>
    );
};
